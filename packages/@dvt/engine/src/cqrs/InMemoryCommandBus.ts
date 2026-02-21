type Handler<T> = (cmd: T) => Promise<void> | void;

export class InMemoryCommandBus {
  private handlers = new Map<string, Handler<any>>();

  register<T>(commandName: string, handler: Handler<T>) {
    this.handlers.set(commandName, handler);
  }

  async execute<T>(commandName: string, cmd: T) {
    const h = this.handlers.get(commandName);
    if (!h) throw new Error(`Handler not found for ${commandName}`);
    return h(cmd);
  }
}
