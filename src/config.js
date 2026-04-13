const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function getEnv(name, fallback) {
  return process.env[name] || fallback;
}

function getNumberEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(value) ? value : fallback;
}

function deriveKey(source) {
  return crypto.createHash("sha256").update(source).digest();
}

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
  return target;
}

function createConfig() {
  const appRoot = path.resolve(__dirname, "..");
  const dataDir = ensureDir(path.resolve(getEnv("APP_DATA_DIR", path.join(appRoot, "data"))));
  const certDir = ensureDir(path.resolve(getEnv("CERT_DIR", path.join(appRoot, "certs"))));

  return {
    host: getEnv("APP_HOST", "0.0.0.0"),
    httpPort: getNumberEnv("APP_PORT_HTTP", 8080),
    httpsPort: getNumberEnv("APP_PORT_HTTPS", 8443),
    publicHttpsPort: getNumberEnv("PUBLIC_HTTPS_PORT", getNumberEnv("APP_PORT_HTTPS", 8443)),
    dbPath: path.resolve(getEnv("DB_PATH", path.join(dataDir, "auth.db"))),
    certPath: path.resolve(getEnv("TLS_CERT_PATH", path.join(certDir, "server.crt"))),
    keyPath: path.resolve(getEnv("TLS_KEY_PATH", path.join(certDir, "server.key"))),
    sessionSecret: getEnv("SESSION_SECRET", "change-this-demo-session-secret"),
    pepperSecret: getEnv("PEPPER_SECRET", "change-this-demo-pepper-secret"),
    encryptionKey: deriveKey(getEnv("ENCRYPTION_KEY", "change-this-demo-encryption-key")),
    secureCookies: process.env.NODE_ENV !== "test",
    authWindowMs: 10 * 60 * 1000,
    authMaxAttempts: 10,
    sessionMaxAgeMs: 30 * 60 * 1000,
  };
}

module.exports = {
  createConfig,
};
