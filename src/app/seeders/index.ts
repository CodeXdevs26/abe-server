import { seedAdmin } from "./admin.seeder";

/** Runs all seeders in order. Add new seeders here. */
export const runSeeders = async (): Promise<void> => {
  await seedAdmin();
};
