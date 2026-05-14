import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const baseUrl = process.env.AU7H_BASE_URL ?? "https://localhost:10443";
const duplicateUsername = process.env.AU7H_DUPLICATE_USERNAME ?? "wleowleo";
const successUsername =
  process.env.AU7H_SUCCESS_USERNAME ?? `visual_${Date.now()}`;
const demoPassword = "Password12345";
const validDemoUsername = "visual_user_demo";
const invalidUsername = "bad<script>";
const tooLongUsername = "a".repeat(33);
const tooLongPassword = `Aa1${"x".repeat(70)}`;
const rateLimitUsernames = [
  "r1",
  "r2",
  "r3",
  "rate_demo_four",
  "rate_demo_one",
  "rate_demo_two",
  "rate_demo_three",
];
const slowMo = Number.parseInt(process.env.PW_SLOWMO ?? "650", 10);
const holdMs = Number.parseInt(process.env.PW_HOLD_MS ?? "2100", 10);
const fullscreen = process.env.PW_FULLSCREEN !== "0";

function runAppPhp(code, args = [], options = {}) {
  const result = spawnSync(
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
      stdio: options.stdio ?? "pipe",
    },
  );

  if (result.status !== 0 && options.throwOnError !== false) {
    throw new Error(
      `Docker PHP command failed:\n${result.stderr || result.stdout}`,
    );
  }

  return result;
}

function resetRateLimit() {
  if (process.env.AU7H_RESET_RATE_LIMIT === "0") {
    return;
  }

  runAppPhp(
    'require "/var/www/html/config/bootstrap.php"; db_connection()->exec("DELETE FROM auth_rate_limits");',
    [],
    { stdio: "ignore", throwOnError: false },
  );
}

function deleteUsers(usernames) {
  if (usernames.length === 0) {
    return;
  }

  runAppPhp(
    'require "/var/www/html/config/bootstrap.php"; array_shift($argv); foreach ($argv as $username) { $statement = db_connection()->prepare("DELETE FROM users WHERE username_lookup = :lookup"); $statement->execute(["lookup" => username_lookup($username)]); }',
    usernames,
    { stdio: "ignore", throwOnError: false },
  );
}

function ensureUserExists(username, password) {
  const result = runAppPhp(
    'require "/var/www/html/config/bootstrap.php"; $username = $argv[1] ?? ""; $password = $argv[2] ?? ""; $lookup = username_lookup($username); if (find_user_by_lookup($lookup) === null) { create_user($lookup, encrypt_username($username), hash_password_for_storage($password)); echo "created"; } else { echo "exists"; }',
    [username, password],
  );

  return result.stdout.trim() === "created";
}

async function pause(page, multiplier = 1) {
  await page.waitForTimeout(holdMs * multiplier);
}

function displayValue(value) {
  if (value === undefined) {
    return "unchanged";
  }

  if (value.length > 46) {
    return `"${value.slice(0, 18)}...${value.slice(-10)}" (${value.length} chars)`;
  }

  return `"${value}"`;
}

function inputLine(values) {
  const fields = [
    ["username", values.username],
    ["password", values.password],
    ["confirm_password", values.confirmPassword],
  ];

  if (values.csrfToken !== undefined) {
    fields.push(["csrf_token", values.csrfToken]);
  }

  return `Input: ${fields
    .map(([name, value]) => `${name}=${displayValue(value)}`)
    .join(", ")}`;
}

async function showStep(page, title, details = []) {
  const detailLines = Array.isArray(details) ? details : [details];
  const text = [title, ...detailLines].join("\n");

  console.log(`\n> ${title}`);
  for (const line of detailLines) {
    console.log(`  ${line}`);
  }

  await page.evaluate((bannerText) => {
    let banner = document.querySelector("[data-visual-test-banner]");
    if (!(banner instanceof HTMLElement)) {
      banner = document.createElement("div");
      banner.dataset.visualTestBanner = "true";
      banner.style.position = "fixed";
      banner.style.left = "18px";
      banner.style.bottom = "18px";
      banner.style.zIndex = "9999";
      banner.style.maxWidth = "min(680px, calc(100vw - 36px))";
      banner.style.border = "1px solid rgba(24,24,27,.14)";
      banner.style.borderRadius = "10px";
      banner.style.background = "rgba(255,255,255,.94)";
      banner.style.boxShadow = "0 16px 40px rgba(15,23,42,.18)";
      banner.style.color = "#18181b";
      banner.style.font = "600 13px/1.48 system-ui, sans-serif";
      banner.style.padding = "12px 14px";
      banner.style.whiteSpace = "pre-line";
      document.body.appendChild(banner);
    }

    banner.textContent = bannerText;
  }, text);
  await pause(page, 0.45);
}

