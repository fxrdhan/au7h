const path = require('node:path');
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");

const {
  createUsernameLookup,
  decryptUsername,
  encryptUsername,
  hashPassword,
  verifyPassword,
} = require("./crypto-utils");
const {
  createAuthLimiter,
  csrfTokensMatch,
  ensureCsrfToken,
  validatePassword,
  validateUsername,
} = require("./security");
const {
  renderAuthPage,
  renderErrorPage,
  renderNotRegisteredPage,
  renderWelcomePage,
} = require("./templates");

function createApp({ config, database }) {
  const app = express();
  const authLimiter = createAuthLimiter({
    windowMs: config.authWindowMs,
    max: config.authMaxAttempts,
  });

  app.disable("x-powered-by");

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          imgSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use("/static", express.static(path.resolve(__dirname, "..", "public"), { maxAge: 0 }));
  app.use(express.urlencoded({ extended: false, limit: "8kb", parameterLimit: 10 }));
  app.use(
    session({
      name: "kamsis.sid",
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "strict",
        secure: config.secureCookies,
        maxAge: config.sessionMaxAgeMs,
      },
    }),
  );

  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.locals.csrfToken = ensureCsrfToken(req.session);
    next();
  });

  function setFlash(req, flash) {
    req.session.flash = flash;
  }

  function takeFlash(req) {
    const flash = req.session.flash;
    delete req.session.flash;
    return flash;
  }

  function renderHtml(res, status, html) {
    res.status(status).type("html").send(html);
  }

  function rejectInvalidForm(res) {
    renderHtml(
      res,
      403,
      renderErrorPage({
        title: "Form ditolak",
        description: "Token integritas form tidak valid atau sudah kedaluwarsa.",
      }),
    );
  }

  function requireValidCsrf(req, res) {
    const submittedToken = req.body.csrfToken;
    if (!csrfTokensMatch(req.session.csrfToken, submittedToken)) {
      rejectInvalidForm(res);
      return false;
    }

    return true;
  }

  app.get("/", (req, res) => {
    if (req.session.userId) {
      res.redirect("/welcome");
      return;
    }

    renderHtml(
      res,
      200,
      renderAuthPage({
        csrfToken: res.locals.csrfToken,
        flash: takeFlash(req),
      }),
    );
  });

  app.post("/register", authLimiter, (req, res) => {
    if (!requireValidCsrf(req, res)) {
      return;
    }

    const usernameResult = validateUsername(req.body.username);
    const passwordResult = validatePassword(req.body.password);

    if (!usernameResult.ok || !passwordResult.ok) {
      setFlash(req, {
        type: "error",
        text: usernameResult.message || passwordResult.message,
      });
      res.redirect("/");
      return;
    }

    const usernameLookup = createUsernameLookup(usernameResult.value, config.pepperSecret);
    const existingUser = database.findUserByLookup(usernameLookup);

    if (existingUser) {
      setFlash(req, {
        type: "error",
        text: "Username sudah terdaftar. Silakan login.",
      });
      res.redirect("/");
      return;
    }

    try {
      database.createUser({
        usernameLookup,
        usernameEncrypted: encryptUsername(usernameResult.value, config.encryptionKey),
        passwordHash: hashPassword(passwordResult.value, config.pepperSecret),
      });
      setFlash(req, {
        type: "success",
        text: "Registrasi berhasil. Silakan login.",
      });
      res.redirect("/");
    } catch (error) {
      console.error("Failed to register user:", error);
      renderHtml(
        res,
        500,
        renderErrorPage({
          title: "Registrasi gagal",
          description: "Server gagal menyimpan akun baru.",
        }),
      );
    }
  });

  app.post("/login", authLimiter, (req, res) => {
    if (!requireValidCsrf(req, res)) {
      return;
    }

    const usernameResult = validateUsername(req.body.username);
    const passwordResult = validatePassword(req.body.password);

    if (!usernameResult.ok || !passwordResult.ok) {
      res.redirect("/not-registered");
      return;
    }

    const usernameLookup = createUsernameLookup(usernameResult.value, config.pepperSecret);
    const user = database.findUserByLookup(usernameLookup);

    if (!user || !verifyPassword(passwordResult.value, user.password_hash, config.pepperSecret)) {
      req.session.userId = null;
      res.redirect("/not-registered");
      return;
    }

    req.session.regenerate((error) => {
      if (error) {
        console.error("Failed to rotate session:", error);
        renderHtml(
          res,
          500,
          renderErrorPage({
            title: "Login gagal",
            description: "Server gagal membuat session baru yang aman.",
          }),
        );
        return;
      }

      req.session.userId = user.id;
      ensureCsrfToken(req.session);
      res.redirect("/welcome");
    });
  });

  app.get("/welcome", (req, res) => {
    if (!req.session.userId) {
      res.redirect("/");
      return;
    }

    const user = database.findUserById(req.session.userId);

    if (!user) {
      req.session.destroy(() => res.redirect("/"));
      return;
    }

    try {
      renderHtml(
        res,
        200,
        renderWelcomePage({
          username: decryptUsername(user.username_encrypted, config.encryptionKey),
          csrfToken: res.locals.csrfToken,
        }),
      );
    } catch (error) {
      console.error("Failed to decrypt username:", error);
      renderHtml(
        res,
        500,
        renderErrorPage({
          title: "Data akun tidak bisa dibaca",
          description: "Kunci enkripsi untuk username tidak cocok.",
        }),
      );
    }
  });

  app.get("/not-registered", (_req, res) => {
    renderHtml(res, 401, renderNotRegisteredPage());
  });

  app.post("/logout", (req, res) => {
    if (!requireValidCsrf(req, res)) {
      return;
    }

    req.session.destroy(() => {
      res.redirect("/");
    });
  });

  app.use((_req, res) => {
    renderHtml(
      res,
      404,
      renderErrorPage({
        title: "Halaman tidak ditemukan",
        description: "Rute yang diminta tidak tersedia pada server ini.",
      }),
    );
  });

  app.use((error, _req, res, _next) => {
    console.error("Unhandled application error:", error);
    renderHtml(
      res,
      500,
      renderErrorPage({
        title: "Terjadi kesalahan",
        description: "Server menolak permintaan ini demi menjaga kestabilan aplikasi.",
      }),
    );
  });

  return app;
}

module.exports = {
  createApp,
};
