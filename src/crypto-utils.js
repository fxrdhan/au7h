const crypto = require('node:crypto');

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

function createUsernameLookup(username, lookupSecret) {
  return crypto
    .createHmac("sha256", lookupSecret)
    .update(normalizeUsername(username))
    .digest("hex");
}

function encryptUsername(username, encryptionKey) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(username, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, encrypted].map((part) => part.toString("base64url")).join(".");
}

function decryptUsername(payload, encryptionKey) {
  const [ivPart, authTagPart, encryptedPart] = payload.split(".");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey,
    Buffer.from(ivPart, "base64url"),
  );

  decipher.setAuthTag(Buffer.from(authTagPart, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

function hashPassword(password, pepperSecret) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .scryptSync(password, `${salt}:${pepperSecret}`, 64, {
      N: 16384,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    })
    .toString("hex");

  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, storedValue, pepperSecret) {
  const [algorithm, salt, storedHashHex] = String(storedValue).split(":");

  if (algorithm !== "scrypt" || !salt || !storedHashHex) {
    return false;
  }

  const computedHash = crypto.scryptSync(password, `${salt}:${pepperSecret}`, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });

  const storedHash = Buffer.from(storedHashHex, "hex");

  if (storedHash.length !== computedHash.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedHash, computedHash);
}

module.exports = {
  createUsernameLookup,
  decryptUsername,
  encryptUsername,
  hashPassword,
  normalizeUsername,
  verifyPassword,
};

