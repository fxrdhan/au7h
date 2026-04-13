const { escapeHtml } = require("./security");

function renderFlash(flash) {
  if (!flash || !flash.text) {
    return "";
  }

  const variant = flash.type === "success" ? "notice success" : "notice";
  return `<div class="${variant}" role="status">${escapeHtml(flash.text)}</div>`;
}

function layout({ title, content }) {
  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="/static/styles.css">
  </head>
  <body>
    <main class="page-shell">
      ${content}
    </main>
  </body>
</html>`;
}

function renderAuthPage({ csrfToken, flash }) {
  return layout({
    title: "Kamsis Secure Login",
    content: `
      <section class="hero-card">
        <p class="eyebrow">Single Container Secure Auth</p>
        <h1>Login dan Register via HTTPS</h1>
        <p class="lede">
          Username tidak disimpan polos, password di-hash, query database diproteksi dengan prepared statement,
          dan form memakai CSRF token untuk menjaga integritas request.
        </p>
        ${renderFlash(flash)}
        <div class="grid">
          <form class="panel" method="post" action="/login" autocomplete="off">
            <h2>Login</h2>
            <input type="hidden" name="csrfToken" value="${escapeHtml(csrfToken)}">
            <label>
              Username
              <input name="username" type="text" minlength="3" maxlength="32" required>
            </label>
            <label>
              Password
              <input name="password" type="password" minlength="10" maxlength="72" required>
            </label>
            <button type="submit">Masuk</button>
          </form>

          <form class="panel" method="post" action="/register" autocomplete="off">
            <h2>Register</h2>
            <input type="hidden" name="csrfToken" value="${escapeHtml(csrfToken)}">
            <label>
              Username
              <input name="username" type="text" minlength="3" maxlength="32" pattern="[A-Za-z0-9_.-]+" required>
            </label>
            <label>
              Password
              <input name="password" type="password" minlength="10" maxlength="72" required>
            </label>
            <p class="hint">Gunakan huruf kecil, huruf besar, dan angka.</p>
            <button type="submit">Daftar</button>
          </form>
        </div>
      </section>
    `,
  });
}

function renderWelcomePage({ username, csrfToken }) {
  return layout({
    title: "Selamat Datang",
    content: `
      <section class="hero-card hero-card--compact">
        <p class="eyebrow">Autentikasi Berhasil</p>
        <h1>Selamat datang, ${escapeHtml(username)}</h1>
        <p class="lede">Session aktif tersimpan aman di cookie <code>HttpOnly</code> dan <code>SameSite=Strict</code>.</p>
        <form method="post" action="/logout">
          <input type="hidden" name="csrfToken" value="${escapeHtml(csrfToken)}">
          <button type="submit">Logout</button>
        </form>
      </section>
    `,
  });
}

function renderNotRegisteredPage() {
  return layout({
    title: "Anda Belum Terdaftar",
    content: `
      <section class="hero-card hero-card--compact">
        <p class="eyebrow">Autentikasi Gagal</p>
        <h1>Anda belum terdaftar</h1>
        <p class="lede">
          Username/password tidak cocok. Halaman ini sengaja dibuat generik agar tidak membocorkan akun mana yang valid.
        </p>
        <a class="link-button" href="/">Kembali ke form</a>
      </section>
    `,
  });
}

function renderErrorPage({ title, description }) {
  return layout({
    title,
    content: `
      <section class="hero-card hero-card--compact">
        <p class="eyebrow">Akses Ditolak</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="lede">${escapeHtml(description)}</p>
        <a class="link-button" href="/">Kembali</a>
      </section>
    `,
  });
}

module.exports = {
  renderAuthPage,
  renderErrorPage,
  renderNotRegisteredPage,
  renderWelcomePage,
};
