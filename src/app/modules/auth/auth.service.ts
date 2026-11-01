import { AppError } from "../../classes/appError";
import AuthModel from "./auth.model";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcrypt";
import jsonwebtoken, { JwtPayload } from "jsonwebtoken";
import config from "../../config";
import generateOTP from "../../utils/generateOTP";
import { sendEmail } from "../../utils/sendEmail";
import isUserExist from "../../utils/isUserExist";
import subscriptionServices from "../subscription/subscription.service";
import mongoose from "mongoose";
import RiderModel from "../rider/rider.model";
import VendorModel from "../vendor/vendor.model";
import UserModel from "../user/user.model";
import BrokerModel from "../broker/broker.model";
import QueryBuilder from "../../classes/queryBuilder";
import { buildStripeConnectStatus } from "../../utils/buildStripeConnectStatus";

const payoutReadyRoles = ["vendor", "rider", "broker"] as const;

const getLoginPayoutReadyStatus = async (
  role: (typeof payoutReadyRoles)[number],
  email: string,
) => {
  if (role === "vendor") {
    const vendor = await VendorModel.findOne({ email }).select(
      "stripe_connect_account_id stripe_connect_onboarding_completed stripe_connect_charges_enabled stripe_connect_payouts_enabled",
    );

    return vendor ? buildStripeConnectStatus(vendor).is_payout_ready : false;
  }

  if (role === "rider") {
    const rider = await RiderModel.findOne({ email }).select(
      "stripe_connect_account_id stripe_connect_onboarding_completed stripe_connect_charges_enabled stripe_connect_payouts_enabled",
    );

    return rider ? buildStripeConnectStatus(rider).is_payout_ready : false;
  }

  if (role === "broker") {
    const broker = await BrokerModel.findOne({ email }).select(
      "stripe_connect_account_id stripe_connect_onboarding_completed stripe_connect_charges_enabled stripe_connect_payouts_enabled",
    );

    return broker ? buildStripeConnectStatus(broker).is_payout_ready : false;
  }

  return false;
};

const loginUser = async (payload: { email: string; password: string }) => {
  const user = await isUserExist(payload.email);

  if (!user.is_email_verified)
    throw new AppError(400, "Please, verify your account before logging in!");

  // Compare the password
  const isPasswordMatch = await bcrypt.compare(payload.password, user.password);
  if (!isPasswordMatch) {
    throw new AppError(401, "Incorrect password", "password");
  }

  if (user.role !== "admin" && !user.is_approved) {
    throw new AppError(403, "Your account is pending admin approval");
  }

  // generate token
  const jwtPayload = {
    email: user.email,
    role: user.role,
    id: user._id,
  };

  const accessToken = jsonwebtoken.sign(
    jwtPayload,
    config.jwt_access_secret as string,
    {
      expiresIn: config.jwt_access_expiration,
    },
  );

  const refreshToken = jsonwebtoken.sign(
    jwtPayload,
    config.jwt_refresh_secret as string,
    {
      expiresIn: config.jwt_refresh_expiration,
    },
  );

  let subscription = null;
  if (
    user.role === "broker" ||
    user.role === "rider" ||
    user.role === "vendor"
  ) {
    subscription = await subscriptionServices.getRoleSubscriptionSummary(
      user.email,
      user.role,
    );
  }

  let hasFreeTrial = false;
  if (user.free_trial_end_date) {
    hasFreeTrial = new Date(user.free_trial_end_date) > new Date();
  }

  const response: {
    accessToken: string;
    refreshToken: string;
    subscription: Awaited<
      ReturnType<typeof subscriptionServices.getRoleSubscriptionSummary>
    > | null;
    hasFreeTrial: boolean;
    is_payout_ready?: boolean;
  } = {
    accessToken,
    refreshToken,
    subscription,
    hasFreeTrial,
  };

  if (payoutReadyRoles.includes(user.role as any)) {
    response.is_payout_ready = await getLoginPayoutReadyStatus(
      user.role as (typeof payoutReadyRoles)[number],
      user.email,
    );
  }

  return response;
};

