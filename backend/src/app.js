const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const User = require("./models/User");
const Item = require("./models/Item");
const Notification = require("./models/Notification");
const { createAvatarUrl, hashPassword, verifyPassword } = require("./utils/auth");
const webpush = require("web-push");
const PushSubscription = require("./models/PushSubscription");

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

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

  // Web Push Notifications
  try {
    const userIds = users.map((u) => u._id);
    const subscriptions = await PushSubscription.find({ userId: { $in: userIds } });

    if (subscriptions.length > 0 && process.env.VAPID_PUBLIC_KEY) {
      const payload = JSON.stringify({
        title,
        message,
        url: "/",
      });

      const pushPromises = subscriptions.map((sub) => {
        return webpush.sendNotification(sub.subscription, payload).catch((err) => {
          if (err.statusCode === 404 || err.statusCode === 410) {
            console.log("Subscription has expired or is invalid, removing:", sub._id);
            return PushSubscription.findByIdAndDelete(sub._id);
          } else {
            console.error("Error sending push notification:", err);
          }
        });
      });

      await Promise.all(pushPromises);
    }
  } catch (error) {
    console.error("Failed to send push notifications:", error);
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

app.post("/api/auth/google", async (req, res) => {
  try {
    const { accessToken, department } = req.body;

    if (!accessToken) {
      return res.status(400).json({ message: "Google access token is required" });
    }

    // Verify the access token by fetching Google's userinfo endpoint
    const googleRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!googleRes.ok) {
      return res.status(401).json({ message: "Invalid Google token. Please try signing in again." });
    }

    const { sub: googleId, email, name, picture } = await googleRes.json();

    if (!email) {
      return res.status(400).json({ message: "Google account must have an email address" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find existing user by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email: normalizedEmail }] });

    if (user) {
      let changed = false;
      // Link googleId if not already set (e.g. existing email user signing in via Google)
      if (!user.googleId) {
        user.googleId = googleId;
        changed = true;
      }
      // Sync Google profile picture
      if (picture && user.profileImage !== picture) {
        user.profileImage = picture;
        changed = true;
      }
      if (changed) {
        await user.save();
      }
      return res.json(user.toJSON());
    }

    // New Google user — department is required to create the account
    if (!department) {
      return res.status(202).json({
        message: "DEPARTMENT_REQUIRED",
        email: normalizedEmail,
        name,
        picture,
        googleId,
      });
    }

    if (!AVAILABLE_DEPARTMENTS.includes(department)) {
      return res.status(400).json({ message: "Invalid department selected" });
    }

    // Create new user
    user = await User.create({
      name: name?.trim() || normalizedEmail.split("@")[0],
      email: normalizedEmail,
      googleId,
      passwordHash: "",
      profileImage: picture || createAvatarUrl(name?.trim() || "", normalizedEmail),
      authMethod: "google",
      department,
    });

    return res.status(201).json(user.toJSON());
  } catch (error) {
    console.error("Google auth failed:", error);
    return res.status(500).json({ message: "Google sign-in failed. Please try again." });
  }
});



app.patch("/api/users/:id/profile-image", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ message: "Image data is required" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // In a production app you would upload this base64 image to AWS S3, Cloudinary, etc.
    // For this prototype, we'll just save the base64 string directly or the URL.
    user.profileImage = image;
    await user.save();

    return res.json(user.toJSON());
  } catch (error) {
    console.error("Profile image update failed:", error);
    return res.status(500).json({ message: "Failed to update profile image" });
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

app.post("/api/notifications/subscribe", async (req, res) => {
  try {
    const { userId, subscription } = req.body;

    if (!userId || !subscription) {
      return res.status(400).json({ message: "User id and subscription are required" });
    }

    const existingSub = await PushSubscription.findOne({ "subscription.endpoint": subscription.endpoint });
    
    if (existingSub) {
      if (existingSub.userId.toString() !== userId) {
        existingSub.userId = userId;
        await existingSub.save();
      }
      return res.status(200).json({ message: "Subscription already exists" });
    }

    await PushSubscription.create({
      userId,
      subscription,
    });

    return res.status(201).json({ message: "Subscribed successfully" });
  } catch (error) {
    console.error("Failed to subscribe to push notifications:", error);
    return res.status(500).json({ message: "Failed to subscribe" });
  }
});

app.use(express.static(frontendDistPath));

app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    return res.sendFile(path.join(frontendDistPath, "index.html"));
  }
  return next();
});

module.exports = app;
