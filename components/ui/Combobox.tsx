"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";

/**
 * 콤보박스 — shadcn/ui 의 Combobox(버튼 + 검색창 + 목록 + 체크 표시) 형태를 그대로 따른 자체 구현.
 * 라이브러리 없이 동작하며, 키보드(↑↓ Enter Esc)와 바깥 클릭 닫기를 지원한다.
 */
export type ComboItem = { value: string; label: string; meta?: string };

type Props = {
  items: ComboItem[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  ariaLabel?: string;
  className?: string;
};

export function Combobox({ items, value, onChange, placeholder = "선택…", searchPlaceholder = "검색…", emptyText = "결과가 없어요", ariaLabel, className }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const listId = useId();

  const current = items.find((i) => i.value === value) ?? null;
  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return k ? items.filter((i) => `${i.label} ${i.meta ?? ""}`.toLowerCase().includes(k)) : items;
  }, [items, q]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setHi(Math.max(0, items.findIndex((i) => i.value === value)));
    setTimeout(() => search.current?.focus(), 0);
    const onDoc = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, items, value]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = filtered[hi];
      if (it) pick(it.value);
    }
  };

  return (
    <div className={`cbx${className ? ` ${className}` : ""}`} ref={root}>
      <button type="button" className={`cbx-trigger${open ? " open" : ""}`} role="combobox" aria-expanded={open} aria-controls={listId} aria-label={ariaLabel} onClick={() => setOpen((o) => !o)}>
        <span className={`cbx-val${current ? "" : " ph"}`}>{current ? current.label : placeholder}</span>
        <span className="cbx-chev">
          <Icon.Chev size={16} />
        </span>
      </button>
      {open && (
        <div className="cbx-pop" onKeyDown={onKey}>
          <div className="cbx-search">
            <Icon.Search size={14} />
            <input ref={search} value={q} onChange={(e) => { setQ(e.target.value); setHi(0); }} placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
          </div>
          <ul className="cbx-list" role="listbox" id={listId}>
            {filtered.length === 0 && <li className="cbx-empty">{emptyText}</li>}
            {filtered.map((it, i) => {
              const on = it.value === value;
              return (
                <li key={it.value} role="option" aria-selected={on} className={`cbx-item${i === hi ? " hi" : ""}${on ? " on" : ""}`} onMouseEnter={() => setHi(i)} onClick={() => pick(it.value)}>
                  <span className="cbx-check">{on ? "✓" : ""}</span>
                  <span className="cbx-label">{it.label}</span>
                  {it.meta && <span className="cbx-meta">{it.meta}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