function registerLocators(page) {
  return {
    confirmPassword: page.locator('input[name="confirm_password"]'),
    createAccount: page.getByRole("button", { name: "Create Account" }),
    password: page.locator('input[name="password"]'),
    username: page.locator('input[name="username"]'),
  };
}

async function gotoRegister(page) {
  await page.goto(`${baseUrl}/?mode=register`, {
    waitUntil: "domcontentloaded",
  });
}

async function clearRegisterForm(page) {
  const { username, password, confirmPassword } = registerLocators(page);
  await username.fill("");
  await password.fill("");
  await confirmPassword.fill("");
}

async function submitBypassingBrowserValidation(page, values) {
  const [response] = await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}),
    page.evaluate((payload) => {
      const form = document.querySelector('form[action="/register.php"]');
      if (!(form instanceof HTMLFormElement)) {
        throw new Error("Register form not found.");
      }

      form.noValidate = true;
      form.username.value = payload.username;
      form.password.value = payload.password;
      form.confirm_password.value = payload.confirmPassword;

      if (payload.csrfToken !== undefined) {
        form.csrf_token.value = payload.csrfToken;
      }

      form.submit();
    }, values),
  ]);

  return response?.status() ?? null;
}

async function recordServerFailure(page, username) {
  await page.evaluate(async (payload) => {
    const token = document.querySelector('input[name="csrf_token"]')?.value;
    if (typeof token !== "string") {
      throw new Error("CSRF token not found.");
    }

    const body = new URLSearchParams({
      confirm_password: payload.password,
      csrf_token: token,
      password: payload.password,
      username: payload.username,
    });

    await fetch("/register.php", {
      body,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });
  }, { password: "Password12345", username });
}

