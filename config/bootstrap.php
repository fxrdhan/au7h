<?php

declare(strict_types=1);

const APP_ROOT = __DIR__ . "/..";

require_once APP_ROOT . "/src/Support/Config.php";
require_once APP_ROOT . "/src/Infrastructure/Database.php";
require_once APP_ROOT . "/src/Support/Http.php";
require_once APP_ROOT . "/src/Security/Auth.php";
require_once APP_ROOT . "/src/Security/RateLimiter.php";
require_once APP_ROOT . "/src/Presentation/Views.php";

ensure_app_booted();