const sendOtp = async (payload: { email: string }) => {
  const user = await isUserExist(payload.email);

  // generate OTP and send email
  const otp = generateOTP();
  const hashedOtp = await bcrypt.hash(
    otp.toString(),
    Number(config.salt_rounds),
  );
  const otp_expires = new Date(Date.now() + 7 * 60 * 1000);
  const subject = `Your OTP Code is Here - Discount Me`;
  const replacements = {
    otp,
  };
  const path = "./src/app/emailTemplates/otp.html";
  sendEmail(payload.email, subject, path, replacements);

  await AuthModel.findByIdAndUpdate(
    user._id,
    { otp: hashedOtp, otp_expires, otp_attempts: 0 },
    { new: true },
  );
};

const verifyOtp = async (payload: {
  email: string;
  otp: string;
  verify_account?: boolean;
}) => {
  const user = await isUserExist(payload.email);

  // check OTP attempts
  if (user.otp_attempts! > 3) {
    throw new AppError(StatusCodes.BAD_REQUEST, "OTP attempts exceeded", "otp");
  }

  user.otp_attempts = user.otp_attempts ? user.otp_attempts! + 1 : 1;
  user.save();

  if (!user.otp) {
    throw new AppError(StatusCodes.BAD_REQUEST, "OTP not found", "otp");
  }

  // verify OTP
  const isOtpMatch = await bcrypt.compare(payload.otp, user.otp as string);
  if (!isOtpMatch) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Invalid OTP", "otp");
  }

  if (user.otp_expires! < new Date()) {
    throw new AppError(StatusCodes.BAD_REQUEST, "OTP has expired", "otp");
  }

  if (payload.verify_account) {
    const subject = `Your Account Has Been Successfully Verified - Discount Me`;
    const path = "./src/app/emailTemplates/congrats.html";

    sendEmail(payload.email, subject, path, {});
    await AuthModel.findByIdAndUpdate(user._id, {
      is_email_verified: true,
      $unset: { otp: "", otp_expires: "", otp_attempts: "" },
    });

    const jwtPayload = {
      email: user.email,
      role: user.role,
      id: user._id,
    };

    const accessToken = jsonwebtoken.sign(
      jwtPayload,
      config.jwt_access_secret as string,
      {
        expiresIn: config.jwt_access_expiration,
      },
    );

    return { accessToken };
  }
  await AuthModel.findByIdAndUpdate(user._id, {
    is_otp_verified: true,
    $unset: { otp: "", otp_expires: "", otp_attempts: "" },
  });
};

const resetForgottenPassword = async (payload: {
  email: string;
  password: string;
}) => {
  const user = await isUserExist(payload.email);

  if (!user.is_otp_verified) {
    throw new AppError(StatusCodes.BAD_REQUEST, "OTP not verified", "otp");
  }

  const subject = `Password Reset Confirmation - Discount Me`;

  const path = "./src/app/emailTemplates/resetConfirmation.html";
  sendEmail(payload.email, subject, path, {});

  // hash the password and save the document
  const hashedPassword = await bcrypt.hash(
    payload.password,
    Number(config.salt_rounds),
  );
  await AuthModel.findByIdAndUpdate(user._id, {
    password: hashedPassword,
    $unset: { is_otp_verified: "" },
  });

  // generate token
  const jwtPayload = {
    email: user.email,
    role: user.role,
    id: user._id,
  };

  const token = jsonwebtoken.sign(
    jwtPayload,
    config.jwt_access_secret as string,
    {
      expiresIn: config.jwt_access_expiration,
    },
  );
  return { token };
};

const createNewPassword = async (payload: {
  email: string;
  oldPassword: string;
  newPassword: string;
}) => {
  const user = await isUserExist(payload.email);

  // Compare the password
  const isPasswordMatch = await bcrypt.compare(
    payload.oldPassword,
    user.password,
  );
  if (!isPasswordMatch) {
    throw new AppError(
      StatusCodes.UNAUTHORIZED,
      "Incorrect old password",
      "password",
    );
  }

  // hash the new password and save the document
  const hashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.salt_rounds),
  );
  await AuthModel.findByIdAndUpdate(user._id, { password: hashedPassword });

  // generate token
  const jwtPayload = {
    email: user.email,
    role: user.role,
    id: user._id,
  };

  const token = jsonwebtoken.sign(
    jwtPayload,
    config.jwt_access_secret as string,
    {
      expiresIn: config.jwt_access_expiration,
    },
  );
  return { token };
};

