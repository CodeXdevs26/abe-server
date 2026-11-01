import mongoose from "mongoose";
import { AppError } from "../../classes/appError";
import AuthModel from "../auth/auth.model";
import config from "../../config";
import bcrypt from "bcrypt";
import { TRiderSignup } from "./rider.validation";
import RiderModel from "./rider.model";
import QueryBuilder from "../../classes/queryBuilder";
import { TRider, TRiderFiles } from "./rider.interface";
import { sendEmail } from "../../utils/sendEmail";
import generateOTP from "../../utils/generateOTP";
import { deleteFromS3, uploadToS3 } from "../../utils/awss3";
import subscriptionServices from "../subscription/subscription.service";
import { buildStripeConnectStatus } from "../../utils/buildStripeConnectStatus";

const hasValidLocationCoordinates = (locationCoordinates: any) =>
  Array.isArray(locationCoordinates?.coordinates) &&
  locationCoordinates.coordinates.length === 2 &&
  locationCoordinates.coordinates.every(
    (coordinate: unknown) => typeof coordinate === "number",
  );

const signUp = async (payload: TRiderSignup, files: TRiderFiles) => {
  // check if user exists
  const auth = await AuthModel.findOne({ email: payload.email });
  const user = await RiderModel.findOne({ email: payload.email });
  if (auth || user) {
    throw new AppError(400, "Rider already exists with this email");
  }
  if (!files?.image?.[0]) {
    throw new AppError(400, "Rider profile image is required");
  }
  if (!files?.document?.[0]) {
    throw new AppError(400, "Rider driving license document is required");
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
      role: "rider",
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
    const { password, ...riderData } = payload as any;
    if (!hasValidLocationCoordinates(riderData.location_coordinates)) {
      delete riderData.location_coordinates;
    }
    riderData.image = await uploadToS3(files.image[0]);
    riderData.driving_license = await uploadToS3(files.document[0]);

    const newUser = await RiderModel.create([riderData], { session });
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

const getMe = async (currentUserEmail: string) => {
  const rider = await RiderModel.findOne({
    email: currentUserEmail,
    is_blocked: false,
    is_deleted: false,
  });
  if (!rider) return rider;

  const subscription = await subscriptionServices.getRoleSubscriptionSummary(
    currentUserEmail,
    "rider",
  );

  return {
    ...rider.toObject(),
    stripe_connect_status: buildStripeConnectStatus(rider),
    subscription,
  };
};

const getAllRiders = async (query: Record<string, any>) => {
  const searchableFields = ["name", "email", "location", "contact"];
  const riderQuery = new QueryBuilder(
    RiderModel.find({
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

  const meta = await riderQuery.countTotal();
  const result = await riderQuery.queryModel;
  return { data: result, meta };
};

const getSingleRider = async (id: string) => {
  const user = await RiderModel.findOne({
    _id: id,
    is_blocked: false,
    is_deleted: false,
  });
  return user;
};

const updateRider = async (
  id: string,
  payload: Partial<TRider>,
  currentUserEmail: string,
  files: TRiderFiles,
) => {
  const rider = await RiderModel.findOne({
    _id: id,
    is_blocked: false,
    is_deleted: false,
  });

  if (!rider) {
    throw new AppError(404, "User not found");
  }

  if (currentUserEmail && currentUserEmail !== rider.email) {
    throw new AppError(401, "Unauthorized!");
  }

  if (files.image?.length) payload.image = await uploadToS3(files.image[0]);
  if (files.document?.length)
    payload.driving_license = await uploadToS3(files.document[0]);
  if (
    payload.location_coordinates &&
    !hasValidLocationCoordinates(payload.location_coordinates)
  ) {
    delete payload.location_coordinates;
  }
  const result = await RiderModel.findByIdAndUpdate(rider._id, payload, {
    new: true,
  });

  if (result) {
    if (payload.image) {
      await deleteFromS3(rider.image);
    }
    if (payload.driving_license) {
      await deleteFromS3(rider.driving_license);
    }
  }
  return result;
};

const approveRider = async (_id: string) => {
  const rider = await RiderModel.findOne({
    _id,
    is_deleted: false,
    is_blocked: false,
  });
  if (!rider) throw new AppError(404, "User not found");

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await RiderModel.findByIdAndUpdate(
      rider._id,
      { is_approved: true },
      { new: true, session },
    );
    await AuthModel.findOneAndUpdate(
      { email: rider.email },
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

const blockRider = async (_id: string) => {
  const rider = await RiderModel.findOne({
    _id,
    is_deleted: false,
  });

  if (!rider) throw new AppError(404, "User not found");

  if (rider.is_blocked) throw new AppError(400, "User already blocked");

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Update the user record to mark as deleted
    const result = await RiderModel.findByIdAndUpdate(
      rider._id,
      { is_blocked: true },
      { session, new: true },
    );

    // Update related AuthModel record
    await AuthModel.findOneAndUpdate(
      { email: rider.email },
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

const deleteRider = async (_id: string, userEmail: string) => {
  const rider = await RiderModel.findOne({
    _id,
    is_blocked: false,
  });

  if (!rider) throw new AppError(404, "User not found");

  if (rider.is_deleted) throw new AppError(400, "User already deleted");

  if (userEmail && userEmail !== rider.email) {
    throw new AppError(401, "Unauthorized");
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Update the user record to mark as deleted
    const result = await RiderModel.findByIdAndUpdate(
      rider._id,
      { is_deleted: true },
      { session, new: true },
    );

    // Update related AuthModel record
    await AuthModel.findOneAndUpdate(
      { email: rider.email },
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

const riderServices = {
  signUp,
  getAllRiders,
  getSingleRider,
  updateRider,
  approveRider,
  blockRider,
  deleteRider,
  getMe,
};
export default riderServices;
