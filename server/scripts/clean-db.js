import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/UserModel.js";
import Emergency from "../models/EmergencyModel.js";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set in server/.env");
  process.exit(1);
}

// Pass --yes / -y (or set FORCE=1) to skip the confirmation prompt
const force = process.argv.includes("--yes") || process.argv.includes("-y") || process.env.FORCE === "1";

if (!force) {
  console.log("\nThis will DELETE ALL users and their data from the database.");
  console.log("Run again with  --yes  to confirm.\n");
  process.exit(0);
}

async function cleanDb() {
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const [users, emergencies] = await Promise.all([
    User.deleteMany({}),
    Emergency.deleteMany({}),
  ]);

  console.log(`Deleted users:     ${users.deletedCount}`);
  console.log(`Deleted emergency: ${emergencies.deletedCount}`);

  await mongoose.disconnect();
  console.log("Database cleaned.");
}

cleanDb().catch(async err => {
  console.error("Clean failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});