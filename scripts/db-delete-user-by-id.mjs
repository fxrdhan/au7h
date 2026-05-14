import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const userId = process.argv[2];
const skipConfirmation = process.argv.includes("--yes");

if (!/^[1-9][0-9]*$/.test(userId ?? "")) {
  console.error("Usage: bun run db:user:delete -- <user_id> [--yes]");
  process.exit(1);
}

function runAppPhp(code, args = [], stdio = "pipe") {
  return spawnSync(
    "docker",
    [
      "compose",
      "-f",
      "compose.dev.yaml",
      "exec",
      "-T",
      "-e",
      `AU7H_PHP_CODE=${code}`,
      "app",
      "sh",
      "-lc",
      'set -a; . "${APP_DATA_DIR:-/var/www/data}/runtime-secrets.env"; set +a; DB_PASSWORD="${DB_PASSWORD:-${MYSQL_APP_PASSWORD}}"; export DB_PASSWORD PEPPER_SECRET ENCRYPTION_KEY MYSQL_ROOT_PASSWORD MYSQL_APP_PASSWORD; php -r "$AU7H_PHP_CODE" "$@"',
      "au7h-php",
      ...args,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio,
    },
  );
}

const inspectUserCode = String.raw`
require "/var/www/html/config/bootstrap.php";

$userId = (int) ($argv[1] ?? 0);
$select = db_connection()->prepare(
    "SELECT id, username_lookup, username_encrypted, created_at
     FROM users
     WHERE id = :id"
);
$select->execute(["id" => $userId]);
$user = $select->fetch();

if ($user === false) {
    fwrite(STDERR, "No user found with id {$userId}.\n");
    exit(1);
}

try {
    $username = decrypt_username((string) $user["username_encrypted"]);
} catch (Throwable $exception) {
    $username = "[decrypt failed]";
}

echo json_encode([
    "id" => (string) $user["id"],
    "username_raw" => $username,
    "username_lookup" => (string) $user["username_lookup"],
    "created_at" => (string) $user["created_at"],
], JSON_THROW_ON_ERROR);
`;

const deleteUserCode = String.raw`
require "/var/www/html/config/bootstrap.php";

$userId = (int) ($argv[1] ?? 0);
$usernameLookup = (string) ($argv[2] ?? "");

$delete = db_connection()->prepare(
    "DELETE FROM users WHERE id = :id AND username_lookup = :username_lookup"
);
$delete->execute([
    "id" => $userId,
    "username_lookup" => $usernameLookup,
]);

if ($delete->rowCount() !== 1) {
    fwrite(STDERR, "Delete failed. The user may have changed or already been deleted.\n");
    exit(1);
}
`;

const inspected = runAppPhp(inspectUserCode, [userId]);
if (inspected.status !== 0) {
  if (inspected.stderr) {
    console.error(inspected.stderr.trim());
  }
  process.exit(inspected.status ?? 1);
}

const user = JSON.parse(inspected.stdout);

console.log("User selected for deletion:");
console.log(`  id: ${user.id}`);
console.log(`  username_raw: ${user.username_raw}`);
console.log(`  username_lookup: ${user.username_lookup}`);
console.log(`  created_at: ${user.created_at}`);

if (!skipConfirmation) {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question('Type "DELETE" to confirm: ');
  rl.close();

  if (answer !== "DELETE") {
    console.log("Delete cancelled.");
    process.exit(0);
  }
}

const deleted = runAppPhp(deleteUserCode, [user.id, user.username_lookup]);
if (deleted.status !== 0) {
  if (deleted.stderr) {
    console.error(deleted.stderr.trim());
  }
  process.exit(deleted.status ?? 1);
}

console.log(
  `Deleted user id=${user.id} username_raw=${user.username_raw} username_lookup=${user.username_lookup}`,
);
