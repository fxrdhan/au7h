<?php

declare(strict_types=1);

const APP_ROOT = __DIR__ . '/..';

function env_string(string $name, string $fallback): string
{
    $value = getenv($name);

    return $value === false || $value === '' ? $fallback : $value;
}

function app_config(): array
{
    static $config = null;

    if ($config !== null) {
        return $config;
    }

    $dataDir = env_string('APP_DATA_DIR', APP_ROOT . '/data');
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0700, true);
    }

    $config = [
        'db_path' => env_string('DB_PATH', $dataDir . '/auth.db'),
        'pepper_secret' => env_string('PEPPER_SECRET', 'replace-me-demo-pepper'),
        'encryption_key' => hash('sha256', env_string('ENCRYPTION_KEY', 'replace-me-demo-key'), true),
        'rate_limit_max_attempts' => 10,
        'rate_limit_window_seconds' => 600,
        'session_name' => 'kamsis_sid',
        'session_ttl' => 1800,
    ];

    return $config;
}

require_once APP_ROOT . '/app/database.php';
require_once APP_ROOT . '/app/security.php';
require_once APP_ROOT . '/app/views.php';

function start_secure_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $config = app_config();

    session_name($config['session_name']);
    session_set_cookie_params([
        'lifetime' => $config['session_ttl'],
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);

    session_start();
}

function send_security_headers(): void
{
    header_remove('X-Powered-By');
    header('Cache-Control: no-store');
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
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? '') === strtoupper($method);
}

function redirect_to(string $path): never
{
    header('Location: ' . $path, true, 302);
    exit;
}

function set_flash(string $type, string $message): void
{
    $_SESSION['flash'] = [
        'type' => $type,
        'text' => $message,
    ];
}

function pull_flash(): ?array
{
    if (!isset($_SESSION['flash'])) {
        return null;
    }

    $flash = $_SESSION['flash'];
    unset($_SESSION['flash']);

    return $flash;
}

function current_user(): ?array
{
    $userId = $_SESSION['user_id'] ?? null;
    if (!is_int($userId) && !ctype_digit((string) $userId)) {
        return null;
    }

    return find_user_by_id((int) $userId);
}

function require_login(): array
{
    $user = current_user();
    if ($user === null) {
        redirect_to('/');
    }

    return $user;
}

function render_page_response(int $statusCode, string $html): never
{
    http_response_code($statusCode);
    header('Content-Type: text/html; charset=UTF-8');
    echo $html;
    exit;
}

function require_post_method(): void
{
    if (!request_method_is('POST')) {
        render_page_response(405, render_error_page('Metode tidak diizinkan', 'Gunakan request POST untuk aksi ini.'));
    }
}

ensure_app_booted();
