"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";

export function TopBar() {
  const toast = useToast();
  return (
    <header className="topbar">
      <Link href="/reference-script" className="brand" aria-label="BinStaGram 홈">
        <span className="brand-mark">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 5v14l11-7z" fill="#0E1116" />
          </svg>
        </span>
        <span className="brand-name">BinStaGram</span>
      </Link>
      <div className="topbar-actions">
        <button className="icon-btn" aria-label="알림" onClick={() => toast("새 알림이 없어요")}>
          <Icon.Bell size={20} />
        </button>
        <span className="avatar" aria-label="프로필">
          h
        </span>
      </div>
    </header>
  );
}
