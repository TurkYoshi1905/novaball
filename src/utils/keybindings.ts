export interface Keybindings {
  moveUp:    string;
  moveDown:  string;
  moveLeft:  string;
  moveRight: string;
  shoot:     string;
  sprint:    string;
}

export const DEFAULT_KEYBINDINGS: Keybindings = {
  moveUp:    "KeyW",
  moveDown:  "KeyS",
  moveLeft:  "KeyA",
  moveRight: "KeyD",
  shoot:     "Space",
  sprint:    "ShiftLeft",
};

// Her eylem için ikincil (değiştirilemez) alternatif tuşlar
export const ALT_KEYS: Record<keyof Keybindings, string | null> = {
  moveUp:    "ArrowUp",
  moveDown:  "ArrowDown",
  moveLeft:  "ArrowLeft",
  moveRight: "ArrowRight",
  shoot:     "KeyX",
  sprint:    "ShiftRight",
};

export const BINDING_LABELS: Record<keyof Keybindings, string> = {
  moveUp:    "Yukarı",
  moveDown:  "Aşağı",
  moveLeft:  "Sol",
  moveRight: "Sağ",
  shoot:     "Şut / Şarj",
  sprint:    "Depar",
};

const KEY_MAP: Record<string, string> = {
  KeyW: "W", KeyA: "A", KeyS: "S", KeyD: "D",
  KeyX: "X", KeyZ: "Z", KeyC: "C", KeyQ: "Q",
  KeyE: "E", KeyR: "R", KeyF: "F", KeyG: "G",
  KeyH: "H", KeyI: "I", KeyJ: "J", KeyK: "K",
  KeyL: "L", KeyM: "M", KeyN: "N", KeyO: "O",
  KeyP: "P", KeyT: "T", KeyU: "U", KeyV: "V",
  KeyB: "B", KeyY: "Y",
  ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→",
  Space: "Boşluk",
  ShiftLeft: "Sol Shift", ShiftRight: "Sağ Shift",
  ControlLeft: "Sol Ctrl", ControlRight: "Sağ Ctrl",
  AltLeft: "Sol Alt", AltRight: "Sağ Alt",
  Enter: "Enter", Escape: "Esc", Tab: "Tab",
  Digit1: "1", Digit2: "2", Digit3: "3",
};

export function KEY_LABEL(code: string | null): string {
  if (!code) return "—";
  return KEY_MAP[code] ?? code;
}

const STORAGE_KEY = "novaball_keybindings";

export function loadKeybindings(): Keybindings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<Keybindings>;
      return { ...DEFAULT_KEYBINDINGS, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_KEYBINDINGS };
}

export function saveKeybindings(kb: Keybindings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kb));
  } catch { /* ignore */ }
}
