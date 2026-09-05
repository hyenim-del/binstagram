"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icons";

/** 휴대폰 전용 하단 4단계 바 — 찾기 → 영상 → 대본 → 변환. 데스크톱에서는 CSS 로 숨긴다(2026-09-05) */
const STEPS = [
  { href: "/overseas-reference", label: "찾기", Ic: Icon.GlobeSearch },
  { href: "/link-videos", label: "영상", Ic: Icon.Film },
  { href: "/reference-script", label: "대본", Ic: Icon.Ref },
  { href: "/reference-convert", label: "변환", Ic: Icon.Convert },
];

export function MobileSteps() {
  const path = usePathname();
  const cur = STEPS.findIndex((s) => path === s.href || path.startsWith(s.href + "/"));
  return (
    <nav className="msteps" aria-label="제작 단계">
      {STEPS.map((s, i) => {
        const active = i === cur;
        const done = cur >= 0 && i < cur;
        return (
          <Link key={s.href} href={s.href} className={`mstep${active ? " active" : ""}${done ? " done" : ""}`} aria-current={active ? "step" : undefined}>
            <span className="mstep-n">{i + 1}</span>
            <s.Ic size={18} />
            <span className="mstep-l">{s.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
