// Standalone seeder entry: `npm run seed` (dev) or `npm run seed:prod` (built).
import "dotenv/config";
import mongoose from "mongoose";
import config from "./app/config";
import { runSeeders } from "./app/seeders";

const seed = async () => {
  if (!config.database_url) {
    throw new Error("DATABASE_URL is missing in environment variables");
  }

  await mongoose.connect(config.database_url);
  await runSeeders();
};

seed()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
