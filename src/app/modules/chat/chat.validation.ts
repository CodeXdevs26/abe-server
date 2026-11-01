import { z } from "zod";

export const createConversationValidationSchema = z.object({
  partnerId: z.string().optional(),
  vendorId: z.string().optional(),
}).refine((payload) => payload.partnerId || payload.vendorId, {
  message: "Partner id is required",
  path: ["partnerId"],
});

export const sendMessageValidationSchema = z.object({
  conversationId: z.string().nonempty("Conversation id is required"),
  text: z.string().trim().min(1, "Message text is required"),
});
