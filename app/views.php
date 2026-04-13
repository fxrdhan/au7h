<?php

declare(strict_types=1);

function render_flash(?array $flash): string
{
    if ($flash === null || !isset($flash['text'])) {
        return '';
    }

    $isSuccess = ($flash['type'] ?? 'error') === 'success';
    $className = $isSuccess
        ? 'border-emerald-200/80 bg-emerald-50 text-emerald-700'
        : 'border-rose-200/80 bg-rose-50 text-rose-700';

    return '<div class="rounded-xl border px-4 py-3 text-sm font-medium shadow-sm ' . $className . '" role="status">'
        . escape_html((string) $flash['text'])
        . '</div>';
}

function render_brand(bool $inverse = false): string
{
    $textClass = $inverse ? 'text-zinc-50' : 'text-foreground';
    $subTextClass = $inverse ? 'text-zinc-400' : 'text-muted-foreground';

    return '
      <a href="/" class="inline-flex items-center gap-3 text-sm font-semibold tracking-tight ' . $textClass . '">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-soft">K</span>
        <span class="flex flex-col leading-none">
          <span>Kamsis Secure Auth</span>
          <span class="mt-1 text-[11px] font-medium uppercase tracking-[0.22em] ' . $subTextClass . '">PHP + MySQL</span>
        </span>
      </a>';
}

function render_auth_mark(): string
{
    return '
      <a href="/?mode=register" class="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
        <span class="flex h-5 w-5 items-center justify-center rounded-md border border-zinc-300 text-[11px] leading-none text-zinc-900">K</span>
        <span>Acme Inc.</span>
      </a>';
}

function render_auth_placeholder(): string
{
    return '
      <div class="relative hidden min-h-svh overflow-hidden bg-zinc-100 lg:block">
        <div class="absolute inset-0 bg-[linear-gradient(to_right,transparent_0,transparent_calc(50%-0.5px),rgba(24,24,27,0.06)_calc(50%-0.5px),rgba(24,24,27,0.06)_calc(50%+0.5px),transparent_calc(50%+0.5px)),linear-gradient(to_bottom,transparent_0,transparent_calc(50%-0.5px),rgba(24,24,27,0.06)_calc(50%-0.5px),rgba(24,24,27,0.06)_calc(50%+0.5px),transparent_calc(50%+0.5px))]"></div>
        <div class="absolute left-1/2 top-1/2 h-[248px] w-[248px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-300/90"></div>
        <div class="absolute left-1/2 top-1/2 h-[168px] w-[168px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-300/90"></div>
        <div class="absolute left-1/2 top-1/2 h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-300 bg-white shadow-sm"></div>
        <div class="absolute left-1/2 top-1/2 h-px w-[346px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-zinc-300/90"></div>
        <div class="absolute left-1/2 top-1/2 h-px w-[346px] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-zinc-300/90"></div>
        <div class="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500">
          <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3.5" y="5.5" width="17" height="13" rx="2"></rect>
            <path d="m7 14 3-3 3 3 4-4 3 3"></path>
            <circle cx="16.5" cy="9.5" r="1"></circle>
          </svg>
        </div>
      </div>';
}

function render_auth_field(
    string $label,
    string $name,
    string $type,
    string $autocomplete,
    string $placeholder,
    ?string $hint = null,
    bool $required = true
): string {
    $requiredAttribute = $required ? ' required' : '';
    $hintMarkup = $hint === null ? '' : '<p class="pt-2 text-xs leading-5 text-muted-foreground">' . escape_html($hint) . '</p>';

    return '
      <div class="space-y-2.5">
        <label class="block text-[13px] font-semibold text-foreground" for="' . escape_html($name) . '">' . escape_html($label) . '</label>
        <input
          id="' . escape_html($name) . '"
          name="' . escape_html($name) . '"
          type="' . escape_html($type) . '"
          autocomplete="' . escape_html($autocomplete) . '"
          placeholder="' . escape_html($placeholder) . '"
          class="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.02)] outline-none transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200/70"' . $requiredAttribute . '
        >' . $hintMarkup . '
      </div>';
}

