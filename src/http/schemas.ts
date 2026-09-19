import { z } from "zod";

export const createMonitorSchema = z.object({
  name: z.string().trim().min(2).max(80),
  url: z.url().refine(
    (value) => value.startsWith("http://") || value.startsWith("https://"),
    "Only HTTP and HTTPS URLs are supported"
  ),
  intervalSeconds: z.number().int().min(10).max(86400).default(60),
  timeoutMs: z.number().int().min(500).max(30000).default(5000),
  expectedStatus: z.number().int().min(100).max(599).default(200),
  degradedAfterMs: z.number().int().min(50).max(30000).default(1500)
});

export const updateMonitorSchema = createMonitorSchema.partial();

export type CreateMonitorInput = z.infer<typeof createMonitorSchema>;
export type UpdateMonitorInput = z.infer<typeof updateMonitorSchema>;
