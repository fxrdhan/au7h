import { spawnSync } from "node:child_process";

const phpCode = String.raw`
require "/var/www/html/config/bootstrap.php";

$statement = db_connection()->query(
    "SELECT id, username_lookup, username_encrypted, created_at
     FROM users
     ORDER BY id"
);

$rows = $statement->fetchAll();
if ($rows === []) {
    echo "No users found.\n";
    exit(0);
}

printf("%-5s %-32s %-64s %s\n", "id", "username_raw", "username_lookup", "created_at");
printf("%'-5s %'-32s %'-64s %'-26s\n", "", "", "", "");

foreach ($rows as $row) {
    try {
        $username = decrypt_username((string) $row["username_encrypted"]);
    } catch (Throwable $exception) {
        $username = "[decrypt failed]";
    }

    printf(
        "%-5s %-32s %-64s %s\n",
        (string) $row["id"],
        $username,
        (string) $row["username_lookup"],
        (string) $row["created_at"],
    );
}
`;

const result = spawnSync(
  "docker",
  [
    "compose",
    "-f",
    "compose.dev.yaml",
    "exec",
    "-T",
    "-e",
    `AU7H_PHP_CODE=${phpCode}`,
    "app",
    "sh",
    "-lc",
    'set -a; . "${APP_DATA_DIR:-/var/www/data}/runtime-secrets.env"; set +a; DB_PASSWORD="${DB_PASSWORD:-${MYSQL_APP_PASSWORD}}"; export DB_PASSWORD PEPPER_SECRET ENCRYPTION_KEY MYSQL_ROOT_PASSWORD MYSQL_APP_PASSWORD; php -r "$AU7H_PHP_CODE"',
  ],
  {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "inherit",
  },
);

process.exitCode = result.status ?? 1;
