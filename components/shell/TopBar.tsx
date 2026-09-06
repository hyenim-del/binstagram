"use client";

import Link from "next/link";

export function TopBar() {
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
        <Link href="/steps" className="help-link" title="처음 오셨다면 사용 설명서">
          설명서
        </Link>
        <span className="avatar" aria-label="프로필">
          h
        </span>
      </div>
    </header>
  );
}
