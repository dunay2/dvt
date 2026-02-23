import type { FastifyReply } from 'fastify';

export function sseHeaders(reply: FastifyReply): void {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
}

export function sseSend(
  reply: FastifyReply,
  msg: { id?: string; event: string; data: unknown }
): void {
  if (msg.id) reply.raw.write(`id: ${msg.id}\n`);
  reply.raw.write(`event: ${msg.event}\n`);
  reply.raw.write(`data: ${JSON.stringify(msg.data)}\n\n`);
}
