import Fastify, { type FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import cors from "@fastify/cors";

import { loadEnv, type Env } from "./plugins/env.js";
import { buildLoggerOptions } from "./plugins/logger.js";

import { healthRoutes } from "./routes/health.js";
import { versionRoutes } from "./routes/version.js";
import { dbReadyRoutes } from "./routes/dbReady.js";

export type AppContext = {
  env: Env;
};

export function buildApp(): { app: FastifyInstance; ctx: AppContext } {
  const env = loadEnv(process.env);

  const app = Fastify({
    logger: buildLoggerOptions(env),
    ajv: {
      customOptions: {
        coerceTypes: "array",
        removeAdditional: "all"
      }
    }
  });

  const ctx: AppContext = { env };

  app.register(helmet);
  app.register(sensible);

  app.register(cors, {
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",").map((s) => s.trim())
  });

  app.register(healthRoutes, { prefix: "/" });
  app.register(versionRoutes, { prefix: "/" });
  app.register(dbReadyRoutes, { prefix: "/", env });

  app.get("/", async () => ({ service: env.SERVICE_NAME, ok: true }));

  return { app, ctx };
}
