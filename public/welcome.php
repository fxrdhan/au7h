<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

$user = require_login();

try {
    render_page_response(200, render_welcome_page(decrypt_username((string) $user['username_encrypted'])));
} catch (Throwable $exception) {
    error_log($exception->getMessage());
    render_page_response(500, render_error_page('Data akun tidak bisa dibaca', 'Kunci enkripsi untuk username tidak cocok.'));
}
