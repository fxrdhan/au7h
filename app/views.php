<?php

declare(strict_types=1);

function render_flash(?array $flash): string
{
    if ($flash === null || !isset($flash['text'])) {
        return '';
    }

    $className = ($flash['type'] ?? 'error') === 'success' ? 'notice success' : 'notice';
    return '<div class="' . $className . '" role="status">' . escape_html((string) $flash['text']) . '</div>';
}

function render_layout(string $title, string $content): string
{
    return '<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>' . escape_html($title) . '</title>
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body>
    <main class="page-shell">
      ' . $content . '
    </main>
  </body>
</html>';
}

function render_auth_page(?array $flash): string
{
    $csrfToken = csrf_token();

    $content = '
      <section class="hero-card">
        <p class="eyebrow">Single Container Secure Auth</p>
        <h1>Login dan Register via HTTPS dengan PHP</h1>
        <p class="lede">
          Username tidak disimpan polos, password di-hash dengan Argon2id, query database memakai prepared statement,
          dan form memakai CSRF token untuk menjaga integritas request.
        </p>
        ' . render_flash($flash) . '
        <div class="grid">
          <form class="panel" method="post" action="/login.php" autocomplete="off">
            <h2>Login</h2>
            <input type="hidden" name="csrf_token" value="' . escape_html($csrfToken) . '">
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

          <form class="panel" method="post" action="/register.php" autocomplete="off">
            <h2>Register</h2>
            <input type="hidden" name="csrf_token" value="' . escape_html($csrfToken) . '">
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
      </section>';

    return render_layout('Kamsis Secure Login', $content);
}

function render_welcome_page(string $username): string
{
    $content = '
      <section class="hero-card hero-card--compact">
        <p class="eyebrow">Autentikasi Berhasil</p>
        <h1>Selamat datang, ' . escape_html($username) . '</h1>
        <p class="lede">Session aktif tersimpan aman di cookie <code>HttpOnly</code> dan <code>SameSite=Strict</code>.</p>
        <form method="post" action="/logout.php">
          <input type="hidden" name="csrf_token" value="' . escape_html(csrf_token()) . '">
          <button type="submit">Logout</button>
        </form>
      </section>';

    return render_layout('Selamat Datang', $content);
}

function render_not_registered_page(): string
{
    $content = '
      <section class="hero-card hero-card--compact">
        <p class="eyebrow">Autentikasi Gagal</p>
        <h1>Anda belum terdaftar</h1>
        <p class="lede">
          Username/password tidak cocok. Halaman ini sengaja dibuat generik agar tidak membocorkan akun mana yang valid.
        </p>
        <a class="link-button" href="/">Kembali ke form</a>
      </section>';

    return render_layout('Anda Belum Terdaftar', $content);
}

function render_error_page(string $title, string $description): string
{
    $content = '
      <section class="hero-card hero-card--compact">
        <p class="eyebrow">Akses Ditolak</p>
        <h1>' . escape_html($title) . '</h1>
        <p class="lede">' . escape_html($description) . '</p>
        <a class="link-button" href="/">Kembali</a>
      </section>';

    return render_layout($title, $content);
}
