import { buildApp } from "./app.js";

async function main(): Promise<void> {
  const { app, ctx } = buildApp();

  const address = await app.listen({
    port: ctx.env.PORT,
    host: ctx.env.HOST
  });

  app.log.info({ address }, "server listening");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
