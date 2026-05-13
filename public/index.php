<?php

declare(strict_types=1);

require_once dirname(__DIR__) . "/config/bootstrap.php";

if (current_user() !== null) {
    redirect_to("/welcome.php");
}

$mode = (string) ($_GET["mode"] ?? "register");
if (!in_array($mode, ["register", "login"], true)) {
    $mode = "register";
}

render_page_response(200, render_auth_page(pull_flash(), $mode));
