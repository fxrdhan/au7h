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
    $iconStyle = $inverse ? ' style="filter: invert(1);"' : '';

    return '
      <a href="/" class="inline-flex items-center gap-3 text-sm font-semibold tracking-tight ' . $textClass . '">
        <img src="/favicon.svg" alt="" aria-hidden="true" class="h-9 w-9 shrink-0"' . $iconStyle . '>
        <span>Au7h</span>
      </a>';
}

function render_auth_mark(): string
{
    return '
      <a href="/?mode=register" class="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
        <img src="/favicon.svg" alt="" aria-hidden="true" class="h-5 w-5 shrink-0">
        <span>Au7h</span>
      </a>';
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
          class="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.02)] outline-none transition placeholder:text-zinc-400 hover:border-zinc-500 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-500/45"' . $requiredAttribute . '
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
    $topMarginClass = $flash === null ? 'mt-0' : 'mt-4';

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
              'Username',
              'username',
              'text',
              'username',
              'johndoe'
          ) . '
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
    <script src="/vendor/matrix-animation.js" defer></script>
    <script src="/vendor/motion.js" defer></script>
    <script src="/matrix-rain.js" defer></script>
    <script src="/page-shell.js" defer></script>
  </head>
  <body class="min-h-screen bg-white text-foreground">
    <div class="relative min-h-screen overflow-hidden bg-white">
      <div
        class="pointer-events-none fixed inset-0"
        data-matrix-rain
        data-rain-background="#ffffff"
        data-rain-fade-color="rgba(255,255,255,0.03)"
        data-rain-erase-color="#ffffff"
        data-rain-color="rgba(24,24,27,0.74)"
        data-rain-head-color="rgba(9,9,11,0.88)"
      ></div>
      <main id="page-shell-content" class="relative z-10 min-h-screen">
      ' . $content . '
      </main>
    </div>
  </body>
</html>';
}

function render_auth_page(?array $flash, string $mode = 'register'): string
{
    $mode = in_array($mode, ['register', 'login'], true) ? $mode : 'register';
    $isRegister = $mode === 'register';
    $registerPanel = '
      <div data-auth-panel="register" class="' . ($isRegister ? 'block' : 'hidden lg:block') . ' relative min-h-svh bg-white p-7 md:p-8">
        <div class="absolute left-7 top-7 flex items-center justify-start md:left-8 md:top-8">
          ' . render_auth_mark() . '
        </div>
        <div class="flex min-h-svh items-center justify-center py-20">
          ' . render_auth_form_card('register', $isRegister ? $flash : null) . '
        </div>
      </div>';
    $loginPanel = '
      <div data-auth-panel="login" class="' . (!$isRegister ? 'block' : 'hidden lg:block') . ' relative min-h-svh bg-white p-7 md:p-8">
        <div class="absolute right-7 top-7 flex items-center justify-end md:right-8 md:top-8">
          ' . render_auth_mark() . '
        </div>
        <div class="flex min-h-svh items-center justify-center py-20">
          ' . render_auth_form_card('login', !$isRegister ? $flash : null) . '
        </div>
      </div>';
    $matrixSide = '<div class="hidden min-h-svh lg:block"></div>';

    $content = '
      <section class="grid min-h-svh lg:grid-cols-2" data-auth-layout="split" data-auth-mode="' . escape_html($mode) . '">
        ' . ($isRegister ? $registerPanel . $matrixSide : $matrixSide . $loginPanel) . '
      </section>';

    return render_layout('Au7h Login', $content);
}

function render_welcome_page(string $username): string
{
    $content = '
      <section class="flex min-h-svh items-center justify-center p-6 md:p-10">
        <div class="w-full max-w-2xl rounded-[2rem] bg-white/[0.99] p-8 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.3)] backdrop-blur-lg md:p-10">
          <div class="flex items-start justify-between gap-6">
            <div class="space-y-6">
              <div class="flex items-center justify-start">
                ' . render_brand(false) . '
              </div>
              <h1 class="text-4xl font-semibold tracking-tight text-zinc-950">Welcome, ' . escape_html($username) . '!</h1>
            </div>
            <form method="post" action="/logout.php" class="shrink-0 pt-1">
              <input type="hidden" name="csrf_token" value="' . escape_html(csrf_token()) . '">
              <button class="inline-flex h-9 items-center justify-center rounded-full px-3 text-sm font-medium text-rose-500 transition hover:bg-rose-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-rose-300" type="submit">Logout</button>
            </form>
          </div>
        </div>
      </section>';

    return render_layout('Welcome | Au7h', $content);
}

function render_not_registered_page(): string
{
    $content = '
      <section class="flex min-h-svh items-center justify-center p-6 md:p-10">
        <div class="w-full max-w-xl rounded-[2rem] bg-white/[0.99] p-8 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.3)] backdrop-blur-lg md:p-10">
          <div class="space-y-4">
            <h1 class="text-3xl font-semibold tracking-tight md:text-4xl">You are not registered yet</h1>
            <p class="text-sm leading-6 text-muted-foreground">
              <span class="block">The username or password is incorrect.</span>
              <span class="block">Try logging in again or create a new account.</span>
            </p>
          </div>
          <div class="mt-8">
            <a class="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white transition hover:bg-zinc-800" href="/">Back to form</a>
          </div>
        </div>
      </section>';

    return render_layout('Not Registered Yet', $content);
}

function render_error_page(string $title, string $description): string
{
    $content = '
      <section class="flex min-h-svh items-center justify-center p-6 md:p-10">
        <div class="w-full max-w-xl rounded-[2rem] bg-white/[0.99] p-8 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.3)] backdrop-blur-lg md:p-10">
          <p class="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">Access denied</p>
          <h1 class="mt-4 text-3xl font-semibold tracking-tight">' . escape_html($title) . '</h1>
          <p class="mt-3 text-sm leading-7 text-muted-foreground">' . escape_html($description) . '</p>
          <a class="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white transition hover:bg-zinc-800" href="/">Back</a>
        </div>
      </section>';

    return render_layout($title, $content);
}
