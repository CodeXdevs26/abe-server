import { TSupport } from "./support.interface";
import { sendEmail } from "../../utils/sendEmail";
import config from "../../config";

const sendMessage = async (payload: TSupport) => {
  const subject = "Support Ticket - Discount Me";

  const replacements = {
    name: payload.name,
    email: payload.email,
    message: payload.message,
  };
  const path = "./src/app/emailTemplates/formSubmission.html";
  sendEmail(config.admin_email as string, subject, path, replacements);
};

export const supportService = { sendMessage };
