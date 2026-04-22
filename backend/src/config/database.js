const mongoose = require("mongoose");
const User = require("../models/User");
const { createAvatarUrl, hashPassword } = require("../utils/auth");

const ADMIN_EMAIL = "chindankushwaha72@gmail.com";
const ADMIN_PASSWORD = "Chindan@225";

async function seedAdminUser() {
  const normalizedEmail = ADMIN_EMAIL.toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    let changed = false;

    if (existingUser.role !== "admin") {
      existingUser.role = "admin";
      changed = true;
    }

    if (existingUser.authMethod !== "email") {
      existingUser.authMethod = "email";
      changed = true;
    }

    if (!existingUser.profileImage) {
      existingUser.profileImage = createAvatarUrl(existingUser.name, existingUser.email);
      changed = true;
    }

    if (!existingUser.department) {
      existingUser.department = "IIPS";
      changed = true;
    }

    const desiredPasswordHash = hashPassword(ADMIN_PASSWORD);
    existingUser.passwordHash = desiredPasswordHash;
    changed = true;

    if (changed) {
      await existingUser.save();
    }

    return;
  }

  await User.create({
    name: "Admin",
    email: normalizedEmail,
    passwordHash: hashPassword(ADMIN_PASSWORD),
    profileImage: createAvatarUrl("Admin", normalizedEmail),
    authMethod: "email",
    department: "IIPS",
    role: "admin",
  });

  console.log("Default admin user seeded");
}

async function backfillDepartments() {
  const result = await User.updateMany(
    {
      $or: [
        { department: { $exists: false } },
        { department: null },
        { department: "" },
      ],
    },
    {
      $set: { department: "IIPS" },
    }
  );

  if (result.modifiedCount > 0) {
    console.log(`Backfilled department for ${result.modifiedCount} users`);
  }
}

function connectDB() {
  if (!process.env.MONGO_URI) {
    console.warn("MONGO_URI is not set, running without MongoDB connection");
    return;
  }

  mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
      console.log("Connected to MongoDB");
      await backfillDepartments();
      await seedAdminUser();
    })
    .catch((error) => {
      console.error("MongoDB connection failed:", error.message);
    });
}

module.exports = connectDB;
