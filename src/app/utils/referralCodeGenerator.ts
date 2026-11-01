import crypto from "crypto";

export function generateReferralCode(userName: string): string {
  if (!userName || userName.trim().length < 2) {
    throw new Error("User name must have at least 2 characters");
  }

  const prefix = userName.slice(0, 2).toUpperCase();
  const randomDigits = crypto.randomInt(100000, 999999).toString();

  return `${prefix}-${randomDigits}`;
}