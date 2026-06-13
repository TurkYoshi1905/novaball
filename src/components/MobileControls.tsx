import { useRef, useState, useEffect, useCallback } from "react";
import type { MobileInput } from "../types/game";

interface Props {
  inputRef: React.RefObject<MobileInput>;
  ranked?: boolean;
  onMenu: () => void;
  onReset?: () => void;
}

const THUMB_MAX = 42;
const MOB_THRESH = 0.18;
const CHARGE_DURATION_MS = 750;

export default function MobileControls({ inputRef, ranked, onMenu, onReset }: Props) {
  const [thumb, setThumb]             = useState({ x: 0, y: 0 });
  const [shootDown, setShootDown]     = useState(false);
  const [sprintDown, setSprintDown]   = useState(false);
  const [chargeLevel, setChargeLevel] = useState(0);

  const joyId         = useRef<number | null>(null);
  const joyBase       = useRef<{ x: number; y: number } | null>(null);
  const chargeStart   = useRef<number>(0);
  const chargeRafRef  = useRef<number | null>(null);
  const sprintIdRef   = useRef<number | null>(null);
  const shootIdRef    = useRef<number | null>(null);

  // ─── Şarj animasyon döngüsü ──────────────────────────────────────────────
  function startChargeAnim() {
    chargeStart.current = performance.now();
    const loop = () => {
      const elapsed = performance.now() - chargeStart.current;
      const lvl = Math.min(1, elapsed / CHARGE_DURATION_MS);
      setChargeLevel(lvl);
      if (lvl < 1) chargeRafRef.current = requestAnimationFrame(loop);
    };
    chargeRafRef.current = requestAnimationFrame(loop);
  }
  function stopChargeAnim() {
    if (chargeRafRef.current != null) { cancelAnimationFrame(chargeRafRef.current); chargeRafRef.current = null; }
    setChargeLevel(0);
  }
  useEffect(() => () => { if (chargeRafRef.current != null) cancelAnimationFrame(chargeRafRef.current); }, []);

  // ─── writeDir yardımcı ──────────────────────────────────────────────────
  const writeDir = useCallback((dx: number, dy: number) => {
    if (!inputRef.current) return;
    inputRef.current.dx = dx;
    inputRef.current.dy = dy;
  }, [inputRef]);

  // ─── Joystick — global document listener (parmak zone dışına çıkınca da çalışır) ──
  function onJoyStart(e: React.TouchEvent) {
    e.preventDefault();
    const t = e.changedTouches[0];
    joyId.current = t.identifier;
    joyBase.current = { x: t.clientX, y: t.clientY };
  }

  useEffect(() => {
    function handleTouchMove(e: TouchEvent) {
      if (joyId.current === null || !joyBase.current) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier !== joyId.current) continue;
        e.preventDefault();
        const dx = t.clientX - joyBase.current.x;
        const dy = t.clientY - joyBase.current.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        const nx = d > 0 ? dx / d : 0;
        const ny = d > 0 ? dy / d : 0;
        const clamped = Math.min(d, THUMB_MAX);
        setThumb({ x: nx * clamped, y: ny * clamped });
        const normX = d > 8 ? Math.max(-1, Math.min(1, dx / THUMB_MAX)) : 0;
        const normY = d > 8 ? Math.max(-1, Math.min(1, dy / THUMB_MAX)) : 0;
        writeDir(normX, normY);
        break;
      }
    }

    function handleTouchEndOrCancel(e: TouchEvent) {
      if (joyId.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joyId.current) {
          joyId.current = null;
          joyBase.current = null;
          setThumb({ x: 0, y: 0 });
          writeDir(0, 0);
          break;
        }
      }

      // Sprint touch bitiş takibi
      if (sprintIdRef.current !== null) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === sprintIdRef.current) {
            sprintIdRef.current = null;
            setSprintDown(false);
            if (inputRef.current) inputRef.current.sprint = false;
            break;
          }
        }
      }

      // Shoot touch bitiş takibi
      if (shootIdRef.current !== null) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === shootIdRef.current) {
            shootIdRef.current = null;
            setShootDown(false);
            if (inputRef.current) inputRef.current.shoot = false;
            stopChargeAnim();
            break;
          }
        }
      }
    }

    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEndOrCancel);
    document.addEventListener("touchcancel", handleTouchEndOrCancel);
    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEndOrCancel);
      document.removeEventListener("touchcancel", handleTouchEndOrCancel);
    };
  }, [writeDir, inputRef]);

  // ─── Şut ─────────────────────────────────────────────────────────────────
  function onShootStart(e: React.TouchEvent) {
    e.preventDefault();
    shootIdRef.current = e.changedTouches[0].identifier;
    setShootDown(true);
    if (inputRef.current) inputRef.current.shoot = true;
    startChargeAnim();
  }
  function onShootEnd(e: React.TouchEvent) {
    e.preventDefault();
    shootIdRef.current = null;
    setShootDown(false);
    if (inputRef.current) inputRef.current.shoot = false;
    stopChargeAnim();
  }

  // ─── Depar ───────────────────────────────────────────────────────────────
  function onSprintStart(e: React.TouchEvent) {
    e.preventDefault();
    sprintIdRef.current = e.changedTouches[0].identifier;
    setSprintDown(true);
    if (inputRef.current) inputRef.current.sprint = true;
  }
  function onSprintEnd(e: React.TouchEvent) {
    e.preventDefault();
    sprintIdRef.current = null;
    setSprintDown(false);
    if (inputRef.current) inputRef.current.sprint = false;
  }

  const { dx, dy } = inputRef.current ?? { dx: 0, dy: 0 };
  const showL = dx < -MOB_THRESH, showR = dx > MOB_THRESH;
  const showU = dy < -MOB_THRESH, showD = dy > MOB_THRESH;

  const chargeHue   = Math.round(120 - chargeLevel * 120);
  const chargeColor = `hsl(${chargeHue},100%,60%)`;
  const chargePct   = Math.round(chargeLevel * 100);
  const chargeRing  = chargeLevel > 0.02
    ? `conic-gradient(${chargeColor} ${chargePct}%, rgba(255,255,255,0.07) ${chargePct}%)`
    : "none";

  return (
    <div className="mobile-controls-bar" style={{ touchAction: "none", userSelect: "none" }}>

      {/* ── Sol: Joystick ── */}
      <div
        className="mobile-joystick-zone"
        onTouchStart={onJoyStart}
        style={{ touchAction: "none" }}
      >
        <div className="joy-base">
          <span className={`joy-hint joy-hint-up    ${showU ? "joy-hint-on" : ""}`}>▲</span>
          <span className={`joy-hint joy-hint-down  ${showD ? "joy-hint-on" : ""}`}>▼</span>
          <span className={`joy-hint joy-hint-left  ${showL ? "joy-hint-on" : ""}`}>◀</span>
          <span className={`joy-hint joy-hint-right ${showR ? "joy-hint-on" : ""}`}>▶</span>
          <div
            className="joy-thumb"
            style={{ transform: `translate(calc(-50% + ${thumb.x}px), calc(-50% + ${thumb.y}px))` }}
          />
        </div>
        <span className="joy-label">Hareket</span>
      </div>

      {/* ── Sağ: Aksiyon butonları ── */}
      <div className="mobile-action-zone">
        {/* Utility */}
        <div className="mobile-utility-row">
          {!ranked && (
            <button
              className="mobile-util-btn"
              onTouchStart={(e) => { e.preventDefault(); onReset?.(); }}
              style={{ touchAction: "none" }}
            >↺</button>
          )}
          <button
            className="mobile-util-btn"
            onTouchStart={(e) => { e.preventDefault(); onMenu(); }}
            style={{ touchAction: "none" }}
          >☰</button>
        </div>

        {/* Depar + Şut */}
        <div className="mobile-btns-row">

          {/* Depar */}
          <button
            className={`mobile-btn-sprint ${sprintDown ? "mobile-btn-active" : ""}`}
            onTouchStart={onSprintStart}
            onTouchEnd={onSprintEnd}
            onTouchCancel={onSprintEnd}
            style={{ touchAction: "none" }}
          >
            <span className="mobile-btn-icon">⚡</span>
            <span className="mobile-btn-label">DEPAR</span>
          </button>

          {/* Şut — güç barı halkası */}
          <div
            className="mobile-shoot-wrapper"
            style={{
              padding: 4,
              borderRadius: "50%",
              background: chargeLevel > 0.02 ? chargeRing : "transparent",
              transition: "background 0.05s",
            }}
          >
            <button
              className={`mobile-btn-shoot ${shootDown ? "mobile-btn-shoot-active" : ""}`}
              onTouchStart={onShootStart}
              onTouchEnd={onShootEnd}
              onTouchCancel={onShootEnd}
              style={{ touchAction: "none", position: "relative" }}
            >
              <span className="mobile-btn-icon">⚽</span>
              {chargeLevel > 0.08 && (
                <span className="mobile-charge-label" style={{ color: chargeColor }}>
                  {chargePct}%
                </span>
              )}
              {chargeLevel < 0.01 && (
                <span className="mobile-btn-label">ŞUT</span>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
