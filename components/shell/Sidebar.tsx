"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";
import { Icon } from "@/components/ui/icons";

export function Sidebar() {
  const path = usePathname();
  return (
    <nav className="sidebar" aria-label="주 메뉴">
      {NAV.map((g, gi) => (
        <div key={gi}>
          {g.title && <div className="nav-group">{g.title}</div>}
          {g.items.map((it) => {
            const active = path === it.href || path.startsWith(it.href + "/");
            const Ic =
              it.icon === "steps" ? Icon.Steps
              : it.icon === "globe" ? Icon.GlobeSearch
              : it.icon === "film" ? Icon.Film
              : it.icon === "convert" ? Icon.Convert
              : Icon.Ref;
            return (
              <Link key={it.href} href={it.href} className={`nav-item${it.sub ? " sub" : ""}${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
                <Ic size={it.sub ? 16 : 18} />
                <span>{it.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
