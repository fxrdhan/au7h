<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

if (current_user() !== null) {
    redirect_to('/welcome.php');
}

render_page_response(200, render_auth_page(pull_flash()));
