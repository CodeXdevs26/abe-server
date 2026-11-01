import Stripe from "stripe";
import { AppError } from "../../classes/appError";
import config from "../../config";
import OrderModel from "../order/order.model";
import RiderModel from "../rider/rider.model";
import { buildDeliveryLocation } from "../../utils/buildDeliveryLocation";
import { TPickupRequest } from "./pickup-request.interface";
import PickupRequestModel from "./pickup-request.model";
import { StoreModel } from "../store/store.model";
import settlementServices from "../settlement/settlement.service";
import { TFile } from "../../interface/file.interface";
import { uploadToS3 } from "../../utils/awss3";
import VendorModel from "../vendor/vendor.model";
import { chatServices } from "../chat/chat.service";

const stripe = new Stripe(config.stripe_secret_key as string, {
  apiVersion: "2025-01-27.acacia",
});

const MAX_DISTANCE_KM = 10;
const PICKUP_REQUEST_STATUSES = [
  "requesting",
  "ongoing",
  "delivered",
  "canceled",
] as const;

const getSyncedOrderStatus = (status: string) => {
  if (status === "ongoing" || status === "delivered") {
    return status;
  }

  if (status === "requesting") {
    return "received";
  }

  return null;
};

const createPickupRequest = async (payload: TPickupRequest) => {
  const order = await OrderModel.findOne({ _id: payload.order })
    .populate(
      "shipping_address",
      "country state city zip_code street_address house_no address location_coordinates",
    )
    .populate(
      "billing_address",
      "country state city zip_code street_address house_no address",
    );
  if (!order) throw new AppError(404, "Invalid order id!");

  // Only delivery orders need pickup requests
  if (order.fulfillment_type !== "delivery") {
    throw new AppError(400, "Pickup requests are only for delivery orders");
  }

  if (order.status !== "received")
    throw new AppError(400, `The order is already ${order.status}`);
  if (!order.shipping_address)
    throw new AppError(400, "Shipping address is required for delivery orders");

  const shippingAddr: any =
    order.shipping_address || order.billing_address || {};
  const delivery_location = buildDeliveryLocation(shippingAddr);
  if (!delivery_location) {
    throw new AppError(400, "A valid shipping address is required");
  }
  const delivery_coordinates =
    typeof shippingAddr?.location_coordinates?.latitude === "number" &&
    typeof shippingAddr?.location_coordinates?.longitude === "number"
      ? {
          latitude: shippingAddr.location_coordinates.latitude,
          longitude: shippingAddr.location_coordinates.longitude,
        }
      : null;
  if (!delivery_coordinates) {
    throw new AppError(
      400,
      "Shipping address coordinates are required for delivery orders",
    );
  }

  const pickupRequest = await PickupRequestModel.findOne({
    order: payload.order,
  });
  if (pickupRequest)
    throw new AppError(400, `The order is already ${pickupRequest.status}`);
  payload.delivery_location = delivery_location;
  payload.delivery_coordinates = delivery_coordinates;
  const result = await PickupRequestModel.create(payload);
  return result;
};

