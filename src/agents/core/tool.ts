import { z } from "zod";
import { WebSocketClient } from "@/lib/wsClient";

export interface ToolContext {
  client: WebSocketClient;
  logger?: Pick<Console, "info" | "warn" | "error" | "debug">;
}

export interface ToolExecutionResult<T = unknown> {
  ok: boolean;
  data?: T;
  meta?: Record<string, unknown>;
}

export interface ToolDefinition<Schema extends z.ZodTypeAny, TResult = unknown> {
  name: string;
  description: string;
  input: Schema;
  execute(input: z.infer<Schema>, context: ToolContext): Promise<ToolExecutionResult<TResult>>;
}

export type AnyToolDefinition = ToolDefinition<z.ZodTypeAny, unknown>;
