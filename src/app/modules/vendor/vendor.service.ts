import mongoose from "mongoose";
import { AppError } from "../../classes/appError";
import AuthModel from "../auth/auth.model";
import config from "../../config";
import bcrypt from "bcrypt";
import { TVendorSignUp } from "./vendor.validation";
import VendorModel from "./vendor.model";
import { StoreModel } from "../store/store.model";
import QueryBuilder from "../../classes/queryBuilder";
import BrokerModel from "../broker/broker.model";
import { sendEmail } from "../../utils/sendEmail";
import generateOTP from "../../utils/generateOTP";
import { TVendorFiles } from "./vendor.interface";
import { deleteFromS3, uploadToS3 } from "../../utils/awss3";
import subscriptionServices from "../subscription/subscription.service";
import { buildStripeConnectStatus } from "../../utils/buildStripeConnectStatus";

const VENDOR_SIGNUP_TRANSACTION_RETRIES = 3;

const isRetryableTransactionError = (error: any) => {
  const labels = error?.errorLabels || [];
  const message = error?.message || "";

  return (
    labels.includes("TransientTransactionError") ||
    labels.includes("UnknownTransactionCommitResult") ||
    message.includes("Please retry your operation or multi-document transaction")
  );
};

const signUp = async (
  payload: TVendorSignUp & {
    role: "vendor";
    cover_images: string[];
    store: string;
    tax_document: string;
  },
  files: TVendorFiles,
) => {
  const coordinates = payload?.location?.coordinates;
  if (!coordinates[0]) {
    throw new AppError(400, "Invalid location");
  }

  const location = {
    type: "Point",
    coordinates,
  };

  payload.location = location;
  const auth = await AuthModel.findOne({ email: payload.email });
  const vendor = await VendorModel.findOne({ email: payload.email });
  if (auth || vendor) {
    throw new AppError(400, "Vendor already exists with this email");
  }

  if (payload.broker_referral) {
    const broker = await BrokerModel.findOne({
      referral_code: payload.broker_referral,
    });
    if (!broker) {
      throw new AppError(400, "Invalid broker referral code");
    }
  }

  const {
    password,
    store_name,
    store_description,
    location: storeLocation,
    cover_images,
    contact,
    ...baseVendorData
  } = payload;

  const hashedPassword = await bcrypt.hash(password, Number(config.salt_rounds));
  const otp = generateOTP();
  const hashedOtp = await bcrypt.hash(otp.toString(), Number(config.salt_rounds));
  const otp_expires = new Date(Date.now() + 7 * 60 * 1000);

  const authData = {
    role: "vendor",
    email: payload.email,
    password: hashedPassword,
    otp: hashedOtp,
    otp_expires,
    otp_attempts: 0,
  };
  payload.password = "";

  const [images, taxDocument] = await Promise.all([
    Promise.all((files.images || []).map((file) => uploadToS3(file))),
    uploadToS3(files.document[0]),
  ]);

  const storeData = {
    name: store_name,
    cover_images: images,
    description: store_description,
    location: storeLocation,
    contact,
  };

  let lastError: any;
  for (let attempt = 1; attempt <= VENDOR_SIGNUP_TRANSACTION_RETRIES; attempt++) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      await AuthModel.create([authData], { session });

      const newStore: any = await StoreModel.create([storeData], { session });
      const vendorData = {
        ...baseVendorData,
        store: newStore[0]?._id,
        tax_document: taxDocument,
      };
      const newVendor = await VendorModel.create([vendorData], { session });

      if (payload.broker_referral) {
        await BrokerModel.findOneAndUpdate(
          { referral_code: payload.broker_referral },
          { $inc: { referral_users: 1 } },
          { session },
        );
      }

      await session.commitTransaction();

      const subject = `Your OTP Code is Here - Discount Me`;
      const replacements = {
        otp,
      };
      const path = "./src/app/emailTemplates/otp.html";
      sendEmail(payload.email, subject, path, replacements);

      return { user: newVendor[0] };
    } catch (error: any) {
      lastError = error;

      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      if (
        attempt < VENDOR_SIGNUP_TRANSACTION_RETRIES &&
        isRetryableTransactionError(error)
      ) {
        continue;
      }

      throw new AppError(500, error.message || "Error creating user");
    } finally {
      session.endSession();
    }
  }

  throw new AppError(500, lastError?.message || "Error creating user");
};

const getMe = async (currentUserEmail: string) => {
  const vendor = await VendorModel.findOne({
    email: currentUserEmail,
    is_blocked: false,
    is_deleted: false,
  }).populate("store", "name cover_images description");
  if (!vendor) return vendor;

  const subscription = await subscriptionServices.getRoleSubscriptionSummary(
    currentUserEmail,
    "vendor",
  );

  return {
    ...vendor.toObject(),
    stripe_connect_status: buildStripeConnectStatus(vendor),
    subscription,
  };
};

