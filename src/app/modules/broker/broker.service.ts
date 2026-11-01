import mongoose from "mongoose";
import { AppError } from "../../classes/appError";
import AuthModel from "../auth/auth.model";
import config from "../../config";
import bcrypt from "bcrypt";
import { TBrokerSignup } from "./broker.validation";
import BrokerModel from "./broker.model";
import { generateReferralCode } from "../../utils/referralCodeGenerator";
import QueryBuilder from "../../classes/queryBuilder";
import { TBroker } from "./broker.interface";
import generateOTP from "../../utils/generateOTP";
import { sendEmail } from "../../utils/sendEmail";
import { TFile } from "../../interface/file.interface";
import { deleteFromS3, uploadToS3 } from "../../utils/awss3";
import subscriptionServices from "../subscription/subscription.service";
import { buildStripeConnectStatus } from "../../utils/buildStripeConnectStatus";

const signUp = async (
  payload: TBrokerSignup & {
    role: "broker";
    referral_code: string;
    image: string;
  },
  file: TFile,
) => {
  // check if user exists
  const auth = await AuthModel.findOne({ email: payload.email });
  const user = await BrokerModel.findOne({ email: payload.email });
  if (auth || user) {
    throw new AppError(400, "Broker already exists with this email");
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const { password, ...brokerData } = payload;

    // Create auth data
    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.salt_rounds),
    );

    // generate OTP and send email
    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(
      otp.toString(),
      Number(config.salt_rounds),
    );

    const otp_expires = new Date(Date.now() + 7 * 60 * 1000);
    const subject = `Your OTP Code is Here - Discount Me`;

    const authData = {
      role: "broker",
      email: payload.email,
      password: hashedPassword,
      otp: hashedOtp,
      otp_expires,
      otp_attempts: 0,
    };

    await AuthModel.create([authData], { session });

    const referralCode = generateReferralCode(payload.name);
    brokerData.referral_code = referralCode;
    brokerData.image = await uploadToS3(file);
    const newBroker = await BrokerModel.create([brokerData], { session });

    if (newBroker) {
      const replacements = {
        otp,
      };
      const path = "./src/app/emailTemplates/otp.html";
      sendEmail(payload.email, subject, path, replacements);
    }

    await session.commitTransaction();
    return { user: newBroker[0] };
  } catch (error: any) {
    await session.abortTransaction();
    throw new AppError(500, error.message || "Error creating user");
  } finally {
    session.endSession();
  }
};

const getMe = async (currentUserEmail: string) => {
  const broker = await BrokerModel.findOne({
    email: currentUserEmail,
    is_blocked: false,
    is_deleted: false,
  });
  if (!broker) return broker;

  const subscription = await subscriptionServices.getRoleSubscriptionSummary(
    currentUserEmail,
    "broker",
  );

  return {
    ...broker.toObject(),
    stripe_connect_status: buildStripeConnectStatus(broker),
    subscription,
  };
};

const getAllBrokers = async (query: Record<string, any>) => {
  const searchableFields = ["name", "email", "location", "contact"];
  const brokerQuery = new QueryBuilder(
    BrokerModel.find({
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

  const meta = await brokerQuery.countTotal();
  const result = await brokerQuery.queryModel;
  return { data: result, meta };
  // return await UserModel.find({ is_blocked: false, is_deleted: false });
};

const getSingleBroker = async (id: string) => {
  const user = await BrokerModel.findOne({
    _id: id,
    is_blocked: false,
    is_deleted: false,
  });
  return user;
};

const updateBroker = async (
  id: string,
  payload: Partial<TBroker>,
  currentUserEmail: string,
  file?: TFile,
) => {
  const broker = await BrokerModel.findOne({
    _id: id,
    is_blocked: false,
    is_deleted: false,
  });

  if (!broker) {
    throw new AppError(404, "User not found");
  }

  if (currentUserEmail && currentUserEmail !== broker.email) {
    throw new AppError(401, "Unauthorized!");
  }

  if (file) payload.image = await uploadToS3(file);
  const result = await BrokerModel.findByIdAndUpdate(broker._id, payload, {
    new: true,
  });

  if (result && payload.image && broker.image) await deleteFromS3(broker.image);

  return result;
};

const approveBroker = async (_id: string) => {
  const broker = await BrokerModel.findOne({
    _id,
    is_deleted: false,
    is_blocked: false,
  });
  if (!broker) throw new AppError(404, "User not found");

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await BrokerModel.findByIdAndUpdate(
      broker._id,
      { is_approved: true },
      { new: true, session },
    );
    await AuthModel.findOneAndUpdate(
      { email: broker.email },
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

const blockBroker = async (_id: string) => {
  const broker = await BrokerModel.findOne({
    _id,
    is_deleted: false,
  });

  if (!broker) throw new AppError(404, "User not found");

  if (broker.is_blocked) throw new AppError(400, "User already blocked");

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Update the user record to mark as deleted
    const result = await BrokerModel.findByIdAndUpdate(
      broker._id,
      { is_blocked: true },
      { session, new: true },
    );

    // Update related AuthModel record
    await AuthModel.findOneAndUpdate(
      { email: broker.email },
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

const deleteBroker = async (_id: string, userEmail: string) => {
  const broker = await BrokerModel.findOne({
    _id,
    is_blocked: false,
  });

  if (!broker) throw new AppError(404, "User not found");

  if (broker.is_deleted) throw new AppError(400, "User already deleted");

  if (userEmail && userEmail !== broker.email) {
    throw new AppError(401, "Unauthorized");
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Update the user record to mark as deleted
    const result = await BrokerModel.findByIdAndUpdate(
      broker._id,
      { is_deleted: true },
      { session, new: true },
    );

    // Update related AuthModel record
    await AuthModel.findOneAndUpdate(
      { email: broker.email },
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

const brokerServices = {
  signUp,
  getAllBrokers,
  getSingleBroker,
  updateBroker,
  approveBroker,
  blockBroker,
  deleteBroker,
  getMe,
};
export default brokerServices;
