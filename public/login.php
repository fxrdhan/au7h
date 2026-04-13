<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

require_post_method();
enforce_auth_rate_limit('login');
verify_csrf_or_fail($_POST['csrf_token'] ?? null);

$usernameValidation = validate_username((string) ($_POST['username'] ?? ''));
$passwordValidation = validate_password((string) ($_POST['password'] ?? ''));

if (!$usernameValidation['ok'] || !$passwordValidation['ok']) {
    unset($_SESSION['user_id']);
    redirect_to('/not-registered.php');
}

$user = find_user_by_lookup(username_lookup((string) $usernameValidation['value']));

if ($user === null || !verify_stored_password((string) $passwordValidation['value'], (string) $user['password_hash'])) {
    unset($_SESSION['user_id']);
    redirect_to('/not-registered.php');
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['id'];
regenerate_csrf_token();

redirect_to('/welcome.php');
