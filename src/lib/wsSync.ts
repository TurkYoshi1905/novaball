/**
 * Hibrit oyun senkronizasyon katmanı
 *
 * WebSocket sunucusu (api-server) erişilebilirse → WebSocket kullan (düşük gecikme, rate limit yok)
 * Erişilemiyorsa (Vercel deploy, hata vb.) → Supabase broadcast'e otomatik geç
 *
 * Dışarıya aynı API sunulur — çağıran kod hangi transport'un kullanıldığını bilmez.
 */

import { supabase } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Handler<T = unknown> = (payload: T) => void;

interface WSMessage {
  type: string;
  roomId: string;
  username: string;
  payload: unknown;
}

type Transport = "ws" | "supabase" | "pending";

class RoomConnection {
  private ws: WebSocket | null = null;
  private supabaseCh: RealtimeChannel | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private transport: Transport = "pending";
  private pendingOutbox: Array<{ type: string; payload: unknown }> = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  constructor(
    private readonly roomId: string,
    private readonly username: string,
  ) {
    this.tryWebSocket();
  }

  // ── WebSocket yolu ────────────────────────────────────────────────────────

  private get wsUrl(): string {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/api-server`;
  }

  private tryWebSocket() {
    if (this.closed) return;
    try {
      const ws = new WebSocket(this.wsUrl);
      this.ws = ws;

      // 3s içinde bağlanamazsa Supabase'e geç
      this.fallbackTimer = setTimeout(() => {
        if (this.transport === "pending") {
          ws.onclose = null;
          ws.onerror = null;
          ws.close();
          this.ws = null;
          this.activateSupabase();
        }
      }, 3000);

      ws.onopen = () => {
        clearTimeout(this.fallbackTimer!);
        this.fallbackTimer = null;
        this.transport = "ws";
        // Oda katılımını bildir
        this.rawSendWS("join", null);
        // Bekleyen mesajları gönder
        for (const m of this.pendingOutbox) this.rawSendWS(m.type, m.payload);
        this.pendingOutbox = [];
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as WSMessage;
          this.dispatch(msg.type, msg.payload);
        } catch { /* geçersiz JSON */ }
      };

      ws.onclose = () => {
        if (this.closed) return;
        if (this.transport === "ws") {
          // Bağlantı kesildi — 2s sonra yeniden dene
          this.reconnectTimer = setTimeout(() => this.tryWebSocket(), 2000);
        } else if (this.transport === "pending") {
          // Bağlanmadan kapandı → Supabase'e geç
          clearTimeout(this.fallbackTimer!);
          this.activateSupabase();
        }
      };

      ws.onerror = () => {
        clearTimeout(this.fallbackTimer!);
        this.fallbackTimer = null;
        ws.onclose = null;
        ws.close();
        this.ws = null;
        if (this.transport === "pending") {
          this.activateSupabase();
        } else if (this.transport === "ws" && !this.closed) {
          this.transport = "pending";
          this.reconnectTimer = setTimeout(() => this.tryWebSocket(), 2000);
        }
      };
    } catch {
      clearTimeout(this.fallbackTimer!);
      if (!this.closed) this.activateSupabase();
    }
  }

  private rawSendWS(type: string, payload: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const msg: WSMessage = { type, roomId: this.roomId, username: this.username, payload };
      this.ws.send(JSON.stringify(msg));
    }
  }

  // ── Supabase fallback yolu ────────────────────────────────────────────────

  private activateSupabase() {
    if (this.closed || this.supabaseCh) return;
    this.transport = "supabase";

    const ch = supabase.channel(this.roomId, {
      config: { broadcast: { self: false } },
    });

    // Var olan tüm handler'ları Supabase kanalına bağla
    for (const [eventType] of this.handlers) {
      ch.on("broadcast", { event: eventType }, ({ payload }) => {
        this.dispatch(eventType, payload);
      });
    }

    ch.subscribe(() => {
      // Bekleyen mesajları Supabase üzerinden gönder
      for (const m of this.pendingOutbox) {
        ch.send({ type: "broadcast", event: m.type, payload: m.payload });
      }
      this.pendingOutbox = [];
    });

    this.supabaseCh = ch;
  }

  // ── Ortak API ─────────────────────────────────────────────────────────────

  private dispatch(type: string, payload: unknown) {
    const hs = this.handlers.get(type);
    if (hs) for (const h of hs) h(payload);
  }

  /** Odaya mesaj gönder (her iki transport'ta da çalışır) */
  send(type: string, payload: unknown): boolean {
    if (this.transport === "ws") {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.rawSendWS(type, payload);
        return true;
      }
      return false;
    }
    if (this.transport === "supabase" && this.supabaseCh) {
      this.supabaseCh.send({ type: "broadcast", event: type, payload });
      return true;
    }
    // Hâlâ bağlanılıyor — giden kutuya ekle
    this.pendingOutbox.push({ type, payload });
    return false;
  }

  /** Gelen mesaj dinleyicisi ekle */
  on<T>(type: string, handler: Handler<T>): this {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler as Handler);

    // Supabase zaten aktifse yeni event'i hemen kaydet
    if (this.supabaseCh && this.transport === "supabase") {
      this.supabaseCh.on("broadcast", { event: type }, ({ payload }) => {
        this.dispatch(type, payload);
      });
    }
    return this;
  }

  /** Aktif transport tipini döner — host/client sync hızını uyarlamak için kullanılır */
  get isWebSocket(): boolean { return this.transport === "ws"; }

  /** Bağlantıyı tamamen kapat */
  close(): void {
    this.closed = true;
    if (this.reconnectTimer !== null) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.fallbackTimer !== null) { clearTimeout(this.fallbackTimer); this.fallbackTimer = null; }
    if (this.ws) { this.ws.onclose = null; this.ws.onerror = null; this.ws.close(); this.ws = null; }
    if (this.supabaseCh) { this.supabaseCh.unsubscribe(); this.supabaseCh = null; }
  }
}

export type { Handler as WSHandler };
export { RoomConnection };

export function createRoomConnection(roomId: string, username: string): RoomConnection {
  return new RoomConnection(roomId, username);
}
