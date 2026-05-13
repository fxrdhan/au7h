<?php

declare(strict_types=1);

function escape_html(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8");
}

function render_flash(?array $flash): string
{
    if ($flash === null || !isset($flash["text"])) {
        return "";
    }

    $isSuccess = ($flash["type"] ?? "error") === "success";
    $className = $isSuccess
        ? "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-emerald-200"
        : "border-rose-200/80 bg-rose-50 text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/10 dark:text-rose-200";

    return '<div class="rounded-xl border px-4 py-3 text-sm font-medium shadow-xs ' .
        $className .
        '" role="status">' .
        escape_html((string) $flash["text"]) .
        "</div>";
}

function render_brand(bool $inverse = false, bool $showText = true): string
{
    $textClass = $inverse ? "text-zinc-50" : "text-foreground";
    $iconClass = $inverse ? "invert" : "dark:invert";
    $label = $showText
        ? '<span class="block translate-y-1 text-2xl font-extrabold leading-none">Au7h</span>'
        : "";
    $gapClass = $showText ? "gap-3" : "";

    return '
      <a href="/" class="inline-flex items-end ' .
        $gapClass .
        " text-sm font-semibold tracking-tight " .
        $textClass .
        '">
        <img src="/favicon.svg" alt="" aria-hidden="true" class="h-9 w-9 shrink-0 translate-y-0.75 ' .
        $iconClass .
        '">
        ' .
        $label .
        '
      </a>';
}

