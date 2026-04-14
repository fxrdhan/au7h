<?php

declare(strict_types=1);

function render_flash(?array $flash): string
{
    if ($flash === null || !isset($flash['text'])) {
        return '';
    }

    $isSuccess = ($flash['type'] ?? 'error') === 'success';
    $className = $isSuccess
        ? 'border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-emerald-200'
        : 'border-rose-200/80 bg-rose-50 text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/10 dark:text-rose-200';

    return '<div class="rounded-xl border px-4 py-3 text-sm font-medium shadow-sm ' . $className . '" role="status">'
        . escape_html((string) $flash['text'])
        . '</div>';
}

function render_brand(bool $inverse = false, bool $showText = true): string
{
    $textClass = $inverse ? 'text-zinc-50' : 'text-foreground';
    $iconClass = $inverse ? 'invert' : 'dark:invert';
    $label = $showText
        ? '<span class="block translate-y-[4px] font-extrabold leading-none">Au7h</span>'
        : '';
    $gapClass = $showText ? 'gap-3' : '';

    return '
      <a href="/" class="inline-flex items-end ' . $gapClass . ' text-sm font-semibold tracking-tight ' . $textClass . '">
        <img src="/favicon.svg" alt="" aria-hidden="true" class="h-9 w-9 shrink-0 translate-y-[3px] ' . $iconClass . '">
        ' . $label . '
      </a>';
}

function render_auth_mark(): string
{
    return '
      <a href="/?mode=register" class="inline-flex items-end gap-2 text-sm font-semibold tracking-tight text-foreground dark:text-white">
        <img src="/favicon.svg" alt="" aria-hidden="true" class="h-5 w-5 shrink-0 translate-y-[2px] dark:invert">
        <span class="block translate-y-[2px] font-extrabold leading-none">Au7h</span>
      </a>';
}

function render_theme_toggle_button(): string
{
    return '
      <button
        type="button"
        data-theme-toggle
        aria-label="Toggle color theme"
        title="Toggle color theme"
        class="inline-flex h-10 w-10 items-center justify-center text-zinc-700 transition-colors duration-300 ease-[var(--theme-transition-ease)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/45 dark:text-zinc-100 dark:focus-visible:ring-zinc-200/30"
      >
        <span class="relative h-5 w-5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" data-theme-toggle-icon class="theme-toggle-icon theme-toggle-icon-sun">
            <circle cx="12" cy="12" r="4.25"></circle>
            <path d="M12 2.75v2.5"></path>
            <path d="M12 18.75v2.5"></path>
            <path d="m4.93 4.93 1.77 1.77"></path>
            <path d="m17.3 17.3 1.77 1.77"></path>
            <path d="M2.75 12h2.5"></path>
            <path d="M18.75 12h2.5"></path>
            <path d="m4.93 19.07 1.77-1.77"></path>
            <path d="m17.3 6.7 1.77-1.77"></path>
          </svg>
          <svg viewBox="0 0 24 24" fill="currentColor" data-theme-toggle-icon class="theme-toggle-icon theme-toggle-icon-moon">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M9.53 1.72c0.21 0.21 0.28 0.54 0.16 0.82A8.96 8.96 0 0 0 9 6c0 4.97 4.03 9 9 9 1.23 0 2.4-0.25 3.46-0.69 0.28-0.12 0.6-0.05 0.82 0.16 0.21 0.21 0.28 0.54 0.16 0.82A10.53 10.53 0 0 1 12.75 21.75c-5.8 0-10.5-4.7-10.5-10.5 0-4.37 2.67-8.11 6.46-9.69 0.28-0.12 0.6-0.05 0.82 0.16z"></path>
          </svg>
        </span>
      </button>';
}

