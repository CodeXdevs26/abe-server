import { randomInt } from "crypto";

// Cryptographically secure 6-digit OTP (Math.random is predictable)
const generateOTP = () => {
  return randomInt(100000, 1000000);
};
export default generateOTP;