const getAllPickupRequests = async (
  currentUserEmail: string,
  query: Record<string, any>,
) => {
  const rider = await RiderModel.findOne({
    email: currentUserEmail,
    is_deleted: false,
    is_blocked: false,
  });
  if (!rider) throw new AppError(404, "Rider account not found");

  // Get coordinates from query params (lng, lat)
  const lng = query.lng ? parseFloat(query.lng) : null;
  const lat = query.lat ? parseFloat(query.lat) : null;

  // Build store query based on provided coordinates
  let storeIds: any[] = [];
  if (lng !== null && lat !== null) {
    const nearbyStores = await StoreModel.find({
      location: {
        $near: {
          $geometry: {
            type: "Point" as const,
            coordinates: [lng, lat],
          },
          $maxDistance: MAX_DISTANCE_KM * 1000,
        },
      },
    }).select("_id");
    storeIds = nearbyStores.map((s: any) => s._id);
  }

  const statusQuery = Array.isArray(query.status)
    ? query.status
    : typeof query.status === "string"
      ? query.status.split(",")
      : [];

  const statuses = statusQuery
    .map((status) => String(status).trim())
    .filter((status): status is (typeof PICKUP_REQUEST_STATUSES)[number] =>
      PICKUP_REQUEST_STATUSES.includes(
        status as (typeof PICKUP_REQUEST_STATUSES)[number],
      ),
    );

  const pickupRequestFilter: Record<string, any> = {
    // rejections: { $nin: [rider._id] },
  };

  if (statuses.length > 0) {
    pickupRequestFilter.status = { $in: statuses };
  }

  // Get pickup requests with orders populated
  const pickupRequests = await PickupRequestModel.find(pickupRequestFilter)
    .populate({
      path: "order",
      model: "Order",
      populate: [
        {
          path: "store",
          model: "Store",
          select: "name location",
        },
        {
          path: "customer",
          model: "User",
          select: "name image",
        },
        {
          path: "shipping_address",
          model: "Shipping",
        },
        {
          path: "billing_address",
          model: "Billing",
        },
        {
          path: "items.product",
          model: "Product",
          select: "name images",
        },
      ],
    })
    .select(
      "order delivery_location delivery_coordinates delivery_proof_image status rejections",
    );

  // Filter by store if we have nearby stores
  let filteredRequests = pickupRequests;
  if (storeIds.length > 0) {
    filteredRequests = pickupRequests.filter(
      (pr: any) =>
        pr.order && storeIds.some((id: any) => id.equals(pr.order.store)),
    );
  }

  // Manual pagination
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  const total = filteredRequests.length;
  const data = filteredRequests.slice(skip, skip + limit).map((pr: any) => {
    const isCancelled =
      pr.rejections?.some((id: any) => id.equals(rider._id)) || false;

    return {
      ...pr.toObject(),
      status: isCancelled ? "canceled" : pr.status,
      isCancelled,
    };
  });

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getSinglePickupRequest = async (id: string, currentUserEmail?: string) => {
  let riderId: string | null = null;

  if (currentUserEmail) {
    const rider = await RiderModel.findOne({
      email: currentUserEmail,
      is_deleted: false,
      is_blocked: false,
    }).select("_id");

    riderId = rider?._id?.toString() || null;
  }

  const result = await PickupRequestModel.findOne({ _id: id })
    .populate({
      path: "order",
      model: "Order",
      populate: [
        {
          path: "store",
          model: "Store",
          select: "name location",
        },
        {
          path: "customer",
          model: "User",
          select: "name image contact",
        },
        {
          path: "shipping_address",
          model: "Shipping",
        },
        {
          path: "billing_address",
          model: "Billing",
        },
        {
          path: "items.product",
          model: "Product",
          select: "name images",
        },
      ],
    })
    .select(
      "order delivery_location delivery_coordinates delivery_proof_image status rejections",
    )
    .lean();

  const isCancelled =
    riderId
      ? (result as any)?.rejections?.some((rejectionId: any) =>
          rejectionId.equals(riderId),
        ) || false
      : false;

  const order = (result as any)?.order;
  const storeCoordinates = order?.store?.location?.coordinates;
  return {
    ...result,
    status: isCancelled ? "canceled" : (result as any)?.status,
    isCancelled,
    store_coordinates:
      Array.isArray(storeCoordinates) && storeCoordinates.length >= 2
        ? {
            latitude: storeCoordinates[1],
            longitude: storeCoordinates[0],
          }
        : null,
  };
};

const rejectRequest = async (id: string, currentUserEmail: string) => {
  const rider = await RiderModel.findOne({
    email: currentUserEmail,
    is_deleted: false,
    is_blocked: false,
  });
  if (!rider) throw new AppError(404, "Rider account not found");

  const pickupRequest = await PickupRequestModel.findOne({
    _id: id,
    status: "requesting",
    rejections: { $nin: [rider._id] },
  });
  if (!pickupRequest) throw new AppError(404, "Pickup request not found!");

  const result = await PickupRequestModel.findByIdAndUpdate(
    pickupRequest._id,
    { $push: { rejections: rider._id } },
    { new: true },
  );
  return result;
};

const acceptRequest = async (id: string, currentUserEmail: string) => {
  const rider = await RiderModel.findOne({
    email: currentUserEmail,
    is_deleted: false,
    is_blocked: false,
  });
  if (!rider) throw new AppError(404, "Rider account not found");

  const pickupRequest = await PickupRequestModel.findOne({
    _id: id,
    status: "requesting",
    rejections: { $nin: [rider._id] },
  });
  if (!pickupRequest) throw new AppError(404, "Pickup request not found!");

  const result = await PickupRequestModel.findByIdAndUpdate(
    pickupRequest._id,
    { status: "ongoing", rider: rider._id },
    { new: true },
  );

  await OrderModel.findByIdAndUpdate(pickupRequest.order, {
    status: "ongoing",
  });

  const order = await OrderModel.findById(pickupRequest.order).select("store");
  const vendor = order
    ? await VendorModel.findOne({
        store: order.store,
        is_deleted: false,
        is_blocked: false,
      }).select("email")
    : null;

  if (!vendor) {
    throw new AppError(404, "Vendor account not found for this pickup request");
  }

  const conversation =
    await chatServices.createOrReuseConversationBetweenAccounts(
      { email: rider.email, role: "rider" },
      { email: vendor.email, role: "vendor" },
    );

  return {
    ...(result as any)?.toObject?.(),
    conversation_id: conversation?._id || null,
  };
};

const updateRequestStatus = async (
  id: string,
  currentUserEmail: string,
  status: string,
  deliveryProofImage?: TFile,
) => {
  if (!["ongoing", "delivered", "canceled"].includes(status)) {
    throw new AppError(400, "Valid pickup request status is required");
  }

  const rider = await RiderModel.findOne({
    email: currentUserEmail,
    is_deleted: false,
    is_blocked: false,
  });
  if (!rider) throw new AppError(404, "Rider account not found");

  const pickupRequest = await PickupRequestModel.findOne({
    _id: id,
    rejections: { $nin: [rider._id] },
  });
  if (!pickupRequest) throw new AppError(404, "Pickup request not found!");

  const updatePayload: Record<string, any> = { status };

  if (deliveryProofImage) {
    updatePayload.delivery_proof_image = await uploadToS3(deliveryProofImage);
  }

  const result = await PickupRequestModel.findByIdAndUpdate(id, updatePayload, {
    new: true,
  });

  const syncedOrderStatus = getSyncedOrderStatus(status);
  if (syncedOrderStatus) {
    await OrderModel.findByIdAndUpdate(pickupRequest.order, {
      status: syncedOrderStatus,
    });
  }

  let riderTransferId: string | null = null;
  if (status === "delivered") {
    const assignedRiderId = pickupRequest.rider || rider._id;
    const settlement =
      await settlementServices.transferRiderSettlementByOrder(
        pickupRequest.order,
        assignedRiderId,
        stripe,
      );

    riderTransferId = (settlement as any)?.rider_stripe_transfer_id || null;
  }

  if (riderTransferId) {
    return {
      ...(result as any)?.toObject?.(),
      riderTransferId,
    };
  }

  return result;
};

export const pickupRequestService = {
  createPickupRequest,
  getAllPickupRequests,
  getSinglePickupRequest,
  rejectRequest,
  acceptRequest,
  updateRequestStatus,
};
