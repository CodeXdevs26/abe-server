import mongoose from "mongoose";
import UserModel from "./user.model";
import { AppError } from "../../classes/appError";
import AuthModel from "../auth/auth.model";
import config from "../../config";
import bcrypt from "bcrypt";
import QueryBuilder from "../../classes/queryBuilder";
import { TUserSignUp } from "./user.validation";
import { TUser, TUserFiles } from "./user.interface";
import generateOTP from "../../utils/generateOTP";
import { sendEmail } from "../../utils/sendEmail";
import { deleteFromS3, uploadToS3 } from "../../utils/awss3";
import firstResponderDiscountServices from "../first-responder-discount/first-responder-discount.service";

const signUp = async (payload: TUserSignUp, files: TUserFiles) => {
  // check if user exists
  const auth = await AuthModel.findOne({ email: payload.email });
  const user = await UserModel.findOne({ email: payload.email });
  if (auth || user) {
    throw new AppError(400, "User already exists");
  }
  if (payload.first_responder_type && !files?.document?.[0]) {
    throw new AppError(
      400,
      "A verification document is required when applying as a first responder",
    );
  }
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    // Create auth data
    const hashedPassword = await bcrypt.hash(
      payload.password,
      Number(config.salt_rounds),
    );

    // generate OTP and send email
    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(
      otp.toString(),
      Number(config.salt_rounds),
    );
    const otp_expires = new Date(Date.now() + 7 * 60 * 1000);

    const authData = {
      role: "user",
      email: payload.email,
      password: hashedPassword,
      otp: hashedOtp,
      otp_expires,
      otp_attempts: 0,
    };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete payload.password;

    await AuthModel.create([authData], { session });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userData } = payload as any;
    if (files?.image?.[0]) {
      userData.image = await uploadToS3(files.image[0]);
    }
    if (files?.document?.[0]) {
      userData.document = await uploadToS3(files.document[0]);
    }
    userData.first_responder_status = payload.first_responder_type
      ? "pending"
      : "not_requested";
    const newUser = await UserModel.create([userData], { session });

    if (newUser) {
      const subject = `Your OTP Code is Here - Discount Me`;

      const replacements = {
        otp,
      };
      const path = "./src/app/emailTemplates/otp.html";
      sendEmail(payload.email, subject, path, replacements);
    }

    await session.commitTransaction();
    return { user: newUser[0] };
  } catch (error: any) {
    await session.abortTransaction();
    throw new AppError(500, error.message || "Error creating user");
  } finally {
    session.endSession();
  }
};

const getAllUsers = async (query: Record<string, any>) => {
  const searchableFields = ["name", "email", "location", "contact"];
  const userQuery = new QueryBuilder(
    UserModel.find({
      is_deleted: false,
      is_blocked: false,
    }),
    query,
  )
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .selectFields();

  const meta = await userQuery.countTotal();
  const result = await userQuery.queryModel;
  return { data: result, meta };
};

const getMe = async (currentUserEmail: string) => {
  const user = await UserModel.findOne({
    email: currentUserEmail,
    is_blocked: false,
    is_deleted: false,
  }).lean();

  if (user) {
    const now = new Date();
    const validPoints = user.rewardPoints?.filter(p => new Date(p.expiresAt) > now && p.remainingPoints > 0) || [];
    const totalValidPoints = validPoints.reduce((sum, p) => sum + p.remainingPoints, 0);
    (user as any).totalRewardPoints = totalValidPoints;
    (user as any).firstResponderDiscountPercentage =
      await firstResponderDiscountServices.getFirstResponderDiscountPercentage(
        user,
      );
  }

  return user;
};

const getSingleUser = async (id: string) => {
  const user = await UserModel.findOne({
    _id: id,
    is_blocked: false,
    is_deleted: false,
  }).lean();

  if (user) {
    const now = new Date();
    const validPoints = user.rewardPoints?.filter(p => new Date(p.expiresAt) > now && p.remainingPoints > 0) || [];
    const totalValidPoints = validPoints.reduce((sum, p) => sum + p.remainingPoints, 0);
    (user as any).totalRewardPoints = totalValidPoints;
    (user as any).firstResponderDiscountPercentage =
      await firstResponderDiscountServices.getFirstResponderDiscountPercentage(
        user,
      );
  }

  return user;
};

