import type { FastifyPluginAsync } from "fastify";

export const versionRoutes: FastifyPluginAsync = async (app) => {
  app.get("/version", async () => ({
    name: "dbf-api",
    version: "0.1.0"
  }));
};
