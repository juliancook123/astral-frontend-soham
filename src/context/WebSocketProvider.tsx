import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { WebSocketClient, WSStatus, deriveDefaultWsUrl } from "@/lib/wsClient";

type WSContextValue = {
  client: WebSocketClient;
  status: WSStatus;
  error: Error | null;
};

const WebSocketContext = createContext<WSContextValue | null>(null);

function getWsUrl(): string {
  const env = (import.meta as any).env?.VITE_WS_URL as string | undefined;
  const url = env || deriveDefaultWsUrl();
  if (!url) {
    console.warn("WebSocket URL not configured: set VITE_WS_URL or ensure window.location available");
    return "";
  }
  return url;
}

export function WebSocketProvider({ children }: { children: any }) {
  const [status, setStatus] = useState<WSStatus>("idle");
  const [error, setError] = useState<Error | null>(null);

  const clientRef = useRef<WebSocketClient | null>(null);

  if (!clientRef.current) {
    const url = getWsUrl();
    clientRef.current = new WebSocketClient({
      url,
      tokenProvider: () => {
        try {
          return localStorage.getItem("authToken") || undefined;
        } catch {
          return undefined;
        }
      },
      logger: console,
    });
  }

  const client = clientRef.current;

  useEffect(() => {
    const off = client.onStatusChange((s) => setStatus(s));
    return () => off();
  }, [client]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const unsubscribe = client.subscribeRaw((frame) => {
      console.debug("[ws][inbound]", frame);
    });
    return () => unsubscribe();
  }, [client]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await client.connect();
      } catch (e: any) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      }
    })();
    return () => {
      cancelled = true;
      client.disconnect();
    };
  }, [client]);

  const value = useMemo<WSContextValue>(() => ({ client, status: client.connectionStatus || status, error }), [client, status, error]);

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error("useWebSocket must be used within WebSocketProvider");
  return ctx;
}
