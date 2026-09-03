"use client";

import { useEffect } from "react";

/**
 * 「PDF 스토리보드」가 열리는 탭. 대본 변환 화면이 window.open 으로 이 페이지를 연 뒤,
 * 장면 캡처가 끝나면 postMessage 로 완성된 HTML 을 보낸다. 받은 HTML 로 문서를 통째로 바꾸고
 * 이 탭의 sessionStorage 에도 넣어 두어 새로 고침해도 그대로 보인다.
 */
const KEY = "bsg.storyboard.v1";
const STORYBOARD_MSG = "bsg-storyboard";
const STORYBOARD_READY_MSG = "bsg-storyboard-ready";

export default function Page() {
  useEffect(() => {
    const show = (html: string) => {
      document.open();
      document.write(html);
      document.close();
      // 앱 레이아웃의 제목 처리가 남아 탭 제목을 도로 "BinStaGram" 으로 바꾸는 일이 있어, 문서의 <title> 을 다시 적용한다
      const t = html.match(/<title>([^<]*)<\/title>/i)?.[1];
      if (t) setTimeout(() => { document.title = t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"'); }, 300);
    };
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved) {
        show(saved);
        return;
      }
    } catch {
      /* ignore */
    }
    let iv: ReturnType<typeof setInterval> | null = null;
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== location.origin || !e.data || e.data.type !== STORYBOARD_MSG || typeof e.data.html !== "string") return;
      window.removeEventListener("message", onMsg);
      if (iv) clearInterval(iv);
      try {
        sessionStorage.setItem(KEY, e.data.html);
      } catch {
        /* 너무 크면 새로 고침 복원만 포기 */
      }
      show(e.data.html);
    };
    window.addEventListener("message", onMsg);
    // 연 쪽이 언제 준비되든 받을 수 있게 준비 신호를 반복해서 보낸다
    const ping = () => window.opener?.postMessage({ type: STORYBOARD_READY_MSG }, location.origin);
    ping();
    iv = setInterval(ping, 500);
    return () => {
      if (iv) clearInterval(iv);
      window.removeEventListener("message", onMsg);
    };
  }, []);
  return (
    <section className="panel right-panel" style={{ minHeight: 200, justifyContent: "center", alignItems: "center", color: "var(--ink-3)" }}>
      스토리보드를 만드는 중이에요 — 레퍼런스 영상에서 장면을 캡처하고 있어요 (몇 초)
    </section>
  );
}
