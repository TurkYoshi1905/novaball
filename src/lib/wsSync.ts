// WebSocket tabanlı oyun senkronizasyon istemcisi
// Supabase broadcast yerine kullanılır — rate limit yok, daha düşük gecikme

type Handler<T = unknown> = (payload: T) => void;

interface WSMessage {
  type: string;
  roomId: string;
  username: string;
  payload: unknown;
}

class RoomConnection {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private url: string;

  constructor(
    private readonly roomId: string,
    private readonly username: string,
  ) {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    this.url = `${proto}//${window.location.host}/api-server`;
    this.connect();
  }

  private connect() {
    if (this.closed) return;
    try {
      const ws = new WebSocket(this.url);
      this.ws = ws;

      ws.onopen = () => {
        this.send("join", null);
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as WSMessage;
          const hs = this.handlers.get(msg.type);
          if (hs) for (const h of hs) h(msg.payload);
        } catch { /* geçersiz mesaj */ }
      };

      ws.onclose = () => {
        if (this.closed) return;
        // 2s sonra yeniden bağlan
        this.reconnectTimer = setTimeout(() => this.connect(), 2000);
      };

      ws.onerror = () => {
        ws.close(); // onclose → reconnect tetikler
      };
    } catch {
      if (!this.closed) {
        this.reconnectTimer = setTimeout(() => this.connect(), 2000);
      }
    }
  }

  /** Odaya mesaj gönder */
  send(type: string, payload: unknown): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const msg: WSMessage = {
        type,
        roomId: this.roomId,
        username: this.username,
        payload,
      };
      this.ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }

  /** Belirli bir mesaj türü için dinleyici ekle */
  on<T>(type: string, handler: Handler<T>): this {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler as Handler);
    return this;
  }

  /** Bağlantıyı kapat (yeniden bağlantı olmaz) */
  close(): void {
    this.closed = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null; // döngüyü önle
      this.ws.close();
      this.ws = null;
    }
  }
}

export type { Handler as WSHandler };
export { RoomConnection };

export function createRoomConnection(roomId: string, username: string): RoomConnection {
  return new RoomConnection(roomId, username);
}
