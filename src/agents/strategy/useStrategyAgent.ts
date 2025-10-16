import { useCallback } from "react";
import { useWebSocket } from "@/context/WebSocketProvider";

export function useStrategyAgent() {
  const { client } = useWebSocket();

  const runAgent = useCallback(
    async (input: string) => {
      if (!input.trim()) {
        throw new Error("Input is required for the strategy agent.");
      }
      const response = await fetch("/api/strategy-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          errorText || `Strategy agent request failed with ${response.status}.`
        );
      }

      const data: {
        finalOutput?: string | null;
        streams?: Array<{ payload?: Record<string, unknown> | string }>;
      } = await response.json();

      if (import.meta.env.DEV) {
        console.debug("[strategy-agent] response", data);
      }

      if (Array.isArray(data.streams)) {
        data.streams.forEach((stream) => {
          if (!stream?.payload) return;
          console.debug("[strategy-agent] sending stream payload", stream.payload);
          client.sendRaw(stream.payload);
        });
      }

      return {
        finalOutput: data.finalOutput ?? "",
        streams: Array.isArray(data.streams) ? data.streams : [],
      };
    },
    [client]
  );

  return {
    runAgent,
  } as const;
}
