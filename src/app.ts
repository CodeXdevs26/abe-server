import express from "express";
import cors from "cors";
import router from "./app/routes";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import routeNotFound from "./app/middlewares/routeNotFound";
import subscriptionController from "./app/modules/subscription/subscription.controller";
import paymentController from "./app/modules/payment/payment.controller";

const app = express();

// CORS open to all origins. `origin: true` reflects the request origin, which
// (unlike "*") stays valid together with `credentials: true`.
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.post(
  "/api/v1/subscriptions/webhook",
  express.raw({ type: "application/json" }),
  subscriptionController.handleWebhook,
);

app.post(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleWebhook,
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/v1", router);

app.get("/", (req, res) => {
  res.json({ message: "Hello from discount me server!" });
});

// handle api route not found
app.use(routeNotFound);

// handle global errors
app.use(globalErrorHandler);

export default app;
