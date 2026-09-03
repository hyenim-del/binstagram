import type { Segment } from "./types";

function pad(n: number, w = 2) {
  return String(n).padStart(w, "0");
}

/** 12.345 → "00:00:12,345" */
export function toSrtTime(sec: number): string {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms % 1000, 3)}`;
}

/** 12.3 → "0:12.3" (화면 표시용) */
export function toDisplayTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s < 10 ? "0" : ""}${s.toFixed(1)}`;
}

export function toSrt(segments: Segment[]): string {
  return segments
    .map((s, i) => {
      const text = s.speaker ? `${s.speaker}: ${s.text}` : s.text;
      return `${i + 1}\n${toSrtTime(s.start)} --> ${toSrtTime(s.end)}\n${text}\n`;
    })
    .join("\n");
}

export function toPlainText(segments: Segment[]): string {
  return segments.map((s) => (s.speaker ? `${s.speaker}: ${s.text}` : s.text)).join("\n");
}
