const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const User = require("./models/User");
const Item = require("./models/Item");
const Notification = require("./models/Notification");
const { createAvatarUrl, hashPassword, verifyPassword } = require("./utils/auth");

const app = express();
const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");
const AVAILABLE_DEPARTMENTS = ["IIPS"];

app.use(express.json({ limit: "10mb" }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

async function createNotificationsForUsers({ excludeUserId, title, message, type, itemId = null }) {
  const filter = excludeUserId
    ? { _id: { $ne: excludeUserId } }
    : {};
  const users = await User.find(filter).select("_id");

  if (!users.length) {
    return;
  }

  const notifications = await Notification.insertMany(
    users.map((user) => ({
      userId: user._id,
      title,
      message,
      type,
      itemId,
    }))
  );

  const io = app.get("io");

  if (io) {
    notifications.forEach((notification) => {
      io.to(`user:${notification.userId.toString()}`).emit("notification:new", notification.toJSON());
    });
  }
}

async function getUserByIdOrFail(userId) {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  return user;
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    mongoConnected: mongoose.connection.readyState === 1,
  });
});

app.get("/api/config", (_req, res) => {
  res.json({
    departments: AVAILABLE_DEPARTMENTS,
  });
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, department } = req.body;

    if (!name || !email || !password || !department) {
      return res.status(400).json({ message: "Name, email, password, and department are required" });
    }

    if (!AVAILABLE_DEPARTMENTS.includes(department)) {
      return res.status(400).json({ message: "Invalid department selected" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      profileImage: createAvatarUrl(name.trim(), normalizedEmail),
      authMethod: "email",
      department,
    });

    return res.status(201).json(user.toJSON());
  } catch (error) {
    console.error("Signup failed:", error);
    return res.status(500).json({ message: "Unable to create account right now" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, department } = req.body;

    if (!email || !password || !department) {
      return res.status(400).json({ message: "Email, password, and department are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.department) {
      user.department = "IIPS";
      await user.save();
    }

    if (user.department !== department) {
      return res.status(401).json({ message: "Please choose the correct department" });
    }

    return res.json(user.toJSON());
  } catch (error) {
    console.error("Login failed:", error);
    return res.status(500).json({ message: "Unable to sign in right now" });
  }
});

app.get("/api/items", async (req, res) => {
  try {
    const filter = req.query.department
      ? { department: req.query.department }
      : {};
    const items = await Item.find(filter).sort({ createdAt: -1 });
    return res.json(items.map((item) => item.toJSON()));
  } catch (error) {
    console.error("Failed to load items:", error);
    return res.status(500).json({ message: "Unable to load items right now" });
  }
});

app.post("/api/items", async (req, res) => {
  try {
    const { title, status, name, location, contact, phone, description, image, ownerId, department } = req.body;

    if (!title || !status || !name || !location || !contact || !ownerId || !department) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!AVAILABLE_DEPARTMENTS.includes(department)) {
      return res.status(400).json({ message: "Invalid department selected" });
    }

    const owner = await getUserByIdOrFail(ownerId);

    if (owner.department !== department) {
      return res.status(400).json({ message: "Request department must match the logged in user" });
    }

    const item = await Item.create({
      title: title.trim(),
      status,
      name: name.trim(),
      location: location.trim(),
      contact: contact.trim(),
      department,
      phone: phone?.trim() || "",
      description: description?.trim() || "",
      image: image?.trim() || "",
      ownerId: owner._id,
    });

    await createNotificationsForUsers({
      excludeUserId: owner._id,
      title: `New ${status} request`,
      message: `${owner.name} added "${item.title}" from ${item.location}.`,
      type: "new-request",
      itemId: item._id,
    });

    return res.status(201).json(item.toJSON());
  } catch (error) {
    console.error("Failed to create item:", error);
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(500).json({ message: "Unable to create request right now" });
  }
});

app.patch("/api/items/:id/resolve", async (req, res) => {
  try {
    const { ownerId } = req.body;

    if (!ownerId) {
      return res.status(400).json({ message: "Owner id is required" });
    }

    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (item.ownerId.toString() !== ownerId) {
      return res.status(403).json({ message: "Only the owner can resolve this request" });
    }

    item.isResolved = true;
    await item.save();

    return res.json(item.toJSON());
  } catch (error) {
    console.error("Failed to resolve item:", error);
    return res.status(500).json({ message: "Unable to resolve request right now" });
  }
});

app.delete("/api/items", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User id is required" });
    }

    const user = await getUserByIdOrFail(userId);

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can remove all requests" });
    }

    await Item.deleteMany({});

    await createNotificationsForUsers({
      excludeUserId: null,
      title: "Requests cleared",
      message: `${user.name} removed all requests from the system.`,
      type: "admin-action",
    });

    return res.json({ message: "All requests deleted successfully" });
  } catch (error) {
    console.error("Failed to delete all items:", error);
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(500).json({ message: "Unable to delete requests right now" });
  }
});

app.delete("/api/items/:id", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User id is required" });
    }

    const user = await getUserByIdOrFail(userId);

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can remove requests" });
    }

    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const owner = await User.findById(item.ownerId);
    const itemTitle = item.title;
    const itemLocation = item.location;

    await item.deleteOne();

    if (owner) {
      const notification = await Notification.create({
        userId: owner._id,
        title: "Request removed",
        message: `${user.name} removed your request "${itemTitle}" from ${itemLocation}.`,
        type: "admin-action",
      });

      const io = app.get("io");
      if (io) {
        io.to(`user:${owner._id.toString()}`).emit("notification:new", notification.toJSON());
      }
    }

    return res.json({ message: "Request deleted successfully", id: req.params.id });
  } catch (error) {
    console.error("Failed to delete item:", error);
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(500).json({ message: "Unable to delete request right now" });
  }
});

app.get("/api/notifications", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "User id is required" });
    }

    await getUserByIdOrFail(userId);
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(50);

    return res.json(notifications.map((notification) => notification.toJSON()));
  } catch (error) {
    console.error("Failed to load notifications:", error);
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(500).json({ message: "Unable to load notifications right now" });
  }
});

app.patch("/api/notifications/:id/read", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User id is required" });
    }

    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.userId.toString() !== userId) {
      return res.status(403).json({ message: "You can only update your own notifications" });
    }

    notification.isRead = true;
    await notification.save();

    return res.json(notification.toJSON());
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    return res.status(500).json({ message: "Unable to update notification right now" });
  }
});

app.use(express.static(frontendDistPath));

app.get("/{*splat}", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }

  return res.sendFile(path.join(frontendDistPath, "index.html"));
});

module.exports = app;
