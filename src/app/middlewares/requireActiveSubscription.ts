import { NextFunction, Request, Response } from "express";
import { AppError } from "../classes/appError";
import handleAsyncRequest from "../utils/handleAsyncRequest";
import subscriptionServices from "../modules/subscription/subscription.service";
import { TSubscriptionRole } from "../modules/subscription/subscription.interface";
import AuthModel from "../modules/auth/auth.model";

const requireActiveSubscription = (roles: TSubscriptionRole[]) =>
  handleAsyncRequest(
    async (req: Request, _res: Response, next: NextFunction) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const user = req.user;

      if (!user || !roles.includes(user.role)) {
        return next();
      }

      const hasActiveSubscription =
        await subscriptionServices.isRoleSubscriptionActive(
          user.email,
          user.role,
        );

      // Check for free trial
      let hasFreeTrial = false;
      const authUser = await AuthModel.findOne({
        email: user.email,
        is_deleted: false,
        is_blocked: false,
      });
      
      if (authUser?.free_trial_end_date) {
        hasFreeTrial = new Date(authUser.free_trial_end_date) > new Date();
      }

      if (!hasActiveSubscription && !hasFreeTrial) {
        throw new AppError(
          403,
          "An active monthly subscription or free trial is required to access this feature",
        );
      }

      next();
    },
  );

export default requireActiveSubscription;