async function main() {
  const duplicateFixtureWasCreated = ensureUserExists(
    duplicateUsername,
    demoPassword,
  );
  deleteUsers([successUsername, ...rateLimitUsernames]);
  resetRateLimit();

  let browser;
  try {
    browser = await chromium.launch({
      args: fullscreen ? ["--start-fullscreen"] : [],
      headless: false,
      slowMo,
    });
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: fullscreen ? null : { width: 1000, height: 820 },
    });
    const page = await context.newPage();

    await gotoRegister(page);

    let { username, password, confirmPassword, createAccount } =
      registerLocators(page);

    await showStep(page, "01. Empty form submit is blocked by the browser", [
      inputLine({ confirmPassword: "", password: "", username: "" }),
      "Action: Click the Create Account button with all required fields empty.",
      "Expected: Native browser validation stops the submit before any server request.",
    ]);
    await createAccount.click();
    await pause(page);

    await showStep(page, "02. Short username is rejected on blur", [
      inputLine({ confirmPassword: "", password: "", username: "ab" }),
      "Action: Type the username, then move focus to the password field.",
      "Expected: The frontend shows the username length error without submitting.",
    ]);
    await username.fill("ab");
    await password.click();
    await pause(page);

    await showStep(page, "03. Username with disallowed characters is rejected", [
      inputLine({ confirmPassword: "", password: "", username: invalidUsername }),
      "Action: Type a username containing angle brackets, then blur the field.",
      "Expected: The frontend rejects characters outside the allowed username policy.",
    ]);
    await username.fill(invalidUsername);
    await password.click();
    await pause(page);

    await showStep(page, "04. Overlong username is rejected", [
      inputLine({
        confirmPassword: "",
        password: "",
        username: tooLongUsername,
      }),
      "Action: Type 33 characters, one above the 32 character limit, then blur.",
      "Expected: The frontend shows the username length error.",
    ]);
    await username.fill(tooLongUsername);
    await password.click();
    await pause(page);

    await showStep(page, "05. Too-short password is rejected on blur", [
      inputLine({
        confirmPassword: "",
        password: "short",
        username: validDemoUsername,
      }),
      "Action: Use a valid username, type a short password, then move to confirmation.",
      "Expected: The password field shakes and the missing checklist rules pulse red.",
    ]);
    await username.fill(validDemoUsername);
    await password.fill("short");
    await confirmPassword.click();
    await pause(page, 1.25);

    await showStep(page, "06. Password without uppercase is rejected", [
      inputLine({
        confirmPassword: "",
        password: "lowercase12345",
        username: validDemoUsername,
      }),
      "Action: Type a password that has length and digits but no uppercase letter.",
      "Expected: The uppercase and lowercase rule remains unmet.",
    ]);
    await password.fill("lowercase12345");
    await confirmPassword.click();
    await pause(page, 1.15);

    await showStep(page, "07. Password without a number is rejected", [
      inputLine({
        confirmPassword: "",
        password: "PasswordOnly",
        username: validDemoUsername,
      }),
      "Action: Type a password that has length and mixed case but no digit.",
      "Expected: The number rule remains unmet.",
    ]);
    await password.fill("PasswordOnly");
    await confirmPassword.click();
    await pause(page, 1.15);

    await showStep(page, "08. Valid password satisfies every checklist rule", [
      inputLine({
        confirmPassword: "",
        password: demoPassword,
        username: validDemoUsername,
      }),
      "Action: Type a password that meets length, mixed case, and digit requirements.",
      "Expected: All password checklist items turn valid.",
    ]);
    await password.fill(demoPassword);
    await pause(page);

    await showStep(page, "09. Mismatched confirmation is stopped before submit", [
      inputLine({
        confirmPassword: "Password99999",
        password: demoPassword,
        username: validDemoUsername,
      }),
      "Action: Type a different confirmation password, then click Create Account.",
      "Expected: Frontend validation blocks the request before it reaches PHP.",
    ]);
    await confirmPassword.fill("Password99999");
    await createAccount.click();
    await pause(page, 1.25);

    await showStep(page, "10. Matching confirmation restores a valid form state", [
      inputLine({
        confirmPassword: demoPassword,
        password: demoPassword,
        username: validDemoUsername,
      }),
      "Action: Replace the confirmation value with the same password.",
      "Expected: The confirm-password status becomes valid again.",
    ]);
    await confirmPassword.fill(demoPassword);
    await pause(page);

    await showStep(
      page,
      "11. Server guard rejects an invalid username after frontend bypass",
      [
        inputLine({
          confirmPassword: demoPassword,
          password: demoPassword,
          username: invalidUsername,
        }),
        "Action: Submit with form.noValidate=true and form.submit() to bypass frontend checks.",
        "Expected: PHP validation rejects the payload and returns to the register page.",
      ],
    );
    await submitBypassingBrowserValidation(page, {
      confirmPassword: demoPassword,
      password: demoPassword,
      username: invalidUsername,
    });
    await pause(page, 1.35);

    await gotoRegister(page);
    await showStep(
      page,
      "12. Server guard rejects a password longer than 72 characters",
      [
        inputLine({
          confirmPassword: tooLongPassword,
          password: tooLongPassword,
          username: "long_password_demo",
        }),
        "Action: Bypass frontend checks and submit a 73 character password.",
        "Expected: PHP password validation rejects the payload.",
      ],
    );
    await submitBypassingBrowserValidation(page, {
      confirmPassword: tooLongPassword,
      password: tooLongPassword,
      username: "long_password_demo",
    });
    await pause(page, 1.35);

    await gotoRegister(page);
    await showStep(page, "13. Server guard rejects confirmation mismatch", [
      inputLine({
        confirmPassword: "Password99999",
        password: demoPassword,
        username: "confirm_demo_user",
      }),
      "Action: Bypass frontend checks and submit different password values.",
      "Expected: PHP rejects the mismatch and preserves the username on register.",
    ]);
    await submitBypassingBrowserValidation(page, {
      confirmPassword: "Password99999",
      password: demoPassword,
      username: "confirm_demo_user",
    });
    await pause(page, 1.35);

    resetRateLimit();
    await gotoRegister(page);
    ({ username, password, confirmPassword, createAccount } =
      registerLocators(page));

    await showStep(page, "14. Server guard rejects a duplicate username", [
      inputLine({
        confirmPassword: demoPassword,
        password: demoPassword,
        username: duplicateUsername,
      }),
      "Action: Submit credentials using a username that already exists in the database.",
      "Expected: Registration stays on the register page with a duplicate username error.",
    ]);
    await username.fill(duplicateUsername);
    await password.fill(demoPassword);
    await confirmPassword.fill(demoPassword);
    await createAccount.click();
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await pause(page, 1.75);

    await gotoRegister(page);
    await showStep(page, "15. Invalid CSRF token is rejected with 403", [
      inputLine({
        confirmPassword: demoPassword,
        csrfToken: "0".repeat(64),
        password: demoPassword,
        username: "csrf_demo_user",
      }),
      "Action: Bypass the form and replace the CSRF token with 64 zeroes.",
      "Expected: The server rejects the request before registration validation runs.",
    ]);
    const csrfStatus = await submitBypassingBrowserValidation(page, {
      confirmPassword: demoPassword,
      csrfToken: "0".repeat(64),
      password: demoPassword,
      username: "csrf_demo_user",
    });
    if (csrfStatus !== 403) {
      throw new Error(`Expected CSRF response status 403, got ${csrfStatus}.`);
    }
    await pause(page, 1.75);

    resetRateLimit();
    await gotoRegister(page);
    await showStep(page, "16. Register rate limit blocks the fourth failed attempt", [
      "Setup requests: POST username=\"r1\", username=\"r2\", username=\"r3\" with a valid password. Each username is too short, so each request is a backend validation failure.",
      inputLine({
        confirmPassword: demoPassword,
        password: demoPassword,
        username: "rate_demo_four",
      }),
      "Action: After three backend failures, submit one more register request.",
      "Expected: The server returns HTTP 429 Too Many Requests.",
    ]);
    await recordServerFailure(page, "r1");
    await recordServerFailure(page, "r2");
    await recordServerFailure(page, "r3");
    const rateLimitStatus = await submitBypassingBrowserValidation(page, {
      confirmPassword: demoPassword,
      password: demoPassword,
      username: "rate_demo_four",
    });
    if (rateLimitStatus !== 429) {
      throw new Error(
        `Expected rate-limit response status 429, got ${rateLimitStatus}.`,
      );
    }
    await pause(page, 1.8);

    resetRateLimit();
    deleteUsers([successUsername]);
    await gotoRegister(page);
    ({ username, password, confirmPassword, createAccount } =
      registerLocators(page));

    await showStep(page, "17. Valid registration creates an account and redirects to login", [
      inputLine({
        confirmPassword: demoPassword,
        password: demoPassword,
        username: successUsername,
      }),
      "Action: Submit a unique username with a valid password and matching confirmation.",
      "Expected: The user is created, the rate limit bucket is cleared, and the page redirects to login.",
    ]);
    await clearRegisterForm(page);
    await username.fill(successUsername);
    await password.fill(demoPassword);
    await confirmPassword.fill(demoPassword);
    await createAccount.click();
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await pause(page, 2);

    await showStep(page, "Register visual test completed", [
      "Cleanup: temporary users are deleted and register rate-limit records are reset.",
      "The browser will close shortly.",
    ]);
    await pause(page, 1.5);
  } finally {
    if (browser !== undefined) {
      await browser.close();
    }

    resetRateLimit();
    deleteUsers([successUsername, ...rateLimitUsernames]);

    if (duplicateFixtureWasCreated) {
      deleteUsers([duplicateUsername]);
    }
  }
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
