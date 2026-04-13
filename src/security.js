const crypto = require('node:crypto');

function escapeHtml(input = "") {
  return String(input).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

function ensureCsrfToken(session) {
  if (!session.csrfToken) {
    session.csrfToken = crypto.randomBytes(32).toString("hex");
  }

  return session.csrfToken;
}

function csrfTokensMatch(sessionToken, submittedToken) {
  if (!sessionToken || !submittedToken) {
    return false;
  }

  const stored = Buffer.from(String(sessionToken));
  const incoming = Buffer.from(String(submittedToken));

  if (stored.length !== incoming.length) {
    return false;
  }

  return crypto.timingSafeEqual(stored, incoming);
}

function validateUsername(value) {
  const trimmed = String(value || "").trim();

  if (trimmed.length < 3 || trimmed.length > 32) {
    return {
      ok: false,
      message: "Username harus 3-32 karakter.",
    };
  }

  if (!/^[A-Za-z0-9_.-]+$/.test(trimmed)) {
    return {
      ok: false,
      message: "Username hanya boleh huruf, angka, titik, strip, atau underscore.",
    };
  }

  return {
    ok: true,
    value: trimmed,
  };
}

function validatePassword(value) {
  const password = String(value || "");

  if (password.length < 10 || password.length > 72) {
    return {
      ok: false,
      message: "Password harus 10-72 karakter.",
    };
  }

  const checks = [/[a-z]/, /[A-Z]/, /[0-9]/];
  const passed = checks.filter((regex) => regex.test(password)).length;

  if (passed < 3) {
    return {
      ok: false,
      message: "Password harus memuat huruf kecil, huruf besar, dan angka.",
    };
  }

  return {
    ok: true,
    value: password,
  };
}

function createAuthLimiter({ windowMs, max }) {
  const attempts = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip}:${req.path}`;
    const bucket = attempts.get(key) || [];
    const recentAttempts = bucket.filter((timestamp) => now - timestamp < windowMs);

    if (recentAttempts.length >= max) {
      res.status(429).type("html").send(`
        <!doctype html>
        <html lang="id">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Terlalu Banyak Percobaan</title>
          </head>
          <body>
            <h1>Terlalu banyak percobaan login</h1>
            <p>Coba lagi beberapa menit lagi.</p>
          </body>
        </html>
      `);
      return;
    }

    recentAttempts.push(now);
    attempts.set(key, recentAttempts);
    next();
  };
}

module.exports = {
  createAuthLimiter,
  csrfTokensMatch,
  ensureCsrfToken,
  escapeHtml,
  validatePassword,
  validateUsername,
};

