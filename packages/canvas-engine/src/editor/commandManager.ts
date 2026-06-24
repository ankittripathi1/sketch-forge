export type EditorCommandResult = {
  handled: boolean;
};

export type EditorCommand<TContext, TPayload = undefined> = {
  id: string;
  isEnabled?: (context: TContext) => boolean;
  perform: (context: TContext, payload: TPayload) => EditorCommandResult;
};

export function defineEditorCommand<TContext, TPayload = undefined>(
  command: EditorCommand<TContext, TPayload>,
): EditorCommand<TContext, TPayload> {
  return command;
}

export class EditorCommandManager<TContext> {
  private readonly registry = new Map<
    string,
    EditorCommand<TContext, unknown>
  >();

  constructor(private readonly getContext: () => TContext) {}

  register<TPayload>(command: EditorCommand<TContext, TPayload>): () => void {
    if (this.registry.has(command.id)) {
      throw new Error(`Editor command "${command.id}" is already registered`);
    }

    this.registry.set(
      command.id,
      command as unknown as EditorCommand<TContext, unknown>,
    );

    return () => {
      if (this.registry.get(command.id) === command) {
        this.registry.delete(command.id);
      }
    };
  }

  getRegisteredCommandIds(): string[] {
    return [...this.registry.keys()];
  }

  isEnabled<TPayload>(command: EditorCommand<TContext, TPayload>): boolean {
    const context = this.getContext();
    return command.isEnabled?.(context) ?? true;
  }

  execute<TPayload>(
    command: EditorCommand<TContext, TPayload>,
    payload: TPayload,
  ): boolean {
    const context = this.getContext();

    if (command.isEnabled && !command.isEnabled(context)) {
      return false;
    }

    return command.perform(context, payload).handled;
  }

  executeById(id: string, payload?: unknown): boolean {
    const command = this.registry.get(id);
    return command ? this.execute(command, payload) : false;
  }
}