const getNewAccessToken = async (token: string) => {
  // verify token
  const decoded = jsonwebtoken.verify(
    token,
    config.jwt_refresh_secret as string,
  ) as JwtPayload;
  const user = await AuthModel.findOne({
    email: decoded.email,
    is_deleted: false,
    is_blocked: false,
  });

  if (!user) {
    throw new AppError(404, "User not found!");
  }

  // generate token
  const jwtPayload = {
    email: user.email,
    role: user.role,
    id: user._id,
  };
  const accessToken = jsonwebtoken.sign(
    jwtPayload,
    config.jwt_access_secret as string,
    { expiresIn: config.jwt_access_expiration },
  );
  return { accessToken };
};

const changeUserStatus = async (email: string) => {
  const auth = await AuthModel.findOne({ email, is_deleted: false });

  if (!auth) throw new AppError(404, "User not found!");
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await AuthModel.findByIdAndUpdate(
      auth._id,
      { is_blocked: !auth.is_blocked },
      { session, new: true },
    );
    if (auth.role === "user") {
      await UserModel.findOneAndUpdate(
        { email },
        { is_blocked: !auth.is_blocked },
        { session },
      );
    } else if (auth.role === "vendor") {
      await VendorModel.findOneAndUpdate(
        { email },
        { is_blocked: !auth.is_blocked },
        { session },
      );
    } else if (auth.role === "rider") {
      await RiderModel.findOneAndUpdate(
        { email },
        { is_blocked: !auth.is_blocked },
        { session },
      );
    } else if (auth.role === "broker") {
      await BrokerModel.findOneAndUpdate(
        { email },
        { is_blocked: !auth.is_blocked },
        { session },
      );
    }
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

const getAllUsers = async (query: Record<string, any>) => {
  const { role, ...restQuery } = query;
  const searchableFields = ["name", "email", "location", "contact"];

  const userModels: { [key: string]: any } = {
    user: UserModel,
    vendor: VendorModel,
    rider: RiderModel,
    broker: BrokerModel,
  };

  const modelsToQuery = role ? [role] : ["user", "vendor", "rider", "broker"];
  const results: any[] = [];

  for (const modelName of modelsToQuery) {
    const Model = userModels[modelName];
    if (!Model) continue;

    const userQuery = new QueryBuilder(
      Model.find({
        is_deleted: false,
      }),
      restQuery,
    )
      .search(searchableFields)
      .filter()
      .sort()
      .paginate()
      .selectFields();

    const result = await userQuery.queryModel;
    const emails = result.map((user: any) => user.email);
    const authRecords = await AuthModel.find({
      email: { $in: emails },
      is_deleted: false,
    })
      .select("_id email role is_approved is_email_verified is_blocked")
      .lean();
    const authMap = new Map(authRecords.map((auth: any) => [auth.email, auth]));
    const usersWithRole = result.map((user: any) => ({
      ...user.toObject(),
      role: modelName,
      auth_id: authMap.get(user.email)?._id || null,
      is_approved:
        authMap.get(user.email)?.is_approved ?? user.is_approved ?? false,
      is_email_verified: authMap.get(user.email)?.is_email_verified ?? false,
      auth_is_blocked: authMap.get(user.email)?.is_blocked ?? false,
      document: user.document ?? null,
      first_responder_type: user.first_responder_type ?? null,
      first_responder_status: user.first_responder_status ?? null,
    }));
    results.push(...usersWithRole);
  }

  const meta = { total: results.length };
  return { data: results, meta };
};

const getSingleUserByAuthId = async (id: string) => {
  console.log("id", id);
  const auth = await AuthModel.findOne({
    _id: id,
    is_deleted: false,
  })
    .select(
      "_id email role is_approved is_email_verified is_blocked is_deleted createdAt updatedAt",
    )
    .lean();

  if (!auth) {
    throw new AppError(404, "Account not found");
  }

  const profileQuery = {
    email: auth.email,
    is_deleted: false,
  };

  let profile: any = null;

  if (auth.role === "user") {
    profile = await UserModel.findOne(profileQuery)
      .select(
        "_id name image contact location document first_responder_type first_responder_status createdAt updatedAt",
      )
      .lean();
  } else if (auth.role === "rider") {
    profile = await RiderModel.findOne(profileQuery)
      .select(
        "_id name image contact location driving_license createdAt updatedAt",
      )
      .lean();
  } else if (auth.role === "broker") {
    profile = await BrokerModel.findOne(profileQuery)
      .select(
        "_id name image contact location referral_code createdAt updatedAt",
      )
      .lean();
  } else if (auth.role === "vendor") {
    profile = await VendorModel.findOne(profileQuery)
      .select("_id contact tax_document createdAt updatedAt")
      .lean();
  }

  const authRecord: any = auth;

  return {
    auth_id: authRecord._id,
    profile_id: profile?._id || null,
    role: authRecord.role,
    email: authRecord.email,
    name: profile?.name || null,
    image: profile?.image || null,
    contact: profile?.contact || null,
    location: profile?.location || null,
    is_approved: authRecord.is_approved,
    is_email_verified: authRecord.is_email_verified,
    auth_is_blocked: authRecord.is_blocked,
    is_deleted: authRecord.is_deleted,
    createdAt: profile?.createdAt || authRecord.createdAt,
    updatedAt: profile?.updatedAt || authRecord.updatedAt,
    role_specific_data:
      authRecord.role === "user"
        ? {
            document: profile?.document || null,
            first_responder_type: profile?.first_responder_type || null,
            first_responder_status: profile?.first_responder_status || null,
          }
        : authRecord.role === "rider"
          ? {
              driving_license: profile?.driving_license || null,
            }
          : authRecord.role === "vendor"
            ? {
                tax_document: profile?.tax_document || null,
              }
            : authRecord.role === "broker"
              ? {
                  referral_code: profile?.referral_code || null,
                }
              : {},
  };
};

const updateApprovalStatus = async (
  id: string,
  status: "approved" | "rejected",
) => {
  console.log("id", id);
  const auth = await AuthModel.findOne({
    _id: id,
    is_deleted: false,
    is_blocked: false,
  });
  if (!auth) throw new AppError(404, "Account not found");

  const isApproved = status === "approved";
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const updatedAuth = await AuthModel.findByIdAndUpdate(
      auth._id,
      { is_approved: isApproved },
      { session, new: true },
    );

    if (auth.role === "user") {
      const user = await UserModel.findOne({ email: auth.email }).session(
        session,
      );
      if (user) {
        await UserModel.findByIdAndUpdate(
          user._id,
          {
            is_approved: isApproved,
            ...(user.first_responder_type
              ? {
                  first_responder_status: isApproved ? "approved" : "rejected",
                }
              : {}),
          },
          { session },
        );
      }
    } else if (auth.role === "vendor") {
      await VendorModel.findOneAndUpdate(
        { email: auth.email },
        { is_approved: isApproved },
        { session },
      );
    } else if (auth.role === "rider") {
      await RiderModel.findOneAndUpdate(
        { email: auth.email },
        { is_approved: isApproved },
        { session },
      );
    } else if (auth.role === "broker") {
      await BrokerModel.findOneAndUpdate(
        { email: auth.email },
        { is_approved: isApproved },
        { session },
      );
    }

    await session.commitTransaction();
    return updatedAuth;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

const giveFreeTrial = async (email: string) => {
  const user = await isUserExist(email);
  if (user.free_trial_end_date) {
    throw new AppError(400, "User already has a free trial");
  }
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const free_trial_end_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const result = await AuthModel.findByIdAndUpdate(
      user._id,
      { free_trial_end_date },
      { session, new: true },
    );
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

const AuthServices = {
  loginUser,
  sendOtp,
  verifyOtp,
  resetForgottenPassword,
  createNewPassword,
  getNewAccessToken,
  changeUserStatus,
  getAllUsers,
  getSingleUserByAuthId,
  giveFreeTrial,
  updateApprovalStatus,
};

export default AuthServices;
