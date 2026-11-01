import mongoose from "mongoose";
import app from "./app";
import config from "./app/config";
import { createServer, Server } from "http";
import AdminModel from "./app/modules/admin/admin.model";
import bcrypt from "bcrypt";
import AuthModel from "./app/modules/auth/auth.model";
import net from "net";
import { initSocketServer } from "./app/socket";
import 'dotenv/config';

let server: Server;

const isPortInUse = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", () => resolve(true))
      .once("listening", () => {
        tester.once("close", () => resolve(false)).close();
      })
      .listen(port);
  });
};

async function main() {
  try {
    const portInUse = await isPortInUse(Number(config.port));
    if (portInUse) {
      console.log(`Server is running on port: ${config.port}`);
      return;
    }

    if (!config.database_url) {
      throw new Error("DATABASE_URL is missing in environment variables");
    }

    await mongoose.connect(config.database_url);

    server = createServer(app);
    initSocketServer(server);

    server.listen(Number(config.port), () => {
      console.log(`Server is running on port: ${config.port}`);
    });

    await createAdmin();
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ECONNREFUSED"
    ) {
      console.log(
        "Database connection failed. MongoDB Atlas DNS/network access is being refused. Check DATABASE_URL, internet access, DNS resolution, and Atlas Network Access/IP allowlist.",
      );
    }
    console.log("Server error:", error);
    process.exit(1);
  }
}

const createAdmin = async () => {
  const session = await mongoose.startSession();
  const email = "admin@gmail.com";

  try {
    session.startTransaction();

    const admin = await AdminModel.findOne({ email }).session(session);
    const auth = await AuthModel.findOne({
      email,
      is_deleted: false,
      is_blocked: false,
    }).session(session);

    if (admin && auth) {
      await session.commitTransaction();
      return;
    }

    const adminData = {
      name: "Admin",
      email,
    };

    const password = "admin";
    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.salt_rounds),
    );

    await AuthModel.create(
      [{ email, password: hashedPassword, role: "admin", is_approved: true }],
      {
        session,
      },
    );

    await AdminModel.create([adminData], { session });

    await session.commitTransaction();
    console.log("Admin account created successfully");
  } catch (err: any) {
    await session.abortTransaction();
    console.log("Error creating admin account:", err.message);
  } finally {
    session.endSession();
  }
};

main();

process.on("unhandledRejection", (error) => {
  console.log(`Unhandled Rejection: ${error}`);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on("uncaughtException", (error) => {
  console.log(`Uncaught Exception: ${error}`);
  process.exit(1);
});