const getAllVendors = async (query: Record<string, any>) => {
  const searchableFields = ["name", "email", "location", "contact"];
  const riderQuery = new QueryBuilder(
    VendorModel.find({
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

const getSingleVendor = async (id: string) => {
  const user = await VendorModel.findOne({
    _id: id,
    is_blocked: false,
    is_deleted: false,
  });
  return user;
};

const updateVendor = async (
  id: string,
  payload: Partial<TVendorSignUp> & {
    cover_images: string[];
    images_to_delete: string[];
    images_to_keep: string[];
    tax_document: string;
  },
  currentUserEmail: string,
  files: Partial<TVendorFiles>,
) => {
  const vendor = await VendorModel.findOne({
    _id: id,
    is_blocked: false,
    is_deleted: false,
  });

  if (!vendor) {
    throw new AppError(404, "User not found");
  }

  if (currentUserEmail && currentUserEmail !== vendor.email) {
    throw new AppError(401, "Unauthorized!");
  }

  const store = await StoreModel.findOne({
    _id: vendor.store,
    is_blocked: false,
    is_deleted: false,
  });

  if (!store) {
    throw new AppError(404, "Store not found");
  }

  // Initialize images array for new uploads
  const images = [];
  if (files.images?.length) {
    for (const file of files.images) {
      const imageUrl = await uploadToS3(file);
      images.push(imageUrl);
    }
  }

  // If no new images, keep the existing cover images
  if (images.length > 0) {
    payload.cover_images = images; // Assign new images if present
  } else if (!payload.cover_images || payload.cover_images.length === 0) {
    // If no images are uploaded and no cover_images in the payload, keep the existing ones
    payload.cover_images = store.cover_images || [];
  }

  const {
    store_name,
    store_description,
    location,
    cover_images = [],
    images_to_delete = [],
    images_to_keep = [],
    ...vendorData
  } = payload;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    if (files.document?.length) {
      vendorData.tax_document = await uploadToS3(files.document[0]);
    }

    const updatedVendor = await VendorModel.findByIdAndUpdate(
      vendor._id,
      vendorData,
      { session, new: true },
    );

    const storeCoverImgs = [...images_to_keep, ...cover_images];
    const storeData = {
      name: store_name,
      cover_images: storeCoverImgs,
      description: store_description,
      location,
    };

    const updatedStore = await StoreModel.findByIdAndUpdate(
      store._id,
      storeData,
      { session, new: true },
    );

    if (updatedStore) {
      if (images_to_delete.length) {
        for (const image of images_to_delete) {
          await deleteFromS3(image);
        }
      }
    }

    if (payload.tax_document && vendor.tax_document) {
      await deleteFromS3(vendor.tax_document);
    }

    await session.commitTransaction();
    return { updatedVendor, updatedStore };
  } catch (error: any) {
    await session.abortTransaction();
    console.log("error, ", error);
    throw new AppError(500, error.message || "Error updating vendor");
  } finally {
    session.endSession();
  }
};

const approveVendor = async (_id: string) => {
  const vendor = await VendorModel.findOne({
    _id,
    is_deleted: false,
    is_blocked: false,
  });
  if (!vendor) throw new AppError(404, "User not found");

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await VendorModel.findByIdAndUpdate(
      vendor._id,
      { is_approved: true },
      { new: true, session },
    );
    await AuthModel.findOneAndUpdate(
      { email: vendor.email },
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

const blockVendor = async (_id: string) => {
  const vendor = await VendorModel.findOne({
    _id,
    is_deleted: false,
  });

  if (!vendor) throw new AppError(404, "User not found");

  if (vendor.is_blocked) throw new AppError(400, "User already blocked");

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // delete vendor
    const result = await VendorModel.findByIdAndUpdate(
      vendor._id,
      { is_blocked: true },
      { session, new: true },
    );

    // delete related AuthModel record
    await AuthModel.findOneAndUpdate(
      { email: vendor.email },
      { is_blocked: true },
      { session },
    );

    // delete related store
    await StoreModel.findOneAndUpdate(
      { _id: vendor.store },
      { is_blocked: true },
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

const deleteVendor = async (_id: string, userEmail: string) => {
  const vendor = await VendorModel.findOne({
    _id,
    is_blocked: false,
  });

  if (!vendor) throw new AppError(404, "User not found");

  if (vendor.is_deleted) throw new AppError(400, "User already deleted");

  if (userEmail && userEmail !== vendor.email) {
    throw new AppError(401, "Unauthorized");
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // delete vendor
    const result = await VendorModel.findByIdAndUpdate(
      vendor._id,
      { is_deleted: true },
      { session, new: true },
    );

    // delete related AuthModel record
    await AuthModel.findOneAndUpdate(
      { email: vendor.email },
      { is_deleted: true },
      { session },
    );

    // delete related store
    await StoreModel.findOneAndUpdate(
      { _id: vendor.store },
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

const vendorServices = {
  signUp,
  getAllVendors,
  getSingleVendor,
  updateVendor,
  blockVendor,
  approveVendor,
  deleteVendor,
  getMe,
};
export default vendorServices;
