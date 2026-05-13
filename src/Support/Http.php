<?php

declare(strict_types=1);

function client_address(): string
{
    return (string) ($_SERVER["REMOTE_ADDR"] ?? "unknown");
}

function start_secure_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $config = app_config();

    session_name($config["session_name"]);
    session_set_cookie_params([
        "lifetime" => $config["session_ttl"],
        "path" => "/",
        "secure" => true,
        "httponly" => true,
        "samesite" => "Strict",
    ]);

    session_start();
}

function send_security_headers(): void
{
    header_remove("X-Powered-By");
    header("Cache-Control: no-store");
}

function ensure_app_booted(): void
{
    static $booted = false;

    if ($booted) {
        return;
    }

    start_secure_session();
    send_security_headers();
    initialize_database();
    $booted = true;
}

function request_method_is(string $method): bool
{
    return strtoupper($_SERVER["REQUEST_METHOD"] ?? "") === strtoupper($method);
}

function redirect_to(string $path): never
{
    header("Location: " . $path, true, 302);
    exit();
}

function set_flash(string $type, string $message): void
{
    $_SESSION["flash"] = [
        "type" => $type,
        "text" => $message,
    ];
}

function pull_flash(): ?array
{
    if (!isset($_SESSION["flash"])) {
        return null;
    }

    $flash = $_SESSION["flash"];
    unset($_SESSION["flash"]);

    return $flash;
}

function current_user(): ?array
{
    $userId = $_SESSION["user_id"] ?? null;
    if (!is_int($userId) && !ctype_digit((string) $userId)) {
        return null;
    }

    return find_user_by_id((int) $userId);
}

function require_login(): array
{
    $user = current_user();
    if ($user === null) {
        redirect_to("/");
    }

    return $user;
}

function render_page_response(int $statusCode, string $html): never
{
    http_response_code($statusCode);
    header("Content-Type: text/html; charset=UTF-8");
    echo $html;
    exit();
}

function require_post_method(): void
{
    if (!request_method_is("POST")) {
        render_page_response(
            405,
            render_error_page(
                "Metode tidak diizinkan",
                "Gunakan request POST untuk aksi ini.",
            ),
        );
    }
}
