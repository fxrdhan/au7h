<?php

declare(strict_types=1);

require_once dirname(__DIR__) . "/config/bootstrap.php";

require_post_method();
$submittedUsername = (string) ($_POST["username"] ?? "");
verify_csrf_or_fail($_POST["csrf_token"] ?? null);
enforce_auth_rate_limit("login", $submittedUsername);

$usernameValidation = validate_username($submittedUsername);
$passwordValidation = validate_password((string) ($_POST["password"] ?? ""));

if (!$usernameValidation["ok"] || !$passwordValidation["ok"]) {
    record_auth_rate_limit_failure("login", $submittedUsername);
    unset($_SESSION["user_id"]);
    redirect_to("/not-registered.php");
}

$user = find_user_by_lookup(
    username_lookup((string) $usernameValidation["value"]),
);

if (
    $user === null ||
    !verify_stored_password(
        (string) $passwordValidation["value"],
        (string) $user["password_hash"],
    )
) {
    record_auth_rate_limit_failure("login", $submittedUsername);
    unset($_SESSION["user_id"]);
    redirect_to("/not-registered.php");
}

clear_auth_rate_limit("login", $submittedUsername);
session_regenerate_id(true);
$_SESSION["user_id"] = (int) $user["id"];
regenerate_csrf_token();

redirect_to("/welcome.php");
