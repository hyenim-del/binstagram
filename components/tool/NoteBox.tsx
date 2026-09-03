"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import type { MediaFile } from "@/lib/types";

const MAX = 1000;

type Props = { value: string; onChange: (v: string) => void; files: MediaFile[] };

export function NoteBox({ value, onChange, files }: Props) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const insert = (name: string) => {
    const sep = value.length && !/\s$/.test(value) ? " " : "";
    onChange((value + sep + "@" + name + " ").slice(0, MAX));
    setOpen(false);
  };

  return (
    <div className="card note-card" ref={box}>
      <textarea
        value={value}
        maxLength={MAX}
        placeholder="추출 후 다듬기 지시 (선택) — 예: 구어체 그대로 유지, 군더더기 제거, 문장 단위로 줄바꿈. @로 파일을 지정할 수 있어요."
        onChange={(e) => {
          const v = e.target.value.slice(0, MAX);
          onChange(v);
          if (/@$/.test(v)) setOpen(true);
        }}
        aria-label="다듬기 지시"
      />
      <div className="note-foot">
        <button className="pill-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <Icon.At size={16} /> 참조
        </button>
        <span className="tiny muted mono">
          {value.length}/{MAX}
        </span>
      </div>
      {open && (
        <div className="popover" style={{ left: 16, bottom: 52, width: 300 }}>
          <div className="popover-title">파일 참조 삽입</div>
          {files.length === 0 && <div className="small" style={{ padding: 8, color: "var(--ink-2)" }}>먼저 파일을 업로드하세요.</div>}
          {files.map((f) => (
            <button key={f.id} className="popover-item" onClick={() => insert(f.name)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--blue)", fontWeight: 600 }}>@</span>
              <span style={{ fontSize: 13 }}>{f.name}</span>
              <span className="tiny muted mono" style={{ marginLeft: "auto" }}>
                {f.duration === null ? "" : `${f.duration.toFixed(1)}s`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
