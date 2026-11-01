import { Router } from "express";
import { cartController } from "./cart.controller";
import authVerify from "../../middlewares/authVerify";
import createCartValidationSchema from "./cart.validation";
import validate from "../../middlewares/validate";


const cartRouter = Router();

cartRouter.post('/', authVerify(["user"]), validate(createCartValidationSchema), cartController.addToCart)
cartRouter.get('/', authVerify(["user"]), cartController.getCartByUser)
cartRouter.patch('/increase/:id', authVerify(["user"]), cartController.increaseQuantity)
cartRouter.patch('/decrease/:id', authVerify(["user"]), cartController.decreaseQuantity)
cartRouter.delete('/:id', authVerify(["user"]), cartController.deleteCart)

export default cartRouter;