<?php

declare(strict_types=1);

const APP_ROOT = __DIR__ . "/..";

$testDataDir = sys_get_temp_dir() . "/au7h-test-data-" . getmypid();
putenv("APP_DATA_DIR=" . $testDataDir);
putenv("PEPPER_SECRET=test-pepper-secret");
putenv("ENCRYPTION_KEY=test-encryption-key");

require_once APP_ROOT . "/src/Support/Config.php";
require_once APP_ROOT . "/src/Support/Http.php";
require_once APP_ROOT . "/src/Security/Auth.php";
require_once APP_ROOT . "/src/Security/RateLimiter.php";
require_once APP_ROOT . "/src/Presentation/Views.php";

register_shutdown_function(static function () use ($testDataDir): void {
    if (is_dir($testDataDir)) {
        @rmdir($testDataDir);
    }
});

function fail_test(string $message): never
{
    fwrite(STDERR, "FAIL: {$message}\n");
    exit(1);
}

function assert_true(bool $actual, string $message): void
{
    if (!$actual) {
        fail_test($message);
    }
}

function assert_false(bool $actual, string $message): void
{
    if ($actual) {
        fail_test($message);
    }
}

function assert_same(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        fail_test(
            $message .
                " Expected " .
                var_export($expected, true) .
                ", got " .
                var_export($actual, true) .
                ".",
        );
    }
}

function assert_not_same(
    mixed $unexpected,
    mixed $actual,
    string $message,
): void {
    if ($unexpected === $actual) {
        fail_test(
            $message . " Both values were " . var_export($actual, true) . ".",
        );
    }
}

$validUsername = validate_username(" Alice_1 ");
assert_true($validUsername["ok"], "valid username should pass");
assert_same(
    "Alice_1",
    $validUsername["value"] ?? null,
    "username should be trimmed",
);
assert_false(validate_username("ab")["ok"], "short username should fail");
assert_false(
    validate_username(str_repeat("a", 33))["ok"],
    "long username should fail",
);
assert_false(
    validate_username("bad<script>")["ok"],
    "username with disallowed characters should fail",
);

assert_true(
    validate_password("StrongPass123")["ok"],
    "strong password should pass",
);
assert_false(validate_password("Short1A")["ok"], "short password should fail");
assert_false(
    validate_password("lowercase12345")["ok"],
    "password without uppercase should fail",
);
assert_false(
    validate_password("NoNumberPassword")["ok"],
    "password without number should fail",
);

assert_same(
    "alice",
    normalize_username(" Alice "),
    "username normalization should trim and lowercase",
);
assert_same(
    username_lookup(" Alice "),
    username_lookup("alice"),
    "username lookup should use normalized value",
);
assert_same(
    64,
    strlen(username_lookup("alice")),
    "username lookup should be a sha256 hex digest",
);

$cipherText = encrypt_username("Alice");
assert_not_same(
    "Alice",
    $cipherText,
    "encrypted username should not equal plaintext",
);
assert_same(
    3,
    count(explode(".", $cipherText)),
    "encrypted username payload should contain iv, tag, and cipher text",
);
assert_same(
    "Alice",
    decrypt_username($cipherText),
    "encrypted username should decrypt to original value",
);

$passwordHash = hash_password_for_storage("StrongPass123");
assert_true(
    verify_stored_password("StrongPass123", $passwordHash),
    "stored password hash should verify the original password",
);
assert_false(
    verify_stored_password("WrongPass123", $passwordHash),
    "stored password hash should reject another password",
);

$_SESSION = [];
$csrfToken = csrf_token();
assert_same(
    $csrfToken,
    csrf_token(),
    "csrf_token should reuse the session token",
);
assert_true(
    csrf_token_is_well_formed($csrfToken),
    "csrf_token should be a 64-character lowercase hex token",
);
assert_false(
    csrf_token_is_well_formed(""),
    "empty csrf token should be rejected",
);
assert_false(
    csrf_token_is_well_formed(str_repeat("a", 63)),
    "short csrf token should be rejected",
);
assert_false(
    csrf_token_is_well_formed(str_repeat("g", 64)),
    "non-hex csrf token should be rejected",
);
$regeneratedToken = regenerate_csrf_token();
assert_not_same(
    $csrfToken,
    $regeneratedToken,
    "regenerate_csrf_token should rotate the token",
);
verify_csrf_or_fail($regeneratedToken);

$_SERVER["REMOTE_ADDR"] = "203.0.113.10";
$rateKey = auth_rate_limit_key("login", " Alice ");
assert_same(
    $rateKey,
    auth_rate_limit_key("login", "alice"),
    "rate-limit key should normalize username subject",
);
$_SERVER["REMOTE_ADDR"] = "203.0.113.11";
assert_not_same(
    $rateKey,
    auth_rate_limit_key("login", "alice"),
    "rate-limit key should include client address",
);

assert_same(
    ["max_attempts" => 3, "window_seconds" => 900],
    auth_rate_limit_policy("register"),
    "register policy should match configured throttle",
);
assert_same(
    ["max_attempts" => 5, "window_seconds" => 900],
    auth_rate_limit_policy("unknown"),
    "unknown throttle bucket should use default policy",
);

fwrite(STDOUT, "Auth security tests passed.\n");
