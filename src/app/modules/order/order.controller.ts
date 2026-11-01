import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import { orderService } from "./order.service";

const createOrder = handleAsyncRequest(async (req: any, res) => {
  const currentUserEmail = req.user.email
  const payload = req.body;
  const result = await orderService.createOrder(currentUserEmail, payload);
  successResponse(res, {
    message: "Order created successfully!",
    data: result,
    status: 201
  })
})

const getUsersOrders = handleAsyncRequest(async (req: any, res) => {
  const currentUserEmail = req.user.email;
  const query = req.query;
  const result = await orderService.getUsersOrders(currentUserEmail, query);
  successResponse(res, {
    message: "Orders retrieved successfully!",
    data: result,
  })
})

const getVendorsOrders = handleAsyncRequest(async (req: any, res) => {
  const currentUserEmail = req.user.email;
  const query = req.query;
  const result = await orderService.getVendorsOrders(currentUserEmail, query);
  successResponse(res, {
    message: "Orders retrieved successfully!",
    data: result,
  })
})

const getSingleOrder = handleAsyncRequest(async (req: any, res) => {
  const orderId = req.params.id;
  const result = await orderService.getSingleOrder(orderId);
  successResponse(res, {
    message: "Order retrieved successfully!",
    data: result,
  })
})

const updateOrderStatus = handleAsyncRequest(async (req: any, res) => {
  const orderId = req.params.id;
  const status = req.body.status;
  const payment_status = req.body.payment_status;
  const result = await orderService.updateOrderStatus(orderId, status, payment_status);
  successResponse(res, {
    message: "Order status updated successfully!",
    data: result,
  })
})


export const orderController = {
  createOrder,
  getUsersOrders,
  getVendorsOrders,
  getSingleOrder,
  updateOrderStatus
}