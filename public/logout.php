<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

require_post_method();
verify_csrf_or_fail($_POST['csrf_token'] ?? null);

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], '', true, true);
}
session_destroy();

redirect_to('/');
