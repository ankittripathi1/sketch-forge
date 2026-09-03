import { describe, expect, test } from "bun:test";
import { defineEditorCommand, EditorCommandManager } from "./commandManager";

type Context = { enabled: boolean; calls: string[] };

describe("EditorCommandManager", () => {
  test("registers and executes a command by id", () => {
    const context: Context = { enabled: true, calls: [] };
    const manager = new EditorCommandManager(() => context);
    const command = defineEditorCommand<Context, string>({
      id: "record",
      perform: (ctx, payload) => {
        ctx.calls.push(payload);
        return { handled: true };
      },
    });

    manager.register(command);

    expect(manager.getRegisteredCommandIds()).toEqual(["record"]);
    expect(manager.executeById("record", "payload")).toBe(true);
    expect(context.calls).toEqual(["payload"]);
  });

  test("does not perform a disabled command", () => {
    const context: Context = { enabled: false, calls: [] };
    const manager = new EditorCommandManager(() => context);
    const command = defineEditorCommand<Context>({
      id: "conditional",
      isEnabled: (ctx) => ctx.enabled,
      perform: (ctx) => {
        ctx.calls.push("called");
        return { handled: true };
      },
    });

    expect(manager.isEnabled(command)).toBe(false);
    expect(manager.execute(command, undefined)).toBe(false);
    expect(context.calls).toEqual([]);
  });

  test("returns false for an unknown command id", () => {
    const manager = new EditorCommandManager<Context>(() => ({
      enabled: true,
      calls: [],
    }));

    expect(manager.executeById("missing")).toBe(false);
  });

  test("rejects duplicate command ids", () => {
    const manager = new EditorCommandManager<Context>(() => ({
      enabled: true,
      calls: [],
    }));
    const command = defineEditorCommand<Context>({
      id: "duplicate",
      perform: () => ({ handled: true }),
    });

    manager.register(command);
    expect(() => manager.register(command)).toThrow(
      'Editor command "duplicate" is already registered',
    );
  });

  test("unregisters only the command instance that created the cleanup", () => {
    const manager = new EditorCommandManager<Context>(() => ({
      enabled: true,
      calls: [],
    }));
    const first = defineEditorCommand<Context>({
      id: "replaceable",
      perform: () => ({ handled: true }),
    });
    const second = defineEditorCommand<Context>({
      id: "replaceable",
      perform: () => ({ handled: false }),
    });

    const removeFirst = manager.register(first);
    removeFirst();
    manager.register(second);
    removeFirst();

    expect(manager.executeById("replaceable")).toBe(false);
  });
});