function render_auth_form_card(string $mode, ?array $flash): string
{
    $csrfToken = csrf_token();
    $isRegister = $mode === 'register';
    $title = $isRegister ? 'Create your account' : 'Sign in to your account';
    $description = $isRegister
        ? 'Fill in the form below to create your account'
        : 'Enter your credentials below to sign in to your account';
    $action = $isRegister ? '/register.php' : '/login.php';
    $submitLabel = $isRegister ? 'Create Account' : 'Sign In';
    $switchHref = $isRegister ? '/?mode=login' : '/?mode=register';
    $switchLabel = $isRegister ? 'Already have an account?' : 'Don\'t have an account?';
    $switchAction = $isRegister ? 'Sign in' : 'Create one';
    $passwordAutocomplete = $isRegister ? 'new-password' : 'current-password';
    $switchText = $isRegister ? 'sign in' : 'register';
    $topMarginClass = $flash === null ? 'mt-0' : 'mt-4';

    $emailField = $isRegister
        ? render_auth_field(
            'Email',
            'contact_email',
            'email',
            'email',
            'm@example.com',
            'Optional untuk tampilan. Tidak dipakai pada proses login demo ini.',
            false
        )
        : '';

    $confirmField = $isRegister
        ? render_auth_field(
            'Confirm Password',
            'confirm_password',
            'password',
            'new-password',
            '',
            'Please confirm your password.'
        )
        : '';

    return '
      <div class="w-full max-w-sm">
        <div class="space-y-1 text-left">
          <h1 class="text-[2rem] font-semibold tracking-[-0.035em] text-zinc-950">' . escape_html($title) . '</h1>
          <p class="text-sm text-muted-foreground">' . escape_html($description) . '</p>
        </div>
        <div class="' . $topMarginClass . '">' . render_flash($flash) . '</div>
        <form class="mt-8 space-y-6" method="post" action="' . escape_html($action) . '" autocomplete="off">
          <input type="hidden" name="csrf_token" value="' . escape_html($csrfToken) . '">
          ' . render_auth_field(
              'Full Name',
              'username',
              'text',
              'name',
              'John Doe',
              $isRegister ? 'Nama ini dipakai sebagai username saat halaman welcome ditampilkan.' : null
          ) . '
          ' . $emailField . '
          ' . render_auth_field(
              'Password',
              'password',
              'password',
              $passwordAutocomplete,
              '',
              $isRegister ? 'Must be at least 10 characters long, with uppercase, lowercase, and number.' : null
          ) . '
          ' . $confirmField . '
          <button
            class="inline-flex h-10 w-full items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-300"
            type="submit"
          >' . escape_html($submitLabel) . '</button>
        </form>
        <p class="mt-4 text-center text-sm text-muted-foreground">
          ' . escape_html($switchLabel) . '
          <a class="font-medium text-foreground underline underline-offset-4" href="' . escape_html($switchHref) . '">' . escape_html($switchAction) . '</a>
        </p>
      </div>';
}

function render_layout(string $title, string $content): string
{
    return '<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>' . escape_html($title) . '</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body class="min-h-screen bg-background text-foreground">
    <main>
      ' . $content . '
    </main>
  </body>
</html>';
}

function render_auth_page(?array $flash, string $mode = 'register'): string
{
    $mode = in_array($mode, ['register', 'login'], true) ? $mode : 'register';

    $content = '
      <section class="grid min-h-svh bg-white lg:grid-cols-2">
        <div class="flex min-h-svh flex-col p-7 md:p-8">
          <div class="flex items-center justify-start">
            ' . render_auth_mark() . '
          </div>
          <div class="flex flex-1 items-center justify-center">
            ' . render_auth_form_card($mode, $flash) . '
          </div>
        </div>
        ' . render_auth_placeholder() . '
      </section>';

    return render_layout('Kamsis Secure Login', $content);
}

