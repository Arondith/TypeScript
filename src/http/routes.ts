import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createMonitorSchema,
  updateMonitorSchema
} from "./schemas.js";
import { MonitorService } from "../services/monitorService.js";

const idParamsSchema = z.object({
  id: z.uuid()
});

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export async function registerRoutes(
  app: FastifyInstance,
  service: MonitorService
): Promise<void> {
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString()
  }));

  app.get("/api/stats", async () => service.getStats());

  app.get("/api/monitors", async () => service.list());

  app.get("/api/monitors/:id", async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return service.get(id);
  });

  app.post("/api/monitors", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (request, reply) => {
    const input = createMonitorSchema.parse(request.body);
    const monitor = await service.create(input);
    return reply.code(201).send(monitor);
  });

  app.patch("/api/monitors/:id", async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const input = updateMonitorSchema.parse(request.body);
    return service.update(id, input);
  });

  app.delete("/api/monitors/:id", async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    await service.remove(id);
    return reply.code(204).send();
  });

  app.post("/api/monitors/:id/check", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return service.check(id);
  });

  app.get("/api/monitors/:id/history", async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { limit } = historyQuerySchema.parse(request.query);
    return service.getHistory(id, limit);
  });
}
