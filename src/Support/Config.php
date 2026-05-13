<?php

declare(strict_types=1);

function env_string(string $name, string $fallback): string
{
    $value = getenv($name);

    return $value === false || $value === "" ? $fallback : $value;
}

function app_config(): array
{
    static $config = null;

    if ($config !== null) {
        return $config;
    }

    $dataDir = env_string("APP_DATA_DIR", APP_ROOT . "/data");
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0700, true);
    }

    $config = [
        "db_host" => env_string("DB_HOST", "127.0.0.1"),
        "db_port" => env_string("DB_PORT", "3306"),
        "db_name" => env_string("DB_NAME", "au7h_auth"),
        "db_user" => env_string("DB_USER", "au7h_app"),
        "db_password" => env_string("DB_PASSWORD", "change-me"),
        "pepper_secret" => env_string(
            "PEPPER_SECRET",
            "replace-me-demo-pepper",
        ),
        "encryption_key" => hash(
            "sha256",
            env_string("ENCRYPTION_KEY", "replace-me-demo-key"),
            true,
        ),
        "auth_rate_limits" => [
            "default" => [
                "max_attempts" => 5,
                "window_seconds" => 900,
            ],
            "login" => [
                "max_attempts" => 5,
                "window_seconds" => 900,
            ],
            "register" => [
                "max_attempts" => 3,
                "window_seconds" => 900,
            ],
        ],
        "session_name" => "au7h_sid",
        "session_ttl" => 1800,
    ];

    return $config;
}