function render_welcome_page(string $username): string
{
    $content = '
      <section class="flex min-h-svh items-center justify-center bg-muted/40 p-6 md:p-10">
        <div class="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border bg-background shadow-soft lg:grid-cols-[1.15fr_0.85fr]">
          <div class="relative overflow-hidden bg-zinc-950 p-8 text-zinc-50 md:p-10">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_26%),linear-gradient(155deg,#09090b_10%,#18181b_52%,#27272a_100%)]"></div>
            <div class="relative flex h-full flex-col justify-between gap-10">
              <div class="space-y-5">
                ' . render_brand(true) . '
                <div class="space-y-3">
                  <p class="text-sm font-medium uppercase tracking-[0.24em] text-zinc-400">Autentikasi Berhasil</p>
                  <h1 class="text-4xl font-semibold tracking-tight">Selamat datang, ' . escape_html($username) . '</h1>
                  <p class="max-w-xl text-sm leading-7 text-zinc-300">
                    Session kamu sudah aktif dan disimpan aman memakai cookie <span class="font-medium text-white">HttpOnly</span>,
                    <span class="font-medium text-white">Secure</span>, dan <span class="font-medium text-white">SameSite=Strict</span>.
                  </p>
                </div>
              </div>
              <div class="rounded-3xl border border-white/10 bg-white/10 p-6 text-sm leading-7 text-zinc-200 backdrop-blur">
                Username berhasil didekripsi dari data terenkripsi di database, jadi landing page tetap personal tanpa menyimpan
                data akun dalam bentuk asli.
              </div>
            </div>
          </div>

          <div class="flex items-center p-8 md:p-10">
            <div class="w-full space-y-6">
              <div class="space-y-2">
                <p class="text-sm font-medium text-muted-foreground">Status sistem</p>
                <h2 class="text-2xl font-semibold tracking-tight">Akun valid dan sesi aktif</h2>
                <p class="text-sm leading-6 text-muted-foreground">
                  Halaman ini menjadi bukti bahwa proses login, verifikasi password, dan pembacaan user dari MySQL berjalan normal.
                </p>
              </div>
              <div class="grid gap-3 text-sm text-muted-foreground">
                <div class="rounded-2xl border bg-card px-4 py-3">HTTPS aktif dan tersaji dengan sertifikat trusted untuk localhost.</div>
                <div class="rounded-2xl border bg-card px-4 py-3">Query user dilakukan dengan prepared statement PDO MySQL.</div>
                <div class="rounded-2xl border bg-card px-4 py-3">Input/output dibatasi dan di-escape untuk membantu mitigasi abuse dan XSS.</div>
              </div>
              <form method="post" action="/logout.php">
                <input type="hidden" name="csrf_token" value="' . escape_html(csrf_token()) . '">
                <button class="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-95" type="submit">Logout</button>
              </form>
            </div>
          </div>
        </div>
      </section>';

    return render_layout('Selamat Datang', $content);
}

function render_not_registered_page(): string
{
    $content = '
      <section class="flex min-h-svh items-center justify-center bg-muted/40 p-6 md:p-10">
        <div class="w-full max-w-2xl rounded-[2rem] border bg-background p-8 shadow-soft md:p-10">
          <div class="space-y-4">
            <div class="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Autentikasi Gagal
            </div>
            <h1 class="text-3xl font-semibold tracking-tight md:text-4xl">Anda belum terdaftar</h1>
            <p class="text-sm leading-7 text-muted-foreground">
              Username/password tidak cocok. Halaman ini sengaja tetap generik agar tidak membocorkan akun mana yang valid.
            </p>
          </div>
          <div class="mt-8 rounded-2xl border bg-muted/40 p-5 text-sm leading-7 text-muted-foreground">
            Kalau ingin lanjut ngetes, kembali ke form lalu coba register akun baru atau login dengan kredensial yang benar.
          </div>
          <div class="mt-8">
            <a class="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-95" href="/">Kembali ke form</a>
          </div>
        </div>
      </section>';

    return render_layout('Anda Belum Terdaftar', $content);
}

function render_error_page(string $title, string $description): string
{
    $content = '
      <section class="flex min-h-svh items-center justify-center bg-muted/40 p-6 md:p-10">
        <div class="w-full max-w-xl rounded-[2rem] border bg-background p-8 shadow-soft md:p-10">
          <div class="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Akses Ditolak
          </div>
          <h1 class="mt-4 text-3xl font-semibold tracking-tight">' . escape_html($title) . '</h1>
          <p class="mt-3 text-sm leading-7 text-muted-foreground">' . escape_html($description) . '</p>
          <a class="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-95" href="/">Kembali</a>
        </div>
      </section>';

    return render_layout($title, $content);
}
