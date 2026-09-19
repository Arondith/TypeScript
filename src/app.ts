import Fastify, { type FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import type { AppConfig } from "./config.js";
import { ConflictError, NotFoundError } from "./errors.js";
import { registerRoutes } from "./http/routes.js";
import { FileRepository } from "./infra/fileRepository.js";
import { MonitorService } from "./services/monitorService.js";
import { MonitorScheduler } from "./services/scheduler.js";

export interface AppRuntime {
  app: FastifyInstance;
  scheduler: MonitorScheduler;
}

export async function buildApp(config: AppConfig): Promise<AppRuntime> {
  const app = Fastify({
    logger: true,
    requestIdHeader: "x-request-id"
  });

  await app.register(helmet);
  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: "1 minute"
  });

  const repository = new FileRepository(config.DATA_FILE, config.HISTORY_LIMIT);
  await repository.init();

  const service = new MonitorService(repository);
  const scheduler = new MonitorScheduler(service, config.SCHEDULER_TICK_MS);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        type: "validation_error",
        message: "Request validation failed.",
        issues: error.issues
      });
    }

    if (error instanceof NotFoundError) {
      return reply.code(404).send({
        type: "not_found",
        message: error.message
      });
    }

    if (error instanceof ConflictError) {
      return reply.code(409).send({
        type: "conflict",
        message: error.message
      });
    }

    app.log.error(error);
    return reply.code(500).send({
      type: "internal_error",
      message: "An unexpected error occurred."
    });
  });

  await registerRoutes(app, service);

  return { app, scheduler };
}
