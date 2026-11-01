import { AppError } from "../../classes/appError";
import { VoucherModel } from "./voucher.model";
import OrderModel from "../order/order.model";
import VendorModel from "../vendor/vendor.model";
import UserModel from "../user/user.model";
import { generateVoucherCode } from "../../utils/voucherCodeGenerator";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const QRCode = require("qrcode");

const VOUCHER_EXPIRY_HOURS = 24;

const generateVoucherBarcode = async (code: string): Promise<string> => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(code, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: "M",
    });
    return qrCodeDataUrl;
  } catch (error) {
    throw new AppError(500, "Failed to generate QR code");
  }
};

const createVoucherForOrder = async (order: any) => {
  const code = generateVoucherCode();
  const barcode_url = await generateVoucherBarcode(code);
  const expires_at = new Date(
    Date.now() + VOUCHER_EXPIRY_HOURS * 60 * 60 * 1000,
  );

  const voucher = await VoucherModel.create({
    order: order._id,
    code,
    barcode_url,
    expires_at,
  });

  return voucher;
};

const getUserVouchers = async (userEmail: string) => {
  const user = await UserModel.findOne({ email: userEmail, is_deleted: false });
  if (!user) throw new AppError(404, "User not found");
  console.log("user", user);
  const orders = await OrderModel.find({
    customer: user._id,
    fulfillment_type: "dine_in",
    payment_status: "paid",
  });
  console.log("orders, ", orders);
  const vouchers = await VoucherModel.find({
    order: { $in: orders.map((o: any) => o._id) },
    is_deleted: false,
  })
    .populate({
      path: "order",
      select: "order_id total status createdAt store",
      populate: {
        path: "store",
        model: "Store",
        select: "name",
      },
    })
    .sort({ createdAt: -1 });
  console.log("vouchers, ", vouchers);
  return vouchers.map((v: any) => ({
    ...v.toObject(),
    order: v.order || null,
  }));
};

const getVendorVouchers = async (
  vendorEmail: string,
  query: Record<string, any> = {},
) => {
  const vendor = await VendorModel.findOne({
    email: vendorEmail,
    is_deleted: false,
  });
  if (!vendor) throw new AppError(404, "Vendor not found");

  const orders = await OrderModel.find({
    store: vendor.store,
    fulfillment_type: "dine_in",
    payment_status: "paid",
    status: "received",
    is_deleted: false,
  }).select("_id");

  const orderIds = orders.map((o: any) => o._id);

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const [vouchers, total] = await Promise.all([
    VoucherModel.find({
      order: { $in: orderIds },
      status: "generated",
      expires_at: { $gte: new Date() },
      is_deleted: false,
    })
      .populate({
        path: "order",
        select: "order_id total createdAt",
        populate: {
          path: "customer",
          model: "User",
          select: "name",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    VoucherModel.countDocuments({
      order: { $in: orderIds },
      status: "generated",
      expires_at: { $gte: new Date() },
      is_deleted: false,
    }),
  ]);

  return {
    data: vouchers,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const validateVoucher = async (code: string, vendorEmail?: string) => {
  const voucher = await VoucherModel.findOne({
    code,
    is_deleted: false,
  }).populate({
    path: "order",
    select: "fulfillment_type payment_status status store",
    populate: {
      path: "store",
      model: "Store",
    },
  });

  if (!voucher) throw new AppError(404, "Voucher not found");

  if (voucher.status === "used")
    throw new AppError(400, "Voucher already used");

  if (voucher.expires_at < new Date()) {
    voucher.status = "expired";
    await voucher.save();
    throw new AppError(400, "Voucher expired");
  }

  const order = voucher.order as any;
  if (vendorEmail) {
    const vendor = await VendorModel.findOne({
      email: vendorEmail,
      is_deleted: false,
    });
    if (!vendor || order?.store?._id.toString() !== vendor?.store?.toString()) {
      throw new AppError(403, "This voucher does not belong to your store");
    }
  }

  voucher.status = "used";
  voucher.used_at = new Date();
  await voucher.save();

  order.status = "delivered";
  await order.save();

  return { voucher, order };
};

const getVoucherByOrderId = async (orderId: string) => {
  return await VoucherModel.findOne({ order: orderId, is_deleted: false });
};

const voucherServices = {
  createVoucherForOrder,
  getUserVouchers,
  getVendorVouchers,
  validateVoucher,
  getVoucherByOrderId,
};

export default voucherServices;
