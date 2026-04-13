<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

require_post_method();
enforce_auth_rate_limit('register');
verify_csrf_or_fail($_POST['csrf_token'] ?? null);

$usernameValidation = validate_username((string) ($_POST['username'] ?? ''));
$passwordValidation = validate_password((string) ($_POST['password'] ?? ''));
$confirmPassword = (string) ($_POST['confirm_password'] ?? '');

if (!$usernameValidation['ok'] || !$passwordValidation['ok']) {
    set_flash('error', (string) ($usernameValidation['message'] ?? $passwordValidation['message']));
    redirect_to('/?mode=register');
}

if (!hash_equals((string) $passwordValidation['value'], $confirmPassword)) {
    set_flash('error', 'Konfirmasi password tidak cocok.');
    redirect_to('/?mode=register');
}

$username = (string) $usernameValidation['value'];
$password = (string) $passwordValidation['value'];
$lookup = username_lookup($username);

if (find_user_by_lookup($lookup) !== null) {
    set_flash('success', 'Username sudah terdaftar. Silakan login.');
    redirect_to('/?mode=login');
}

try {
    create_user(
        $lookup,
        encrypt_username($username),
        hash_password_for_storage($password)
    );

    set_flash('success', 'Registrasi berhasil. Silakan login.');
    redirect_to('/?mode=login');
} catch (Throwable $exception) {
    error_log($exception->getMessage());
    render_page_response(500, render_error_page('Registrasi gagal', 'Server gagal menyimpan akun baru.'));
}
