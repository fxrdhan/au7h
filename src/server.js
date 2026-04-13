const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');

const { createApp } = require("./app");
const { createConfig } = require("./config");
const { createDatabase } = require("./db");

function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
}

async function start() {
  const config = createConfig();
  const database = createDatabase(config.dbPath);

  if (!fs.existsSync(config.keyPath) || !fs.existsSync(config.certPath)) {
    throw new Error(
      `TLS certificate not found. Expected key at ${config.keyPath} and cert at ${config.certPath}.`,
    );
  }

  const app = createApp({ config, database });

  const httpsServer = https.createServer(
    {
      key: fs.readFileSync(config.keyPath),
      cert: fs.readFileSync(config.certPath),
      minVersion: "TLSv1.2",
    },
    app,
  );

  const httpServer = http.createServer((req, res) => {
    const forwardedHost = req.headers["x-forwarded-host"];
    const rawHost = String(forwardedHost || req.headers.host || "localhost")
      .split(",")[0]
      .trim();
    const hostHeader = rawHost.split(":")[0];
    const redirectPort = config.publicHttpsPort === 443 ? "" : `:${config.publicHttpsPort}`;
    const redirectTarget = `https://${hostHeader}${redirectPort}${req.url || "/"}`;
    res.writeHead(301, { Location: redirectTarget });
    res.end();
  });

  await Promise.all([
    listen(httpServer, config.httpPort, config.host),
    listen(httpsServer, config.httpsPort, config.host),
  ]);

  console.log(`HTTP redirect server  : http://${config.host}:${config.httpPort}`);
  console.log(`HTTPS application     : https://${config.host}:${config.httpsPort}`);
  console.log(`SQLite database path  : ${config.dbPath}`);

  const shutdown = () => {
    httpServer.close(() => undefined);
    httpsServer.close(() => undefined);
    database.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  start,
};
