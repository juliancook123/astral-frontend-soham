export type WSStatus = "idle" | "connecting" | "open" | "closing" | "closed";

export interface MessageEnvelope<T = any> {
  v?: number;
  type?: string;
  requestId?: string;
  correlationId?: string;
  payload?: T;
  ts?: number;
  error?: any;
  topic?: string;
}

export type MessageHandler = (msg: MessageEnvelope<any>) => void;
export type RawMessageHandler = (msg: unknown) => void;

export interface WebSocketClientOptions {
  url: string;
  protocols?: string | string[];
  tokenProvider?: () => Promise<string | undefined> | string | undefined;
  logger?: Pick<Console, "debug" | "info" | "warn" | "error">;
  heartbeatIntervalMs?: number; // send ping every N ms
  idleTimeoutMs?: number; // if no messages in N ms, reconnect
  maxBackoffMs?: number;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timeoutId: any;
}

/**
 * A lightweight, framework-agnostic WebSocket client with:
 * - single connection management
 * - exponential backoff reconnect
 * - publish/subscribe by `type`
 * - request/response correlation
 * - heartbeat & idle detection
 * - outbound queueing until OPEN
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private opts: Required<WebSocketClientOptions>;
  private status: WSStatus = "idle";
  private listeners = new Map<string, Set<MessageHandler>>();
  private anyListeners = new Set<MessageHandler>();
  private rawListeners = new Set<RawMessageHandler>();
  private statusListeners = new Set<(s: WSStatus) => void>();
  private pending = new Map<string, PendingRequest>();
  private outbox: string[] = [];
  private reconnectAttempts = 0;
  private heartbeatTimer: any = null;
  private lastMessageAt: number = Date.now();

  constructor(options: WebSocketClientOptions) {
    const logger = options.logger ?? console;
    this.opts = {
      url: options.url,
      protocols: options.protocols ?? [],
      tokenProvider: options.tokenProvider ?? (() => undefined),
      logger,
      heartbeatIntervalMs: options.heartbeatIntervalMs ?? 30000,
      idleTimeoutMs: options.idleTimeoutMs ?? 90000,
      maxBackoffMs: options.maxBackoffMs ?? 10000,
    };
  }

  get connectionStatus(): WSStatus {
    return this.status;
  }

  onStatusChange(fn: (s: WSStatus) => void): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  async connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return; // already connecting/connected
    }

    this.setStatus("connecting");

    let url = this.opts.url;
    try {
      const token = await this.resolveToken();
      if (token) {
        const u = new URL(url, window.location.href);
        // Attach token as query param if not using protocols
        if (!this.opts.protocols || (Array.isArray(this.opts.protocols) && this.opts.protocols.length === 0)) {
          u.searchParams.set("token", token);
        }
        url = u.toString();
      }
    } catch (e) {
      this.opts.logger.warn("ws: tokenProvider failed", e);
    }

    try {
      this.ws = new WebSocket(url, this.opts.protocols);
    } catch (e) {
      this.opts.logger.error("ws: failed to create WebSocket", e);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.opts.logger.info("ws: open");
      this.setStatus("open");
      this.reconnectAttempts = 0;
      this.flushOutbox();
      this.startHeartbeat();
    };

    this.ws.onmessage = (ev) => {
      this.lastMessageAt = Date.now();
      let msg: any = null;
      try {
        msg = JSON.parse(ev.data as string);
      } catch (e) {
        // ignore non-JSON frames
        this.opts.logger.debug("ws: non-JSON frame", ev.data);
        return;
      }
      if (!msg || typeof msg !== "object") return;

      for (const fn of this.rawListeners) {
        try {
          fn(msg);
        } catch (err) {
          this.opts.logger.warn("ws: raw listener error", err);
        }
      }

      const envelope = msg as MessageEnvelope<any>;

      // handle correlation for request/response
      if (envelope.correlationId && this.pending.has(envelope.correlationId)) {
        const pending = this.pending.get(envelope.correlationId)!;
        clearTimeout(pending.timeoutId);
        this.pending.delete(envelope.correlationId);
        if ((envelope as any).error) {
          pending.reject(envelope.error);
        } else {
          pending.resolve(envelope.payload);
        }
      }

      // heartbeat: consider any message as activity; special-case pong
      if (envelope.type === "pong") {
        return; // nothing else to do
      }

      if (!envelope.type) {
        for (const fn of this.anyListeners) fn(envelope);
        return;
      }

      // dispatch to listeners
      const typeListeners = this.listeners.get(envelope.type);
      if (typeListeners) {
        for (const fn of typeListeners) fn(envelope);
      }
      for (const fn of this.anyListeners) fn(envelope);
    };

    this.ws.onerror = (ev) => {
      this.opts.logger.warn("ws: error", ev);
    };

    this.ws.onclose = (ev) => {
      this.opts.logger.info("ws: close", ev.code, ev.reason);
      this.setStatus("closed");
      this.stopHeartbeat();
      // reject all pending
      for (const [id, p] of this.pending) {
        clearTimeout(p.timeoutId);
        p.reject(new Error("socket closed"));
      }
      this.pending.clear();
      this.scheduleReconnect();
    };
  }

  disconnect() {
    this.stopHeartbeat();
    this.reconnectAttempts = 0;
    if (this.ws) {
      this.setStatus("closing");
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
      this.setStatus("closed");
    }
  }

  subscribe(type: string, handler: MessageHandler): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    const set = this.listeners.get(type)!;
    set.add(handler);
    return () => {
      set.delete(handler);
      if (set.size === 0) this.listeners.delete(type);
    };
  }

  subscribeAll(handler: MessageHandler): () => void {
    this.anyListeners.add(handler);
    return () => this.anyListeners.delete(handler);
  }

  subscribeRaw(handler: RawMessageHandler): () => void {
    this.rawListeners.add(handler);
    return () => this.rawListeners.delete(handler);
  }

  /**
   * Send a message. If options.expectReply is true, returns a Promise that
   * resolves when a message with matching correlationId arrives (or rejects on timeout/close).
   */
  send<T = any>(
    type: string,
    payload?: T,
    options?: { requestId?: string; expectReply?: boolean; timeoutMs?: number }
  ): Promise<any> | void {
    const requestId = options?.requestId ?? this.makeId();
    const frame: MessageEnvelope<T> = {
      v: 1,
      type,
      requestId,
      payload,
      ts: Date.now(),
    };
    const data = JSON.stringify(frame);
    this.enqueue(data);

    if (options?.expectReply) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pending.delete(requestId);
          reject(new Error("request timeout"));
        }, options?.timeoutMs ?? 10000);
        this.pending.set(requestId, { resolve, reject, timeoutId: timeout });
      });
    }
  }

  sendRaw(frame: string | Record<string, unknown>) {
    const data = typeof frame === "string" ? frame : JSON.stringify(frame);
    this.enqueue(data);
  }

  private makeId(): string {
    // simple uuid-ish
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  private async resolveToken(): Promise<string | undefined> {
    const t = this.opts.tokenProvider;
    if (!t) return undefined;
    try {
      const v = typeof t === "function" ? await t() : t;
      return v;
    } catch {
      return undefined;
    }
  }

  private flushOutbox() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    while (this.outbox.length) {
      const data = this.outbox.shift()!;
      try {
        this.ws.send(data);
      } catch (e) {
        this.opts.logger.warn("ws: failed flushing frame, re-queue");
        this.outbox.unshift(data);
        break;
      }
    }
  }

  private enqueue(data: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.outbox.push(data);
      return;
    }

    try {
      this.ws.send(data);
    } catch (e) {
      this.opts.logger.error("ws: send failed", e);
      this.outbox.push(data);
    }
  }

  private scheduleReconnect() {
    // do not reconnect if explicitly closed by user via disconnect()
    if (this.status === "closing") return;

    this.reconnectAttempts += 1;
    const base = Math.min(2 ** this.reconnectAttempts * 250, this.opts.maxBackoffMs);
    const jitter = Math.random() * 250;
    const delay = base + jitter;
    this.opts.logger.info(`ws: reconnect in ${Math.round(delay)}ms`);
    setTimeout(() => this.connect(), delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    const interval = this.opts.heartbeatIntervalMs;
    this.heartbeatTimer = setInterval(() => {
      // idle detection
      const idleFor = Date.now() - this.lastMessageAt;
      if (idleFor > (this.opts.idleTimeoutMs || 90000)) {
        this.opts.logger.warn("ws: idle timeout, forcing reconnect");
        try {
          this.ws?.close();
        } catch {}
        return;
      }
      // send ping
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          const ping: MessageEnvelope = { v: 1, type: "ping", ts: Date.now() };
          this.ws.send(JSON.stringify(ping));
        } catch {}
      }
    }, interval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private setStatus(s: WSStatus) {
    this.status = s;
    for (const fn of this.statusListeners) fn(s);
  }
}

export function deriveDefaultWsUrl(): string | undefined {
  try {
    const { protocol, host } = window.location;
    const wsProto = protocol === "https:" ? "wss:" : "ws:";
    // common default endpoint path
    return `${wsProto}//${host}/ws`;
  } catch {
    return undefined;
  }
}
