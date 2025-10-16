import { useEffect, useRef } from "react";
import { MessageEnvelope } from "@/lib/wsClient";
import { useWebSocket } from "@/context/WebSocketProvider";

export function useSubscription(
  types: string | string[],
  handler: (msg: MessageEnvelope<any>) => void
) {
  const { client } = useWebSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const tlist = Array.isArray(types) ? types : [types];
    const offs = tlist.map((t) => client.subscribe(t, (m) => handlerRef.current(m)));
    return () => {
      for (const off of offs) off();
    };
  }, [client, JSON.stringify(Array.isArray(types) ? types : [types])]);
}

