<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

render_page_response(401, render_not_registered_page());
