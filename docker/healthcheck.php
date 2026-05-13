<?php

declare(strict_types=1);

$port = getenv("APP_PORT_HTTPS") ?: "8443";
$url = "https://127.0.0.1:" . $port . "/";
$context = stream_context_create([
    "http" => [
        "timeout" => 3,
    ],
    "ssl" => [
        "verify_peer" => false,
        "verify_peer_name" => false,
    ],
]);

$body = @file_get_contents($url, false, $context);
$statusLine = $http_response_header[0] ?? "";

if ($body === false || !preg_match("/\AHTTP\/\S+\s+200\b/", $statusLine)) {
    fwrite(STDERR, "AU7H HTTPS healthcheck failed for {$url}\n");
    exit(1);
}

exit(0);