function render_auth_mark(): string
{
    return '
      <a href="/?mode=register" class="inline-flex items-end gap-2 text-sm font-semibold tracking-tight text-foreground dark:text-white">
        <img src="/favicon.svg" alt="" aria-hidden="true" class="h-5 w-5 shrink-0 translate-y-0.5 dark:invert">
        <span class="block translate-y-0.5 text-xl font-extrabold leading-none">Au7h</span>
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
        class="inline-flex h-10 w-10 items-center justify-center text-zinc-700 transition-colors duration-300 ease-(--theme-transition-ease) focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-400/45 dark:text-zinc-100 dark:focus-visible:ring-zinc-200/30"
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

function render_brand_controls(
    bool $compact = false,
    bool $alignRight = false,
    bool $showToggle = true,
    bool $showText = true,
): string {
    $brand = $compact ? render_auth_mark() : render_brand(false, $showText);
    if (!$showToggle) {
        return '<div class="inline-flex items-center gap-3">' .
            $brand .
            "</div>";
    }

    $toggle = render_theme_toggle_button();
    $content = $alignRight ? $toggle . $brand : $brand . $toggle;

    return '<div class="inline-flex items-center gap-3">' . $content . "</div>";
}

function render_auth_field(
    string $label,
    string $name,
    string $type,
    string $autocomplete,
    string $placeholder,
    ?string $hint = null,
    bool $required = true,
    string $inputAttributes = "",
    string $afterInputHtml = "",
): string {
    $requiredAttribute = $required ? " required" : "";
    $requiredIndicator = $required
        ? '<span class="ml-1 text-rose-500 dark:text-rose-300" aria-hidden="true">*</span>'
        : "";
    $hintMarkup =
        $hint === null
            ? ""
            : '<p class="mt-1.5 text-xs leading-4 text-muted-foreground dark:text-zinc-300">' .
                escape_html($hint) .
                "</p>";
    $extraInputAttributes =
        $inputAttributes === "" ? "" : " " . trim($inputAttributes);

    return '
      <div>
        <label class="mb-2.5 block text-[13px] font-semibold text-foreground dark:text-zinc-100" for="' .
        escape_html($name) .
        '">' .
        escape_html($label) .
        $requiredIndicator .
        '</label>
        <input
          id="' .
        escape_html($name) .
        '"
          name="' .
        escape_html($name) .
        '"
          type="' .
        escape_html($type) .
        '"
          autocomplete="' .
        escape_html($autocomplete) .
        '"
          placeholder="' .
        escape_html($placeholder) .
        '"
          class="flex h-10 w-full rounded-md border border-zinc-300 bg-white/92 px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.02)] outline-hidden placeholder:text-zinc-400 hover:border-zinc-500 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/45 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:hover:border-zinc-500 dark:focus:border-zinc-200 dark:focus:ring-zinc-100/45"' .
        $requiredAttribute .
        $extraInputAttributes .
        '
        >' .
        $hintMarkup .
        $afterInputHtml .
        '
      </div>';
}

function render_password_requirements(): string
{
    $requirements = [
        ["length", "10 characters long"],
        ["case", "Uppercase and lowercase"],
        ["number", "Number"],
    ];
    $items = "";

    foreach ($requirements as [$rule, $label]) {
        $items .=
            '
          <li data-password-rule="' .
            escape_html($rule) .
            '" class="flex items-center gap-2 text-xs leading-4 text-muted-foreground transition-colors dark:text-zinc-300">
            <span data-password-check aria-hidden="true" class="inline-flex h-4 w-4 shrink-0 scale-100 items-center justify-center rounded-[5px] border border-zinc-400 bg-white text-transparent transition-[background-color,border-color,color,transform] duration-200 ease-out dark:border-zinc-500 dark:bg-zinc-900">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3">
                <path data-password-check-path class="[stroke-dasharray:18] [stroke-dashoffset:18] transition-[stroke-dashoffset] duration-200 ease-out" d="M3.5 8.2 6.5 11 12.5 5"></path>
              </svg>
            </span>
            <span data-password-label class="relative inline-block transition-colors">
              ' .
            escape_html($label) .
            '
              <span data-password-strike aria-hidden="true" class="absolute left-0 right-0 top-1/2 h-px origin-left -translate-y-1/2 scale-x-0 bg-current transition-transform duration-200 ease-out"></span>
            </span>
          </li>';
    }

    return '
        <p id="password-requirements-hint" data-password-requirements-hint class="mt-1.5 max-h-8 translate-y-0 overflow-hidden text-xs leading-4 text-muted-foreground opacity-100 transition-[max-height,opacity,transform] duration-200 ease-out dark:text-zinc-300">
          Must be at least 10 characters long, with uppercase, lowercase, and number.
        </p>
        <ul id="password-requirements" data-password-requirements class="mt-0 max-h-0 translate-y-1 overflow-hidden pl-0.5 space-y-1.5 opacity-0 transition-[max-height,opacity,transform,margin] duration-200 ease-out" aria-label="Password requirements">
          ' .
        $items .
        '
        </ul>';
}

function render_confirm_password_status(): string
{
    return '
        <p data-confirm-password-status class="mt-1.5 flex max-h-0 -translate-y-1 items-center gap-1.5 overflow-hidden text-xs font-medium leading-4 opacity-0 transition-[max-height,opacity,transform,color] duration-200 ease-out" aria-live="polite">
          <span data-confirm-password-mark aria-hidden="true" class="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center">
            <svg data-confirm-password-icon="match" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="hidden h-3.5 w-3.5">
              <path d="M3.5 8.2 6.5 11 12.5 5"></path>
            </svg>
            <svg data-confirm-password-icon="mismatch" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5">
              <path d="M4.5 4.5 11.5 11.5"></path>
              <path d="M11.5 4.5 4.5 11.5"></path>
            </svg>
          </span>
          <span data-confirm-password-message>tidak cocok dengan password</span>
        </p>';
}

function render_layout(string $title, string $content): string
{
    return '<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>' .
        escape_html($title) .
        '</title>
    <script src="/theme.js"></script>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/styles.css">
    <script src="/vendor/matrix-animation.js" defer></script>
    <script src="/vendor/motion.js" defer></script>
    <script src="/matrix-rain.js" defer></script>
    <script src="/password-validation.js" defer></script>
    <script src="/page-shell.js" defer></script>
  </head>
  <body class="min-h-svh bg-white text-foreground dark:bg-zinc-950">
    <div class="relative min-h-svh overflow-hidden bg-white dark:bg-zinc-950">
      <div
        class="pointer-events-none fixed inset-0"
        data-matrix-rain
      ></div>
      <main id="page-shell-content" class="relative z-10 min-h-svh">
      ' .
        $content .
        '
      </main>
    </div>
  </body>
</html>';
}

function render_result_page_shell(
    string $innerContent,
    string $maxWidthClass = "max-w-xl",
): string {
    return '
      <section class="flex min-h-svh items-center justify-center p-6 md:p-10">
        <div data-page-surface="result-card" class="w-full ' .
        $maxWidthClass .
        ' rounded-4xl border border-white/70 bg-white/96 p-8 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.3)] backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-[0_30px_80px_-42px_rgba(0,0,0,0.82)] md:p-10">
          <div class="flex items-start justify-between gap-6">
            <div class="flex items-center justify-start">
              ' .
        render_brand(false, false) .
        '
            </div>
            <div class="shrink-0">
              ' .
        render_theme_toggle_button() .
        '
            </div>
          </div>
          <div class="mt-8">
            ' .
        $innerContent .
        '
          </div>
        </div>
      </section>';
}