function render_brand_controls(bool $compact = false, bool $alignRight = false, bool $showToggle = true, bool $showText = true): string
{
    $brand = $compact ? render_auth_mark() : render_brand(false, $showText);
    if (!$showToggle) {
        return '<div class="inline-flex items-center gap-3">' . $brand . '</div>';
    }

    $toggle = render_theme_toggle_button();
    $content = $alignRight ? $toggle . $brand : $brand . $toggle;

    return '<div class="inline-flex items-center gap-3">' . $content . '</div>';
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
    $hintMarkup = $hint === null ? '' : '<p class="pt-2 text-xs leading-5 text-muted-foreground dark:text-zinc-300">' . escape_html($hint) . '</p>';

    return '
      <div class="space-y-2.5">
        <label class="block text-[13px] font-semibold text-foreground dark:text-zinc-100" for="' . escape_html($name) . '">' . escape_html($label) . '</label>
        <input
          id="' . escape_html($name) . '"
          name="' . escape_html($name) . '"
          type="' . escape_html($type) . '"
          autocomplete="' . escape_html($autocomplete) . '"
          placeholder="' . escape_html($placeholder) . '"
          class="flex h-10 w-full rounded-md border border-zinc-300 bg-white/92 px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.02)] outline-none placeholder:text-zinc-400 hover:border-zinc-500 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-500/45 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:hover:border-zinc-500 dark:focus:border-zinc-100 dark:focus:ring-zinc-200/25"' . $requiredAttribute . '
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
      <div class="w-full max-w-sm text-foreground dark:text-zinc-100">
        <div class="space-y-1 text-left">
          <h1 class="text-[2rem] font-semibold tracking-[-0.035em] text-foreground dark:text-white">' . escape_html($title) . '</h1>
          <p class="text-sm text-muted-foreground dark:text-zinc-200">' . escape_html($description) . '</p>
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
            class="inline-flex h-10 w-full items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 dark:focus:ring-zinc-400/30"
            type="submit"
          >' . escape_html($submitLabel) . '</button>
        </form>
        <p class="mt-4 text-center text-sm text-muted-foreground dark:text-zinc-300">
          ' . escape_html($switchLabel) . '
          <a class="font-medium text-foreground underline underline-offset-4 dark:text-white" href="' . escape_html($switchHref) . '">' . escape_html($switchAction) . '</a>
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
    <script src="/theme.js"></script>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/styles.css">
    <script src="/vendor/matrix-animation.js" defer></script>
    <script src="/vendor/motion.js" defer></script>
    <script src="/matrix-rain.js" defer></script>
    <script src="/page-shell.js" defer></script>
  </head>
  <body class="min-h-screen bg-white text-foreground dark:bg-zinc-950">
    <div class="relative min-h-screen overflow-hidden bg-white dark:bg-zinc-950">
      <div
        class="pointer-events-none fixed inset-0"
        data-matrix-rain
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
      <div data-auth-panel="register" data-page-surface="auth-panel" class="' . ($isRegister ? 'block' : 'hidden lg:block') . ' relative min-h-svh bg-white p-7 dark:bg-zinc-950 md:p-8">
        <div class="absolute left-7 top-7 flex items-center justify-start md:left-8 md:top-8">
          ' . render_brand_controls(true, false, false) . '
        </div>
        <div class="absolute right-7 top-7 flex items-center justify-end md:right-8 md:top-8">
          ' . render_theme_toggle_button() . '
        </div>
        <div class="flex min-h-svh items-center justify-center py-20">
          ' . render_auth_form_card('register', $isRegister ? $flash : null) . '
        </div>
      </div>';
    $loginPanel = '
      <div data-auth-panel="login" data-page-surface="auth-panel" class="' . (!$isRegister ? 'block' : 'hidden lg:block') . ' relative min-h-svh bg-white p-7 dark:bg-zinc-950 md:p-8">
        <div class="absolute left-7 top-7 flex items-center justify-start md:left-8 md:top-8">
          ' . render_theme_toggle_button() . '
        </div>
        <div class="absolute right-7 top-7 flex items-center justify-end md:right-8 md:top-8">
          ' . render_brand_controls(true, true, false) . '
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
        <div data-page-surface="result-card" class="w-full max-w-2xl rounded-[2rem] border border-white/70 bg-white/[0.96] p-8 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.3)] backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-[0_30px_80px_-42px_rgba(0,0,0,0.82)] md:p-10">
          <div class="flex flex-col">
            <div class="flex items-start justify-between gap-6">
              <div class="flex items-center justify-start">
                ' . render_brand_controls(false, false, false, false) . '
              </div>
              <div class="shrink-0">
                ' . render_theme_toggle_button() . '
              </div>
            </div>
            <div class="mt-8">
              <h1 class="text-4xl font-semibold tracking-tight text-foreground dark:text-white">Welcome, ' . escape_html($username) . '!</h1>
            </div>
            <form method="post" action="/logout.php" class="mt-10">
              <input type="hidden" name="csrf_token" value="' . escape_html(csrf_token()) . '">
              <button class="inline-flex h-11 items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50 px-5 text-sm font-medium text-rose-700 hover:bg-rose-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-rose-300 dark:border-rose-500/35 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500 dark:hover:text-white dark:focus:ring-rose-400/35" type="submit">Logout</button>
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
        <div data-page-surface="result-card" class="w-full max-w-xl rounded-[2rem] border border-white/70 bg-white/[0.96] p-8 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.3)] backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-[0_30px_80px_-42px_rgba(0,0,0,0.82)] md:p-10">
          <div class="flex items-start justify-between gap-6">
            <div class="flex items-center justify-start">
              ' . render_brand_controls(false, false, false, false) . '
            </div>
            <div class="shrink-0">
              ' . render_theme_toggle_button() . '
            </div>
          </div>
          <div class="mt-8 space-y-4">
            <h1 class="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">You are not registered yet</h1>
            <p class="text-sm leading-6 text-muted-foreground">
              <span class="block">The username or password is incorrect.</span>
              <span class="block">Try logging in again or create a new account.</span>
            </p>
          </div>
          <div class="mt-8">
            <a class="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200" href="/?mode=register">Back to form</a>
          </div>
        </div>
      </section>';

    return render_layout('Not Registered Yet', $content);
}

function render_error_page(string $title, string $description): string
{
    $content = '
      <section class="flex min-h-svh items-center justify-center p-6 md:p-10">
        <div class="w-full max-w-xl rounded-[2rem] border border-white/70 bg-white/[0.96] p-8 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.3)] backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-[0_30px_80px_-42px_rgba(0,0,0,0.82)] md:p-10">
          <div class="flex items-center justify-start">
            ' . render_brand_controls(false, false) . '
          </div>
          <p class="mt-8 text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">Access denied</p>
          <h1 class="mt-4 text-3xl font-semibold tracking-tight text-foreground">' . escape_html($title) . '</h1>
          <p class="mt-3 text-sm leading-7 text-muted-foreground">' . escape_html($description) . '</p>
          <a class="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200" href="/">Back</a>
        </div>
      </section>';

    return render_layout($title, $content);
}
