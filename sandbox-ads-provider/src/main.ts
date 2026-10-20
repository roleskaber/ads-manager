import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createContainer } from "./container.js";

const config = loadConfig();
const container = createContainer(config);
const server = createApp(container).listen(config.port, () => {
  console.log(`sandbox-ads-provider listening on ${config.publicUrl} (port ${config.port})`);
});
container.ticker.start();

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  container.ticker.stop();
  server.close();
  await container.db.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