const updateUser = async (
  payload: Partial<TUser>,
  currentUserEmail: string,
  files: TUserFiles,
) => {
  const user = await UserModel.findOne({
    email: currentUserEmail,
    is_blocked: false,
    is_deleted: false,
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (currentUserEmail && currentUserEmail !== user.email) {
    throw new AppError(401, "Unauthorized!");
  }
  if (payload.first_responder_type && !files.document?.[0] && !user.document) {
    throw new AppError(
      400,
      "A verification document is required when applying as a first responder",
    );
  }

  if (files.image) payload.image = await uploadToS3(files.image[0]);
  if (files.document) payload.document = await uploadToS3(files.document[0]);

  if (
    payload.first_responder_type !== undefined ||
    files.document?.[0]
  ) {
    payload.first_responder_status = payload.first_responder_type
      ? "pending"
      : "not_requested";
  }

  const result = await UserModel.findByIdAndUpdate(user._id, payload, {
    new: true,
  });

  if (result) {
    if (payload.image && result) await deleteFromS3(user.image);
    if (payload.document && user?.document?.includes("amazon"))
      await deleteFromS3(user.document);
  }
  return result;
};

const approveUser = async (_id: string) => {
  const user = await UserModel.findOne({
    _id,
    is_deleted: false,
    is_blocked: false,
  });
  if (!user) throw new AppError(404, "User not found");

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await UserModel.findByIdAndUpdate(
      user._id,
      {
        is_approved: true,
        first_responder_status: user.first_responder_type
          ? "approved"
          : user.first_responder_status || "not_requested",
      },
      { new: true, session },
    );
    await AuthModel.findOneAndUpdate(
      { email: user.email },
      { is_approved: true },
      { session },
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

const blockUser = async (_id: string) => {
  const user = await UserModel.findOne({
    _id,
    is_deleted: false,
  });

  if (!user) throw new AppError(404, "User not found");

  if (user.is_blocked) throw new AppError(400, "User already blocked");

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Update the user record to mark as deleted
    const result = await UserModel.findByIdAndUpdate(
      user._id,
      { is_blocked: true },
      { session, new: true },
    );

    // Update related AuthModel record
    await AuthModel.findOneAndUpdate(
      { email: user.email },
      { is_blocked: true },
      { session },
    );

    await session.commitTransaction();
    return result;
  } catch (error: any) {
    await session.abortTransaction();
    const errorMessage = error?.message || "Error blocking user";
    throw new AppError(500, errorMessage);
  } finally {
    session.endSession();
  }
};

const deleteUser = async (_id: string, userEmail: string) => {
  const user = await UserModel.findOne({
    _id,
    is_blocked: false,
  });

  if (!user) throw new AppError(404, "User not found");

  if (user.is_deleted) throw new AppError(400, "User already deleted");

  if (userEmail && userEmail !== user.email) {
    throw new AppError(401, "Unauthorized");
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Update the user record to mark as deleted
    const result = await UserModel.findByIdAndUpdate(
      user._id,
      { is_deleted: true },
      { session, new: true },
    );

    // Update related AuthModel record
    await AuthModel.findOneAndUpdate(
      { email: user.email },
      { is_deleted: true },
      { session },
    );

    await session.commitTransaction();
    return result;
  } catch (error: any) {
    await session.abortTransaction();
    const errorMessage = error?.message || "Error deleting user";
    throw new AppError(500, errorMessage);
  } finally {
    session.endSession();
  }
};

const userServices = {
  signUp,
  getAllUsers,
  getSingleUser,
  updateUser,
  blockUser,
  approveUser,
  deleteUser,
  getMe,
};
export default userServices;
