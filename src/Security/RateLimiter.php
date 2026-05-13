<?php

declare(strict_types=1);

function auth_rate_limit_key(string $bucket, ?string $subject = null): string
{
    $normalizedSubject = normalize_username((string) $subject);
    $keySource = client_address() . "|" . $bucket;

    if ($normalizedSubject !== "") {
        $keySource .= "|" . $normalizedSubject;
    }

    return hash("sha256", $keySource);
}

function auth_rate_limit_policy(string $bucket): array
{
    $limits = app_config()["auth_rate_limits"] ?? [];
    $policy = $limits[$bucket] ?? ($limits["default"] ?? null);

    if (!is_array($policy)) {
        return [
            "max_attempts" => 5,
            "window_seconds" => 900,
        ];
    }

    return [
        "max_attempts" => (int) ($policy["max_attempts"] ?? 5),
        "window_seconds" => (int) ($policy["window_seconds"] ?? 900),
    ];
}

function find_auth_rate_limit_record(
    string $bucket,
    ?string $subject = null,
): ?array {
    $select = db_connection()->prepare(
        'SELECT attempts, window_start
         FROM auth_rate_limits
         WHERE rate_key = :rate_key',
    );
    $select->execute(["rate_key" => auth_rate_limit_key($bucket, $subject)]);
    $record = $select->fetch();

    return $record === false ? null : $record;
}

function auth_rate_limit_exceeded(string $bucket, ?string $subject = null): bool
{
    $policy = auth_rate_limit_policy($bucket);
    $now = time();
    $windowSeconds = $policy["window_seconds"];
    $maxAttempts = $policy["max_attempts"];
    $record = find_auth_rate_limit_record($bucket, $subject);

    if (
        $record === null ||
        $now - (int) $record["window_start"] >= $windowSeconds
    ) {
        return false;
    }

    return (int) $record["attempts"] >= $maxAttempts;
}

function record_auth_rate_limit_failure(
    string $bucket,
    ?string $subject = null,
): void {
    $policy = auth_rate_limit_policy($bucket);
    $pdo = db_connection();
    $now = time();
    $windowSeconds = $policy["window_seconds"];
    $rateKey = auth_rate_limit_key($bucket, $subject);
    $record = find_auth_rate_limit_record($bucket, $subject);

    if (
        $record === null ||
        $now - (int) $record["window_start"] >= $windowSeconds
    ) {
        $upsert = $pdo->prepare(
            'INSERT INTO auth_rate_limits (rate_key, attempts, window_start)
             VALUES (:rate_key, 1, :window_start)
             ON DUPLICATE KEY UPDATE attempts = VALUES(attempts), window_start = VALUES(window_start)',
        );
        $upsert->execute([
            "rate_key" => $rateKey,
            "window_start" => $now,
        ]);
        return;
    }

    $update = $pdo->prepare(
        'UPDATE auth_rate_limits
         SET attempts = attempts + 1
         WHERE rate_key = :rate_key',
    );
    $update->execute(["rate_key" => $rateKey]);
}

function clear_auth_rate_limit(string $bucket, ?string $subject = null): void
{
    $delete = db_connection()->prepare(
        'DELETE FROM auth_rate_limits
         WHERE rate_key = :rate_key',
    );
    $delete->execute(["rate_key" => auth_rate_limit_key($bucket, $subject)]);
}
