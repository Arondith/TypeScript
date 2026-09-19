import { loadConfig } from "./config.js";
import { buildApp } from "./app.js";

const config = loadConfig();
const { app, scheduler } = await buildApp(config);

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, "Shutting down PulseWatch");
  scheduler.stop();
  await app.close();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({
    port: config.PORT,
    host: config.HOST
  });

  scheduler.start();
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
