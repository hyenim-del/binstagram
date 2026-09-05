"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icons";

/**
 * 휴대폰에서만 접히는 상자. 데스크톱(769px+)에서는 토글 버튼이 숨겨지고 내용이 늘 보인다.
 * 왕초보가 휴대폰으로 쓸 때 꼭 필요한 것만 먼저 보이게 하려는 용도(2026-09-05).
 */
export function Fold({ label, children, defaultOpen = false, className }: { label: string; children: ReactNode; defaultOpen?: boolean; className?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`fold${open ? " open" : ""}${className ? ` ${className}` : ""}`}>
      <button type="button" className="fold-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>{label}</span>
        <Icon.Chev size={16} style={{ transform: open ? "rotate(180deg)" : undefined }} />
      </button>
      <div className="fold-body">{children}</div>
    </div>
  );
}
