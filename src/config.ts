import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default("0.0.0.0"),
  DATA_FILE: z.string().default("./data/pulsewatch.json"),
  SCHEDULER_TICK_MS: z.coerce.number().int().min(1000).default(5000),
  HISTORY_LIMIT: z.coerce.number().int().min(10).max(1000).default(100)
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(env);
}
