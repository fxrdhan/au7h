<?php

declare(strict_types=1);

function db_connection(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = app_config();
    $pdo = new PDO('sqlite:' . $config['db_path']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec('PRAGMA journal_mode = WAL');
    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec('PRAGMA secure_delete = ON');

    return $pdo;
}

function initialize_database(): void
{
    $pdo = db_connection();

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username_lookup TEXT NOT NULL UNIQUE,
            username_encrypted TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS auth_rate_limits (
            rate_key TEXT PRIMARY KEY,
            attempts INTEGER NOT NULL,
            window_start INTEGER NOT NULL
        )'
    );
}

function find_user_by_lookup(string $usernameLookup): ?array
{
    $statement = db_connection()->prepare(
        'SELECT id, username_lookup, username_encrypted, password_hash, created_at
         FROM users
         WHERE username_lookup = :username_lookup'
    );

    $statement->execute(['username_lookup' => $usernameLookup]);
    $user = $statement->fetch();

    return $user === false ? null : $user;
}

function find_user_by_id(int $userId): ?array
{
    $statement = db_connection()->prepare(
        'SELECT id, username_lookup, username_encrypted, password_hash, created_at
         FROM users
         WHERE id = :id'
    );

    $statement->execute(['id' => $userId]);
    $user = $statement->fetch();

    return $user === false ? null : $user;
}

function create_user(string $usernameLookup, string $usernameEncrypted, string $passwordHash): void
{
    $statement = db_connection()->prepare(
        'INSERT INTO users (
            username_lookup,
            username_encrypted,
            password_hash,
            created_at
         ) VALUES (
            :username_lookup,
            :username_encrypted,
            :password_hash,
            :created_at
         )'
    );

    $statement->execute([
        'username_lookup' => $usernameLookup,
        'username_encrypted' => $usernameEncrypted,
        'password_hash' => $passwordHash,
        'created_at' => gmdate(DATE_ATOM),
    ]);
}

function consume_rate_limit(string $bucket): bool
{
    $config = app_config();
    $pdo = db_connection();
    $now = time();
    $windowSeconds = (int) $config['rate_limit_window_seconds'];
    $maxAttempts = (int) $config['rate_limit_max_attempts'];
    $rateKey = hash('sha256', client_address() . '|' . $bucket);

    $select = $pdo->prepare(
        'SELECT attempts, window_start
         FROM auth_rate_limits
         WHERE rate_key = :rate_key'
    );
    $select->execute(['rate_key' => $rateKey]);
    $record = $select->fetch();

    if ($record === false || ($now - (int) $record['window_start']) >= $windowSeconds) {
      $upsert = $pdo->prepare(
          'INSERT INTO auth_rate_limits (rate_key, attempts, window_start)
           VALUES (:rate_key, 1, :window_start)
           ON CONFLICT(rate_key) DO UPDATE SET attempts = 1, window_start = :window_start'
      );
      $upsert->execute([
          'rate_key' => $rateKey,
          'window_start' => $now,
      ]);
      return true;
    }

    if ((int) $record['attempts'] >= $maxAttempts) {
        return false;
    }

    $update = $pdo->prepare(
        'UPDATE auth_rate_limits
         SET attempts = attempts + 1
         WHERE rate_key = :rate_key'
    );
    $update->execute(['rate_key' => $rateKey]);

    return true;
}
