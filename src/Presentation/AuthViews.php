<?php

declare(strict_types=1);

function render_auth_form_card(string $mode, ?array $flash): string
{
    $csrfToken = csrf_token();
    $isRegister = $mode === "register";
    $title = $isRegister ? "Create your account" : "Sign in to your account";
    $description = $isRegister
        ? "Fill in the form below to create your account"
        : "Enter your credentials below to sign in to your account";
    $action = $isRegister ? "/register.php" : "/login.php";
    $submitLabel = $isRegister ? "Create Account" : "Sign In";
    $switchHref = $isRegister ? "/?mode=login" : "/?mode=register";
    $switchLabel = $isRegister
        ? "Already have an account?"
        : 'Don\'t have an account?';
    $switchAction = $isRegister ? "Sign in" : "Create one";
    $passwordAutocomplete = $isRegister ? "new-password" : "current-password";
    $topMarginClass = $flash === null ? "mt-0" : "mt-4";
    $oldInput = is_array($flash["old"] ?? null) ? $flash["old"] : [];
    $usernameValue = isset($oldInput["username"])
        ? (string) $oldInput["username"]
        : "";

    $confirmField = $isRegister
        ? render_auth_field(
            "Confirm Password",
            "confirm_password",
            "password",
            "new-password",
            "",
            "",
            null,
            true,
            "data-confirm-password-input",
            render_confirm_password_status(),
        )
        : "";

    return '
      <div class="w-full max-w-sm text-foreground dark:text-zinc-100">
        <div class="space-y-1 text-left">
          <h1 class="text-[2rem] font-semibold tracking-[-0.035em] text-foreground dark:text-white">' .
        escape_html($title) .
        '</h1>
          <p class="text-sm text-muted-foreground dark:text-zinc-200">' .
        escape_html($description) .
        '</p>
        </div>
        <div class="' .
        $topMarginClass .
        '">' .
        render_flash($flash) .
        '</div>
        <form class="mt-8 space-y-6" method="post" action="' .
        escape_html($action) .
        '" autocomplete="off">
          <input type="hidden" name="csrf_token" value="' .
        escape_html($csrfToken) .
        '">
          ' .
        render_auth_field(
            "Username",
            "username",
            "text",
            "username",
            "johndoe",
            $usernameValue,
            null,
            true,
            $isRegister
                ? 'data-username-input aria-describedby="username-validation-status"'
                : "",
            $isRegister ? render_username_status() : "",
        ) .
        '
          ' .
        render_auth_field(
            "Password",
            "password",
            "password",
            $passwordAutocomplete,
            "",
            "",
            null,
            true,
            $isRegister
                ? 'data-password-input aria-describedby="password-requirements"'
                : "",
            $isRegister ? render_password_requirements() : "",
        ) .
        '
          ' .
        $confirmField .
        '
          <button
            class="inline-flex h-10 w-full items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-zinc-300 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 dark:focus:ring-zinc-400/30"
            type="submit"
          >' .
        escape_html($submitLabel) .
        '</button>
        </form>
        <p class="mt-4 text-center text-sm text-muted-foreground dark:text-zinc-300">
          ' .
        escape_html($switchLabel) .
        '
          <a class="font-medium text-foreground underline underline-offset-4 dark:text-white" href="' .
        escape_html($switchHref) .
        '">' .
        escape_html($switchAction) .
        '</a>
        </p>
      </div>';
}

function render_auth_page(?array $flash, string $mode = "register"): string
{
    $mode = in_array($mode, ["register", "login"], true) ? $mode : "register";
    $isRegister = $mode === "register";
    $registerPanel =
        '
      <div data-auth-panel="register" data-page-surface="auth-panel" class="' .
        ($isRegister ? "block" : "hidden lg:block") .
        ' relative flex min-h-svh flex-col bg-white p-7 dark:bg-zinc-950 md:p-8">
        <div class="absolute left-7 top-7 flex items-center justify-start md:left-8 md:top-8">
          ' .
        render_brand_controls(true, false, false) .
        '
        </div>
        <div class="absolute right-7 top-7 flex items-center justify-end md:right-8 md:top-8">
          ' .
        render_theme_toggle_button() .
        '
        </div>
        <div class="flex flex-1 items-center justify-center py-20">
          ' .
        render_auth_form_card("register", $isRegister ? $flash : null) .
        '
        </div>
      </div>';
    $loginPanel =
        '
      <div data-auth-panel="login" data-page-surface="auth-panel" class="' .
        (!$isRegister ? "block" : "hidden lg:block") .
        ' relative flex min-h-svh flex-col bg-white p-7 dark:bg-zinc-950 md:p-8">
        <div class="absolute left-7 top-7 flex items-center justify-start md:left-8 md:top-8">
          ' .
        render_theme_toggle_button() .
        '
        </div>
        <div class="absolute right-7 top-7 flex items-center justify-end md:right-8 md:top-8">
          ' .
        render_brand_controls(true, true, false) .
        '
        </div>
        <div class="flex flex-1 items-center justify-center py-20">
          ' .
        render_auth_form_card("login", !$isRegister ? $flash : null) .
        '
        </div>
      </div>';
    $matrixSide = '<div class="hidden min-h-svh lg:block"></div>';

    $content =
        '
      <section class="grid min-h-svh lg:grid-cols-2" data-auth-layout="split" data-auth-mode="' .
        escape_html($mode) .
        '">
        ' .
        ($isRegister
            ? $registerPanel . $matrixSide
            : $matrixSide . $loginPanel) .
        '
      </section>';

    return render_layout("Au7h Login", $content);
}
