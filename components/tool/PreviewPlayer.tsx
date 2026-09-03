"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadMedia } from "@/lib/mediaStore";
import { toDisplayTime } from "@/lib/srt";
import { sectionOf, type NewLine } from "@/lib/convert";
import type { Segment } from "@/lib/types";

/**
 * 미리보기 재생 — 레퍼런스 영상을 틀고 그 위에 지금 대본을 자막처럼 얹어 릴스가 어떻게 보일지 본다(2026-09-03).
 * 새 대본의 길이는 원본과 다르므로 비율로 맞춘다(새 대본 5.5초 = 영상 10초). 「원본 대본」은 실제 시각 그대로.
 * 자막 위치(상단·중앙·하단)는 브라우저에 기억한다.
 */
type Pos = "top" | "mid" | "bot";
type Src = "new" | "orig";
const POS_KEY = "bsg.preview.pos";
const POSITIONS: { id: Pos; label: string }[] = [
  { id: "top", label: "상단" },
  { id: "mid", label: "중앙" },
  { id: "bot", label: "하단" },
];

type Props = {
  sourceJobId: string | null;
  lines: NewLine[];
  sourceSegments: Segment[];
};

export function PreviewPlayer({ sourceJobId, lines, sourceSegments }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "none">("loading");
  const [duration, setDuration] = useState(0);
  const [t, setT] = useState(0);
  const [pos, setPos] = useState<Pos>("bot");
  const [src, setSrc] = useState<Src>("new");

  useEffect(() => {
    try {
      const p = localStorage.getItem(POS_KEY) as Pos | null;
      if (p === "top" || p === "mid" || p === "bot") setPos(p);
    } catch {
      /* ignore */
    }
  }, []);
  const pickPos = (p: Pos) => {
    setPos(p);
    try {
      localStorage.setItem(POS_KEY, p);
    } catch {
      /* ignore */
    }
  };

  // 원본 영상은 브라우저(IndexedDB)에 저장된 사본을 쓴다
  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    setStatus("loading");
    (async () => {
      const blob = sourceJobId ? await loadMedia(sourceJobId) : null;
      if (!alive) return;
      if (!blob || !blob.type.startsWith("video")) {
        setStatus("none");
        return;
      }
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
      setStatus("ready");
    })();
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sourceJobId]);

  const newTotal = lines.length ? lines[lines.length - 1].end : 0;
  const scale = duration && newTotal ? duration / newTotal : 1; // 영상 초 = 대본 초 × scale

  /** 지금 화면에 올릴 문장 */
  const active = useMemo(() => {
    if (src === "orig") {
      const s = sourceSegments.find((x) => t >= x.start && t < x.end);
      return s ? { text: s.text, sub: `원본 ${toDisplayTime(s.start)}`, sec: null as string | null } : null;
    }
    const st = t / scale;
    const i = lines.findIndex((l) => st >= l.start && st < l.end);
    if (i < 0) return null;
    const l = lines[i];
    return { text: l.text, sub: `${String(i + 1).padStart(2, "0")} · ${toDisplayTime(l.start)} – ${toDisplayTime(l.end)}`, sec: sectionOf(l.role) };
  }, [t, scale, lines, sourceSegments, src]);

  const seekToLine = (l: NewLine) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(Math.max(0, l.start * scale + 0.02), Math.max(0, duration - 0.05));
    v.play().catch(() => {});
  };

  if (status === "none") {
    return (
      <div className="pv none">
        <span>이 대본은 원본 영상이 없어 미리보기를 틀 수 없어요 — 「레퍼런스 대본 확보」에서 영상으로 뽑은 대본이어야 해요.</span>
      </div>
    );
  }

  return (
    <div className="pv">
      <div className="pv-stage">
        {url ? (
          <video
            ref={videoRef}
            src={url}
            controls
            playsInline
            preload="metadata"
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
            onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
            onSeeked={(e) => setT(e.currentTarget.currentTime)}
          />
        ) : (
          <div className="pv-loading">영상 불러오는 중…</div>
        )}
        {active && (
          <div className={`pv-cap ${pos}`} aria-live="polite">
            <span className="pv-cap-text">{active.text}</span>
          </div>
        )}
      </div>

      <div className="pv-side">
        <div className="pv-row">
          <span className="pv-lbl">자막 위치</span>
          <div className="pv-chips">
            {POSITIONS.map((p) => (
              <button key={p.id} className={`chip-btn${pos === p.id ? " on" : ""}`} onClick={() => pickPos(p.id)} aria-pressed={pos === p.id}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="pv-row">
          <span className="pv-lbl">올릴 대본</span>
          <div className="pv-chips">
            <button className={`chip-btn${src === "new" ? " on" : ""}`} onClick={() => setSrc("new")} aria-pressed={src === "new"}>
              새 대본
            </button>
            <button className={`chip-btn${src === "orig" ? " on" : ""}`} onClick={() => setSrc("orig")} aria-pressed={src === "orig"} disabled={!sourceSegments.length} title={sourceSegments.length ? "레퍼런스가 실제로 말한 문장" : "원본 대본이 저장돼 있지 않아요"}>
              원본 대본
            </button>
          </div>
        </div>
        <div className="pv-now">
          {active ? (
            <>
              <span className="pv-now-meta mono">
                {active.sec && <i className={`pv-sec ${active.sec.toLowerCase()}`}>{active.sec}</i>}
                {active.sub}
              </span>
              <span className="pv-now-text">{active.text}</span>
            </>
          ) : (
            <span className="tiny muted">재생하면 그 시점의 문장이 여기와 영상 위에 나와요</span>
          )}
        </div>
        <div className="pv-lines">
          {lines.map((l, i) => {
            const on = src === "new" && active?.sub?.startsWith(String(i + 1).padStart(2, "0"));
            return (
              <button key={i} className={`pv-line${on ? " on" : ""}`} onClick={() => seekToLine(l)} title="이 문장 시점으로 이동">
                <span className="mono tc">{toDisplayTime(l.start)}</span>
                <span className="tx">{l.text}</span>
              </button>
            );
          })}
        </div>
        <div className="tiny muted">
          새 대본 {newTotal.toFixed(1)}초를 영상 {duration ? duration.toFixed(1) : "—"}초에 비율로 맞춰 보여줘요 · 문장을 누르면 그 시점으로 이동
        </div>
      </div>
    </div>
  );
}
