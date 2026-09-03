"use client";

import { useEffect, useState } from "react";

const CUES = [
  { tc: "0:00.0–0:02.9", text: "자, 이 장면 잘 보세요." },
  { tc: "0:02.9–0:05.8", text: "여기서 딱 3초만 멈춰볼게요." },
  { tc: "0:05.8–0:08.6", text: "이게 핵심인데요, 처음엔 아무도 안 믿었어요." },
  { tc: "0:08.6–0:11.5", text: "비결은 생각보다 단순합니다." },
];

export function SamplePanel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % CUES.length), 2600);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="results">
      <div className="sample-box" aria-hidden="true">
        <span className="label">예시 화면</span>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(232,236,242,0.14)" }} />
        <div className="caption-wrap" style={{ bottom: 22 }}>
          <span className="caption">{CUES[i].text}</span>
        </div>
      </div>
      <p className="small" style={{ color: "var(--ink-2)", margin: 0 }}>
        이렇게 나옵니다 — 영상 위에 <b style={{ color: "var(--ink)" }}>말한 문장이 자막으로 동기 표시</b>되고, 아래에 타임코드가 붙은 대본이 정리됩니다. 왼쪽에 영상을 올리고 「대본 생성」을 눌러보세요.
      </p>
      <div className="lines" style={{ maxHeight: "none" }}>
        <div className="lines-head">
          <span>예시 대본 (실제 영상과 무관)</span>
        </div>
        {CUES.map((c, k) => (
          <div key={k} className={`line${k === i ? " active" : ""}`}>
            <span className="tc">{c.tc}</span>
            <span>{c.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
