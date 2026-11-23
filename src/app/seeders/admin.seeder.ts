import mongoose from "mongoose";
import bcrypt from "bcrypt";
import config from "../config";
import AdminModel from "../modules/admin/admin.model";
import AuthModel from "../modules/auth/auth.model";

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_NAME = "Admin";
const MIN_PASSWORD_LENGTH = 12;

/**
 * Creates the initial admin account (Auth + Admin profile) if it doesn't exist.
 * The password must come from ADMIN_PASSWORD; there is intentionally no default.
 */
export const seedAdmin = async (): Promise<void> => {
  const password = process.env.ADMIN_PASSWORD;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const [admin, auth] = await Promise.all([
      AdminModel.findOne({ email: ADMIN_EMAIL }).session(session),
      AuthModel.findOne({
        email: ADMIN_EMAIL,
        is_deleted: false,
        is_blocked: false,
      }).session(session),
    ]);

    if (admin && auth) {
      await session.commitTransaction();
      return;
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      await session.abortTransaction();
      console.warn(
        `Admin seeding skipped: set ADMIN_PASSWORD (min ${MIN_PASSWORD_LENGTH} chars) to create the initial admin account.`,
      );
      return;
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.salt_rounds),
    );

    await AuthModel.create(
      [
        {
          email: ADMIN_EMAIL,
          password: hashedPassword,
          role: "admin",
          is_approved: true,
        },
      ],
      { session },
    );
    await AdminModel.create([{ name: ADMIN_NAME, email: ADMIN_EMAIL }], {
      session,
    });

    await session.commitTransaction();
    console.log("Admin account created successfully");
  } catch (err: any) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error("Error creating admin account:", err?.message ?? err);
  } finally {
    await session.endSession();
  }
};
