<?php

declare(strict_types=1);

function escape_html(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function client_address(): string
{
    return (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
}

function csrf_token(): string
{
    if (!isset($_SESSION['csrf_token']) || !is_string($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

function regenerate_csrf_token(): string
{
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf_token'];
}

function verify_csrf_or_fail(?string $submittedToken): void
{
    $storedToken = $_SESSION['csrf_token'] ?? '';
    if (!is_string($submittedToken) || !is_string($storedToken) || !hash_equals($storedToken, $submittedToken)) {
        render_page_response(
            403,
            render_error_page('Form ditolak', 'Token integritas form tidak valid atau sudah kedaluwarsa.')
        );
    }
}

function validate_username(string $username): array
{
    $trimmed = trim($username);

    if (strlen($trimmed) < 3 || strlen($trimmed) > 32) {
        return ['ok' => false, 'message' => 'Username harus 3-32 karakter.'];
    }

    if (!preg_match('/^[A-Za-z0-9_.-]+$/', $trimmed)) {
        return ['ok' => false, 'message' => 'Username hanya boleh huruf, angka, titik, strip, atau underscore.'];
    }

    return ['ok' => true, 'value' => $trimmed];
}

function validate_password(string $password): array
{
    if (strlen($password) < 10 || strlen($password) > 72) {
        return ['ok' => false, 'message' => 'Password harus 10-72 karakter.'];
    }

    $checks = preg_match('/[a-z]/', $password)
        && preg_match('/[A-Z]/', $password)
        && preg_match('/[0-9]/', $password);

    if (!$checks) {
        return ['ok' => false, 'message' => 'Password harus memuat huruf kecil, huruf besar, dan angka.'];
    }

    return ['ok' => true, 'value' => $password];
}

function normalize_username(string $username): string
{
    return strtolower(trim($username));
}

function username_lookup(string $username): string
{
    return hash_hmac('sha256', normalize_username($username), app_config()['pepper_secret']);
}

function base64url_encode(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function base64url_decode(string $value): string
{
    $padding = strlen($value) % 4;
    if ($padding !== 0) {
        $value .= str_repeat('=', 4 - $padding);
    }

    return (string) base64_decode(strtr($value, '-_', '+/'), true);
}

function encrypt_username(string $username): string
{
    $key = app_config()['encryption_key'];
    $iv = random_bytes(12);
    $tag = '';
    $cipherText = openssl_encrypt($username, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);

    if ($cipherText === false) {
        throw new RuntimeException('Username encryption failed.');
    }

    return implode('.', [
        base64url_encode($iv),
        base64url_encode($tag),
        base64url_encode($cipherText),
    ]);
}

function decrypt_username(string $payload): string
{
    $parts = explode('.', $payload);
    if (count($parts) !== 3) {
        throw new RuntimeException('Encrypted username payload is invalid.');
    }

    [$ivPart, $tagPart, $cipherPart] = $parts;
    $plainText = openssl_decrypt(
        base64url_decode($cipherPart),
        'aes-256-gcm',
        app_config()['encryption_key'],
        OPENSSL_RAW_DATA,
        base64url_decode($ivPart),
        base64url_decode($tagPart)
    );

    if ($plainText === false) {
        throw new RuntimeException('Username decryption failed.');
    }

    return $plainText;
}

function hash_password_for_storage(string $password): string
{
    $pepperedPassword = $password . '|' . app_config()['pepper_secret'];
    return password_hash($pepperedPassword, PASSWORD_ARGON2ID);
}

function verify_stored_password(string $password, string $storedHash): bool
{
    return password_verify($password . '|' . app_config()['pepper_secret'], $storedHash);
}

function enforce_auth_rate_limit(string $bucket): void
{
    if (!consume_rate_limit($bucket)) {
        render_page_response(
            429,
            render_error_page('Terlalu banyak percobaan', 'Coba lagi beberapa menit lagi.')
        );
    }
}
