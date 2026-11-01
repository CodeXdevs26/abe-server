import handleAsyncRequest from "../../utils/handleAsyncRequest";
import { successResponse } from "../../utils/successResponse";
import { cartService } from "./cart.service";

const addToCart = handleAsyncRequest(async (req: any, res) => {
  const payload = req.body;
  const currentUserEmail = req.user.email;
  const result = await cartService.addToCart(payload, currentUserEmail);
  successResponse(res, {
    message: "Cart created successfully!",
    data: result,
    status: 201
  })
})

const getCartByUser = handleAsyncRequest(async (req: any, res) => {
  const currentUserEmail = req.user.email;
  const query = req.query;
  const result = await cartService.getCartByUser(currentUserEmail, query);
  successResponse(res, {
    message: "Cart retrieved successfully!",
    data: result,
  })
})

const increaseQuantity = handleAsyncRequest(async (req: any, res) => {
  const id = req.params.id;
  const result = await cartService.increaseQuantity(id);
  successResponse(res, {
    message: "Cart quantity updated successfully!",
    data: result,
  })
})

const decreaseQuantity = handleAsyncRequest(async (req: any, res) => {
  const id = req.params.id;
  const result = await cartService.decreaseQuantity(id);
  successResponse(res, {
    message: "Cart quantity updated successfully!",
    data: result,
  })
})

const deleteCart = handleAsyncRequest(async (req: any, res) => {
  const id = req.params.id;
  const result = await cartService.deleteCart(id);
  successResponse(res, {
    message: "Cart deleted successfully!",
    data: result,
  })
})

export const cartController = {
  addToCart,
  getCartByUser,
  increaseQuantity,
  decreaseQuantity,
  deleteCart
}