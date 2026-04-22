const crypto = require("crypto");

function createAvatarUrl(name, email) {
  const label = encodeURIComponent(name || email || "User");
  return `https://ui-avatars.com/api/?name=${label}&background=4A90E2&color=fff`;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedValue) {
  const [salt, originalHash] = storedValue.split(":");

  if (!salt || !originalHash) {
    return false;
  }

  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(originalHash, "hex"));
}

module.exports = {
  createAvatarUrl,
  hashPassword,
  verifyPassword,
};
