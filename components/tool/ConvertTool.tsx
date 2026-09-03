"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { accountOf, loadDoneJobs } from "@/lib/jobStore";
import { toDisplayTime, toSrt } from "@/lib/srt";
import { buildStoryboardHtml, captureFrames } from "@/lib/storyboard";
import { PreviewPlayer } from "@/components/tool/PreviewPlayer";
import { Combobox } from "@/components/ui/Combobox";
import type { Job, Segment } from "@/lib/types";
import {
  ANALYSIS_FIELDS,
  SECTIONS,
  SECTION_KO,
  charCount,
  normalizeResult,
  retime,
  sectionOf,
  selectedVariant,
  totalSec as linesTotal,
  variantMeta,
  type Analysis,
  type ChatMsg,
  type ConvertOptions,
  type ConvertResult,
  type NewLine,
  type Section,
  type Variant,
  type VariantKey,
} from "@/lib/convert";

const RESULTS_KEY = "bsg.convert.v1";
const TRANS_KEY = "bsg.translate.v1";
const uid = () => Math.random().toString(36).slice(2, 10);

/** 한글 비율로 이미 한국어 대본인지 판단 */
const isKorean = (segs: Segment[]) => {
  const t = segs.map((s) => s.text).join("");
  const letters = t.replace(/[^\p{L}]/gu, "");
  if (!letters) return true;
  const ko = (letters.match(/[가-힣]/g) ?? []).length;
  return ko / letters.length > 0.5;
};
/** 원본 문장 내용으로 만든 캐시 키 */
const transKey = (segs: Segment[]) => {
  const t = segs.map((s) => s.text).join("\n");
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
  return `v2:${segs.length}:${h}`; // v2: 완역 프롬프트(gpt-4o)로 바뀜 — 예전 부분 번역 캐시는 쓰지 않음
};

function parsePasted(text: string): Segment[] {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  let t = 0;
  return lines.map((l) => {
    const m = l.match(/^\[?(\d+(?::\d+)?(?:\.\d+)?)\s*[–-]\s*(\d+(?::\d+)?(?:\.\d+)?)\]?\s*(.*)$/);
    const toSec = (x: string) => {
      const p = x.split(":").map(Number);
      return p.length === 2 ? p[0] * 60 + p[1] : p[0];
    };
    if (m) {
      const s = toSec(m[1]), e = toSec(m[2]);
      t = e;
      return { start: s, end: e, text: m[3] };
    }
    const s = t;
    t += 2.8;
    return { start: s, end: t, text: l.replace(/^\d+[.)]\s*/, "") };
  });
}

const TONES: { id: ConvertOptions["tone"]; label: string }[] = [
  { id: "original", label: "원본 분석대로" },
  { id: "casual", label: "반말" },
  { id: "polite", label: "존댓말" },
];
const LENGTHS: { id: ConvertOptions["length"]; label: string }[] = [
  { id: "same", label: "원본과 같게" },
  { id: "shorter", label: "더 짧게" },
  { id: "longer", label: "더 길게" },
];

/** 안의 문장을 HOOK · BODY · CTA 로 묶는다(원래 순서 유지) */
const groupLines = (lines: NewLine[]) => SECTIONS.map((sec) => ({ sec, items: lines.map((l, i) => ({ l, i })).filter((x) => sectionOf(x.l.role) === sec) }));
const sectionRole = (sec: Section) => (sec === "HOOK" ? "훅" : sec === "CTA" ? "CTA" : "본문");
const fmtRange = (items: { l: NewLine }[]) => (items.length ? `${toDisplayTime(items[0].l.start)} – ${toDisplayTime(items[items.length - 1].l.end)}` : "—");
const secOf = (items: { l: NewLine }[]) => (items.length ? items[items.length - 1].l.end - items[0].l.start : 0);
const chatTrim = (xs: ChatMsg[]) => xs.slice(-30);

export function ConvertTool() {
  const toast = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sourceId, setSourceId] = useState<string>("");
  const [pasted, setPasted] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<ConvertOptions["tone"]>("original");
  const [length, setLength] = useState<ConvertOptions["length"]>("same");
  const [generating, setGenerating] = useState(false);
  const [variantOf, setVariantOf] = useState<string | null>(null); // 다른 버전 추출 중인 결과 id
  const [results, setResults] = useState<ConvertResult[]>([]);
  const [tab, setTab] = useState<"source" | "results" | "compare">("source");
  const [hydrated, setHydrated] = useState(false);
  const [transCache, setTransCache] = useState<Record<string, string[]>>({});
  const [translating, setTranslating] = useState(false);
  /** 3안이 나오면 왼쪽 ①②③ 설정을 레일로 접는다 */
  const [collapsed, setCollapsed] = useState(false);
  /** 「편집하기」로 에디터를 연 결과 id */
  const [editorId, setEditorId] = useState<string | null>(null);
  /** 「새 대본 3안」 탭은 결과를 한 번에 하나만 보여준다 — 쌓아 두면 끝없이 스크롤됨(2026-09-03). null 이면 가장 최근 것 */
  const [viewId, setViewId] = useState<string | null>(null);
  /** 결과 삭제는 한 번 더 물어본다(2026-09-03) */
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    const done = loadDoneJobs();
    setJobs(done);
    if (done.length) setSourceId(done[0].id);
    else setSourceId("paste");
    try {
      const raw = localStorage.getItem(RESULTS_KEY);
      if (raw) setResults((JSON.parse(raw) as ConvertResult[]).map(normalizeResult));
      const tr = localStorage.getItem(TRANS_KEY);
      if (tr) setTransCache(JSON.parse(tr) as Record<string, string[]>);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    let keep = results.slice(0, 20);
    while (keep.length) {
      try {
        localStorage.setItem(RESULTS_KEY, JSON.stringify(keep));
        return;
      } catch {
        keep = keep.slice(0, -1);
      }
    }
  }, [results, hydrated]);

  const sourceJob = jobs.find((j) => j.id === sourceId) ?? null;
  const viewIdx = Math.max(0, results.findIndex((r) => r.id === viewId)); // 못 찾으면(지웠거나 처음) 가장 최근 것
  const viewRes: ConvertResult | null = results[viewIdx] ?? null;
  const segments: Segment[] = useMemo(() => (sourceId === "paste" ? parsePasted(pasted) : sourceJob?.segments ?? []), [sourceId, pasted, sourceJob]);
  const sourceName = sourceId === "paste" ? "붙여넣은 대본" : sourceJob?.fileName ?? "";
  const totalSec = segments.length ? segments[segments.length - 1].end : 0;
  const needsTranslation = segments.length > 0 && !isKorean(segments);
  const tKey = transKey(segments);
  const translations = transCache[tKey] ?? null;

  // 외국어 원본이면 줄별 한국어 번역 (내용 기준 캐시)
  useEffect(() => {
    if (!hydrated || !needsTranslation || translations || translating) return;
    if (sourceId === "paste" && segments.length < 2) return;
    let cancelled = false;
    setTranslating(true);
    (async () => {
      try {
        const r = await fetch("/api/convert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "translate", segments }) });
        const data = (await r.json()) as { translations?: string[]; error?: string };
        if (!r.ok || !data.translations) throw new Error(data.error || "번역 실패");
        if (cancelled) return;
        setTransCache((c) => {
          const next = { ...c, [tKey]: data.translations! };
          const keys = Object.keys(next);
          if (keys.length > 20) delete next[keys[0]];
          try {
            localStorage.setItem(TRANS_KEY, JSON.stringify(next));
          } catch {
            /* ignore */
          }
          return next;
        });
      } catch (e) {
        if (!cancelled) toast(e instanceof Error ? e.message : "번역 실패", "error");
      } finally {
        if (!cancelled) setTranslating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, tKey, needsTranslation]);

  // 원본이 바뀌면 분석 초기화
  useEffect(() => {
    setAnalysis(null);
  }, [sourceId, pasted]);

  const runAnalyze = async () => {
    if (!segments.length) return toast("원본 대본을 먼저 선택하거나 붙여넣어 주세요", "error");
    setAnalyzing(true);
    try {
      const r = await fetch("/api/convert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "analyze", segments }) });
      const data = (await r.json()) as { analysis?: Analysis; error?: string };
      if (!r.ok || !data.analysis) throw new Error(data.error || "분석 실패");
      setAnalysis(data.analysis);
      toast("구조 분석 완료 — 항목을 클릭해 고칠 수 있어요", "ok");
    } catch (e) {
      toast(e instanceof Error ? e.message : "분석 실패", "error");
    } finally {
      setAnalyzing(false);
    }
  };

  const targetOf = (total: number, len: ConvertOptions["length"]) => Math.round(len === "shorter" ? total * 0.75 : len === "longer" ? total * 1.25 : total);

  const runGenerate = async () => {
    if (!segments.length) return toast("원본 대본을 먼저 선택해 주세요", "error");
    if (!topic.trim()) return toast("내 주제·제품을 입력해 주세요", "error");
    setGenerating(true);
    try {
      const options: ConvertOptions = { topic: topic.trim(), tone, length };
      const r = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "generate", segments, analysis: analysis ?? undefined, options }),
      });
      const data = (await r.json()) as { analysis?: Analysis; variants?: Variant[]; error?: string };
      if (!r.ok || !data.variants?.length) throw new Error(data.error || "생성 실패");
      if (!analysis && data.analysis) setAnalysis(data.analysis);
      const res: ConvertResult = {
        id: uid(),
        sourceJobId: sourceJob?.id ?? null,
        sourceName,
        analysis: data.analysis ?? analysis!,
        options,
        lines: data.variants[0].lines,
        reuse: data.variants[0].reuse,
        variants: data.variants,
        selected: null,
        createdAt: Date.now(),
        version: 1,
        sourceSegments: segments,
        targetSec: targetOf(totalSec, length),
      };
      setResults((rs) => [res, ...rs]);
      setViewId(res.id);
      setTab("results");
      setCollapsed(true);
      setEditorId(null);
      toast(`새 대본 ${data.variants.length}안 완료 — 마음에 드는 안에서 「사용하기」`, "ok");
    } catch (e) {
      toast(e instanceof Error ? e.message : "생성 실패", "error");
    } finally {
      setGenerating(false);
    }
  };

  /** 같은 원본·설계·주제로 3안 다시 뽑기 (이전 문장은 피함) */
  const runVariant = async (res: ConvertResult) => {
    const src = res.sourceSegments?.length ? res.sourceSegments : jobs.find((j) => j.id === res.sourceJobId)?.segments ?? (res.sourceName === sourceName ? segments : []);
    if (!src.length) return toast("이 결과의 원본 대본을 찾을 수 없어요 — 왼쪽에서 다시 생성해 주세요", "error");
    setVariantOf(res.id);
    try {
      const siblings = results.filter((r) => r.sourceName === res.sourceName && r.options.topic === res.options.topic);
      const previous = siblings.flatMap((r) => (r.variants ?? []).flatMap((v) => v.lines.map((l) => l.text)));
      const r = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "generate", segments: src, analysis: res.analysis, options: res.options, previous }),
      });
      const data = (await r.json()) as { variants?: Variant[]; error?: string };
      if (!r.ok || !data.variants?.length) throw new Error(data.error || "생성 실패");
      const next: ConvertResult = {
        ...res,
        id: uid(),
        lines: data.variants[0].lines,
        reuse: data.variants[0].reuse,
        variants: data.variants,
        selected: null,
        versions: [],
        chat: [],
        createdAt: Date.now(),
        version: Math.max(0, ...siblings.map((x) => x.version ?? 1)) + 1,
        sourceSegments: src,
        edited: false,
      };
      setResults((rs) => [next, ...rs]);
      setViewId(next.id);
      setTab("results");
      setEditorId(null);
      toast(`다른 버전 v${next.version} · 3안 완료`, "ok");
    } catch (e) {
      toast(e instanceof Error ? e.message : "생성 실패", "error");
    } finally {
      setVariantOf(null);
    }
  };

  /** 결과 하나를 고친다 */
  const updateResult = (id: string, fn: (r: ConvertResult) => ConvertResult) => setResults((rs) => rs.map((r) => (r.id === id ? fn(r) : r)));
  /** 「사용하기」 */
  const useVariant = (res: ConvertResult, key: VariantKey) => {
    updateResult(res.id, (r) => ({ ...r, selected: key }));
    if (editorId === res.id) setEditorId(null);
    toast(`${key}안을 쓰기로 했어요 — 「편집하기」로 다듬을 수 있어요`, "ok");
  };
  const openEditor = (res: ConvertResult) => {
    setEditorId(res.id);
    setCollapsed(true);
  };

  const groups = Array.from(new Set(ANALYSIS_FIELDS.map((f) => f.group)));

  return (
    <div className="convert-stack">
      {collapsed ? (
        <aside className="panel rail" aria-label="설정 접힘">
          <button className="rail-btn" onClick={() => setCollapsed(false)} title="설정 펼치기" aria-label="설정 펼치기">
            <Icon.Chev size={16} style={{ transform: "rotate(-90deg)" }} />
          </button>
          {[
            ["1", "원본", segments.length ? `${segments.length}문장` : "없음", !!segments.length],
            ["2", "분석", analysis ? "13/13" : "자동", !!analysis],
            ["3", "주제", topic.trim() ? "저장됨" : "비어 있음", !!topic.trim()],
          ].map(([n, l, s, ok]) => (
            <button key={String(n)} className="rail-step" onClick={() => setCollapsed(false)} title="설정 펼치기">
              <span className="step-num">{n}</span>
              <span className="rl">{l}</span>
              <span className={`rs${ok ? " ok" : ""}`}>{s}</span>
            </button>
          ))}
          <button className="rail-step again" disabled={!segments.length || !topic.trim() || generating} onClick={runGenerate} title="같은 설정으로 3안 다시 만들기">
            <Icon.Refresh size={16} className={generating ? "spin" : undefined} />
            <span className="rs">{generating ? "쓰는 중" : "3안 다시"}</span>
          </button>
        </aside>
      ) : (
        <section className="panel left-panel">
          <div>
            <h1 className="tool-title">레퍼런스 대본 변환</h1>
            <div className="tool-sub">
              원본을 <b>분석 기준표 13항목</b>으로 뜯어 구조 설계도를 만들고, 그 설계도대로 <b>내 주제의 새 대본을 3안</b>(원본형 · 대화형 · 후킹형) 씁니다. 문장은 베끼지 않아요.
            </div>
          </div>

          {/* 1. 원본 */}
          <div className="card step-card">
            <div className="step-head">
              <span className="step-num">1</span>원본 대본
              <span className="muted tiny" style={{ marginLeft: "auto" }}>
                {jobs.length ? `확보 결과 ${jobs.length}개` : "확보 결과 없음"} · 직접 붙여넣기 가능
              </span>
            </div>
            <select className="control select" value={sourceId} onChange={(e) => setSourceId(e.target.value)} aria-label="원본 대본 선택">
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.speech && j.speech.level !== "ok" ? "⚠ " : ""}
                  {j.fileName} — {j.segments.length}문장 · {j.duration ? `${j.duration.toFixed(0)}s` : ""}
                  {j.speech?.kind === "lyrics" ? " · 노래만" : j.speech?.level === "none" ? " · 말소리 없음" : j.speech?.level === "low" ? " · 말소리 적음" : ""}
                </option>
              ))}
              <option value="paste">직접 붙여넣기…</option>
            </select>
            {sourceJob?.speech && sourceJob.speech.level !== "ok" && (
              <div className={`speech-box ${sourceJob.speech.level}`} role="alert">
                <span className="t">
                  <Icon.Alert size={16} /> {sourceJob.speech.message}
                </span>
                <span className="d">{sourceJob.speech.detail} 이 대본으로 만든 새 대본은 레퍼런스 구조를 제대로 따르지 못해요.</span>
              </div>
            )}
            {sourceId === "paste" ? (
              <textarea className="paste" value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder={"한 줄에 한 문장.\n타임코드가 있으면 [0:00.0–0:02.9] 문장 형식도 인식해요."} />
            ) : segments.length > 0 ? (
              <div className="src-preview">
                {segments.slice(0, 3).map((s, i) => (
                  <div key={i}>
                    <span className="tc">{toDisplayTime(s.start)}</span>
                    <span>
                      {s.text}
                      {needsTranslation && translations?.[i] && <span style={{ display: "block", color: "var(--accent)" }}>{translations[i]}</span>}
                    </span>
                  </div>
                ))}
                <div className="tiny muted">
                  {segments.length > 3 ? `… ${segments.length - 3}문장 더 · ` : ""}총 {totalSec.toFixed(0)}초 · 전체 대본{needsTranslation ? "과 번역" : ""}은 오른쪽 「원본 대본」 탭
                </div>
              </div>
            ) : (
              <div className="tiny muted" style={{ padding: "6px 2px" }}>
                아직 확보한 대본이 없어요.{" "}
                <Link href="/reference-script" style={{ color: "var(--accent)" }}>
                  레퍼런스 대본 확보
                </Link>
                에서 먼저 영상의 대본을 뽑아오세요.
              </div>
            )}
          </div>

          {/* 2. 분석 */}
          <div className="card step-card">
            <div className="step-head">
              <span className="step-num">2</span>구조 분석
              {analysis && <span className="status done" style={{ fontSize: 12 }}>완료</span>}
              <span className="muted tiny" style={{ marginLeft: "auto" }}>
                기준표 13/18 · 썸네일·자막·길이는 영상 필요
              </span>
            </div>
            {analysis ? (
              <div className="analysis">
                {groups.map((g) => (
                  <div key={g} className="analysis-group">
                    <div className={`ag-title ${g === "후킹" ? "role-hook" : g === "CTA" ? "role-cta" : ""}`}>{g}</div>
                    {ANALYSIS_FIELDS.filter((f) => f.group === g).map((f) => (
                      <label key={f.key} className="analysis-row">
                        <span className="ak">{f.label}</span>
                        <input className="av" value={analysis[f.key]} onChange={(e) => setAnalysis({ ...analysis, [f.key]: e.target.value })} title={f.hint} />
                      </label>
                    ))}
                  </div>
                ))}
                <div className="tiny muted">항목을 고치면 그 설계대로 새 대본이 나와요</div>
              </div>
            ) : (
              <button className="btn" onClick={runAnalyze} disabled={!segments.length || analyzing} style={{ alignSelf: "flex-start" }}>
                <Icon.Refresh size={14} /> {analyzing ? "분석 중…" : "구조 분석하기"}
              </button>
            )}
          </div>

          {/* 3. 내 주제 */}
          <div className="card step-card">
            <div className="step-head">
              <span className="step-num">3</span>내 주제 · 제품 · 타겟
            </div>
            <textarea className="paste" style={{ minHeight: 70 }} value={topic} maxLength={1000} onChange={(e) => setTopic(e.target.value)} placeholder="예: 홈카페 드립백 커피 신제품. 타겟은 20대 직장인, 아침 출근 전 3분. 프로필 링크에 첫 주문 20% 할인." />
            <div className="chips-row">
              <span className="tiny muted">말투</span>
              {TONES.map((t) => (
                <button key={t.id} className={`chip-btn${tone === t.id ? " on" : ""}`} onClick={() => setTone(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="chips-row">
              <span className="tiny muted">길이</span>
              {LENGTHS.map((l) => (
                <button key={l.id} className={`chip-btn${length === l.id ? " on" : ""}`} onClick={() => setLength(l.id)}>
                  {l.label}
                </button>
              ))}
              <span className="tiny muted mono" style={{ marginLeft: "auto" }}>
                {topic.length}/1000
              </span>
            </div>
          </div>

          <div className="controls">
            <button className="generate" disabled={!segments.length || !topic.trim() || generating} onClick={runGenerate}>
              {generating ? "3안 쓰는 중… (30초쯤)" : "새 대본 3안 생성"}
            </button>
            <div className="gen-hint">{analysis ? "분석된 설계도를 따라 원본형 · 대화형 · 후킹형을 동시에 씁니다 · 원문 재사용 자동 검사" : "분석을 건너뛰면 생성 시 자동으로 분석합니다"}</div>
          </div>
        </section>
      )}

      <section className="panel right-panel">
        <div className="tabs" role="tablist">
          <button className={`tab${tab === "source" ? " active" : ""}`} role="tab" aria-selected={tab === "source"} onClick={() => setTab("source")}>
            원본 대본{segments.length ? <span className="n">{segments.length}</span> : null}
          </button>
          <button className={`tab${tab === "results" ? " active" : ""}`} role="tab" aria-selected={tab === "results"} onClick={() => setTab("results")}>
            새 대본 3안<span className="n">{results.length}</span>
          </button>
          <button className={`tab${tab === "compare" ? " active" : ""}`} role="tab" aria-selected={tab === "compare"} onClick={() => setTab("compare")}>
            항목 비교
          </button>
        </div>

        {tab === "source" ? (
          <SourceView segments={segments} translations={translations} needsTranslation={needsTranslation} translating={translating} sourceName={sourceName} totalSec={totalSec} />
        ) : tab === "compare" ? (
          <CompareTable analysis={analysis} results={results} sourceName={sourceName} />
        ) : (
          <div className="results">
            {results.length === 0 && (
              <div className="empty">
                아직 변환한 대본이 없어요
                <span className="tiny">왼쪽에서 원본을 고르고 내 주제를 적은 뒤 「새 대본 3안 생성」을 눌러보세요</span>
              </div>
            )}
            {results.length > 0 && (
              <div className="rsel">
                <button className="btn ghost" onClick={() => setViewId(results[Math.max(0, viewIdx - 1)].id)} disabled={viewIdx <= 0} aria-label="더 최근 결과">
                  <Icon.Chev size={16} style={{ transform: "rotate(90deg)" }} />
                </button>
                <Combobox
                  ariaLabel="볼 결과 선택"
                  placeholder="결과 선택"
                  searchPlaceholder="계정 이름·주제 검색"
                  value={viewRes?.id ?? null}
                  onChange={(id) => {
                    setViewId(id);
                    setConfirmDel(false);
                  }}
                  items={results.map((r, i) => ({
                    value: r.id,
                    label: `${i + 1}. ${accountOf(r.sourceName)}`,
                    meta: `${r.options.topic.slice(0, 18)}${r.options.topic.length > 18 ? "…" : ""} · v${r.version ?? 1} · ${new Date(r.createdAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
                  }))}
                />
                <button className="btn ghost" onClick={() => setViewId(results[Math.min(results.length - 1, viewIdx + 1)].id)} disabled={viewIdx >= results.length - 1} aria-label="더 이전 결과">
                  <Icon.Chev size={16} style={{ transform: "rotate(-90deg)" }} />
                </button>
                <span className="tiny muted mono" style={{ whiteSpace: "nowrap" }}>
                  {viewIdx + 1} / {results.length}
                </span>
                {viewRes &&
                  (confirmDel ? (
                    <span className="rsel-confirm" role="alertdialog" aria-label="결과 삭제 확인">
                      <span>
                        <b>{viewIdx + 1}. {accountOf(viewRes.sourceName)}</b> 결과를 지울까요? 3안과 편집 내용이 함께 사라지고 되돌릴 수 없어요.
                      </span>
                      <button
                        className="btn danger"
                        onClick={() => {
                          const id = viewRes.id;
                          setResults((rs) => rs.filter((r) => r.id !== id));
                          if (editorId === id) setEditorId(null);
                          setConfirmDel(false);
                          toast("결과를 지웠어요", "ok");
                        }}
                      >
                        <Icon.Trash size={14} /> 지우기
                      </button>
                      <button className="btn ghost" onClick={() => setConfirmDel(false)}>
                        취소
                      </button>
                    </span>
                  ) : (
                    <button className="btn ghost" onClick={() => setConfirmDel(true)} aria-label="이 결과 삭제" title="이 결과 삭제">
                      <Icon.Trash size={15} /> 삭제
                    </button>
                  ))}
              </div>
            )}
            {viewRes && [viewRes].map((res) => {
              const variants = res.variants ?? [];
              const sel = selectedVariant(res);
              return (
                <article className="job vjob" key={res.id}>
                  <div className="job-head">
                    <span style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                      <span className="file" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {res.options.topic.slice(0, 24)}
                        {res.options.topic.length > 24 ? "…" : ""} · {res.sourceName.replace(/\.[^.]+$/, "")} 구조
                      </span>
                      <span className="status done">{variantOf === res.id ? "다른 버전 쓰는 중…" : `v${res.version ?? 1} · ${variants.length}안 완료`}</span>
                    </span>
                    <span className="muted" style={{ whiteSpace: "nowrap", display: "flex", gap: 8, alignItems: "center" }}>
                      목표 {res.targetSec ?? Math.round(linesTotal(res.lines))}s · {TONES.find((t) => t.id === res.options.tone)?.label}
                      <button className="btn ghost" style={{ height: 28, padding: "0 8px" }} onClick={() => runVariant(res)} disabled={variantOf !== null} title="같은 설계·주제로 3안을 다시 뽑아요">
                        <Icon.Refresh size={13} /> 다시
                      </button>
                    </span>
                  </div>
                  <div className="vhint">
                    <span>
                      같은 설계도로 쓴 {variants.length}가지 안. <b>「사용하기」</b>를 누른 안에 「편집하기」가 생겨요.
                    </span>
                    <span className="vlegend">
                      <i className="hook">HOOK</i>
                      <i className="body">BODY</i>
                      <i className="cta">CTA</i>
                      <span className="mono tiny muted">0:00.0 = 말 시작 초</span>
                    </span>
                  </div>
                  <div className={`vboard n${variants.length}`}>
                    {variants.map((v) => (
                      <VariantCard key={v.key} v={v} tone={res.options.tone} selected={res.selected === v.key} editing={editorId === res.id && res.selected === v.key} onUse={() => useVariant(res, v.key)} onEdit={() => openEditor(res)} />
                    ))}
                  </div>
                  {editorId === res.id && sel && <ScriptEditor res={res} v={sel} update={(fn) => updateResult(res.id, fn)} onReselect={() => setEditorId(null)} />}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- A안 · B안 · C안 카드 ---------- */
function VariantCard({ v, tone, selected, editing, onUse, onEdit }: { v: Variant; tone: ConvertOptions["tone"]; selected: boolean; editing: boolean; onUse: () => void; onEdit: () => void }) {
  const meta = variantMeta(v.style);
  const flags = v.reuse.overlaps.length;
  const total = linesTotal(v.lines);
  return (
    <div className={`vcard${selected ? " sel" : ""}`}>
      <div className="vtop">
        <span className="vkey">{v.key}안</span>
        {selected && <span className="vuse-chip">✓ 사용 중</span>}
        <span className={`vcheck ${flags ? "warn" : "ok"}`}>{flags ? `원문 겹침 ${flags}` : "검증 통과"}</span>
      </div>
      <div className="vname">{meta.name}</div>
      <div className="vdesc">{meta.desc}</div>
      <div className="vstat mono">
        {v.lines.length}문장 · {total.toFixed(1)}s · {tone === "casual" ? "반말" : tone === "polite" ? "존댓말" : "설계도 말투"}
        {v.edited && <span className="role-hook"> · 수정함</span>}
      </div>
      {groupLines(v.lines).map(({ sec, items }) =>
        items.length ? (
          <div key={sec} className={`vsec ${sec.toLowerCase()}`}>
            <div className="vsec-head">
              <span>
                <b>{sec}</b> <span className="muted">{SECTION_KO[sec]} · {items.length}문장</span>
              </span>
              <span className="mono">
                {fmtRange(items)} <span className="muted">· {secOf(items).toFixed(1)}s</span>
              </span>
            </div>
            {items.map(({ l, i }) => {
              const hit = v.reuse.overlaps.find((o) => o.line === i);
              return (
                <div key={i} className={`vline${hit ? " flag" : ""}`}>
                  <span className="mono tc">{toDisplayTime(l.start)}</span>
                  <span>
                    {l.text}
                    {hit && <span className="vflag">⚠ 원문과 겹침 “{hit.snippet}”</span>}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null,
      )}
      <div className="vfoot">
        {selected ? (
          <>
            <button className={`vuse primary${editing ? " on" : ""}`} onClick={onEdit}>
              <PencilIcon /> {editing ? "편집 중" : "편집하기"}
            </button>
            <span className="tiny muted" style={{ textAlign: "center" }}>사용하기를 눌러 이 안을 쓰는 중 · 편집하기 → 문장별 수정 · AI 수정 요청 · 내보내기</span>
          </>
        ) : (
          <button className="vuse" onClick={onUse}>
            사용하기
          </button>
        )}
      </div>
    </div>
  );
}

const PencilIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z" />
    <path d="M13.5 6.5l3 3" />
  </svg>
);

/* ---------- 스크립트 에디터 (사용 중인 안) + AI 코파일럿 ---------- */
type Proposal = { i: number; text: string };

function ScriptEditor({ res, v, update, onReselect }: { res: ConvertResult; v: Variant; update: (fn: (r: ConvertResult) => ConvertResult) => void; onReselect: () => void }) {
  const toast = useToast();
  const meta = variantMeta(v.style);
  const lines = v.lines;
  const total = linesTotal(lines);
  const chars = lines.reduce((n, l) => n + charCount(l.text), 0);
  const target = res.targetSec ?? Math.round(total);
  const [scope, setScope] = useState<Section | "ALL">("ALL");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [compBusy, setCompBusy] = useState(false);
  const [fbBusy, setFbBusy] = useState(false);
  const [targetIn, setTargetIn] = useState("");
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const chat = res.chat ?? [];
  const versions = res.versions ?? [];

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight });
  }, [chat.length, sending]);

  /** 사용 중인 안의 문장을 바꾼다(시간초 다시 계산) */
  const setLines = (next: NewLine[], edited = true) =>
    update((r) => ({
      ...r,
      variants: (r.variants ?? []).map((x) => (x.key === v.key ? { ...x, lines: retime(next), edited: x.edited || edited } : x)),
      edited: r.edited || edited,
    }));
  const pushChat = (...msgs: ChatMsg[]) => update((r) => ({ ...r, chat: chatTrim([...(r.chat ?? []), ...msgs]) }));

  const editLine = (i: number, text: string) => setLines(lines.map((l, k) => (k === i ? { ...l, text } : l)));
  const removeLine = (i: number) => {
    if (lines.length <= 1) return toast("마지막 문장은 지울 수 없어요", "error");
    setLines(lines.filter((_, k) => k !== i));
  };
  const addLine = (sec: Section) => {
    const idx = lines.map((l, i) => ({ l, i })).filter((x) => sectionOf(x.l.role) === sec).pop()?.i;
    const at = idx === undefined ? (sec === "HOOK" ? 0 : lines.length) : idx + 1;
    const next = [...lines];
    next.splice(at, 0, { start: 0, end: 0, role: sectionRole(sec), why: "직접 추가", text: "" });
    setLines(next);
  };

  const saveVersion = () => {
    update((r) => ({ ...r, versions: [{ at: Date.now(), lines }, ...(r.versions ?? [])].slice(0, 10) }));
    toast(`버전 저장 — ${versions.length + 1}번째`, "ok");
  };
  const restore = (s: { at: number; lines: NewLine[] }) => {
    setLines(s.lines);
    setHistoryOpen(false);
    toast("그 버전으로 되돌렸어요", "ok");
  };

  const post = async (body: Record<string, unknown>) => {
    const r = await fetch("/api/convert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await r.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
    if (!r.ok) throw new Error(data.error || `요청 실패 (${r.status})`);
    return data;
  };

  const send = async () => {
    const req = input.trim();
    if (!req || sending) return;
    setSending(true);
    setInput("");
    pushChat({ who: "me", text: req, at: Date.now(), scope });
    try {
      const data = (await post({ mode: "edit", lines, scope, request: req, topic: res.options.topic, analysis: res.analysis })) as { lines?: NewLine[]; reply?: string };
      if (!data.lines?.length) throw new Error("수정 결과가 비어 있어요");
      const changed = data.lines.filter((l, i) => l.text !== lines[i]?.text).length + Math.abs(data.lines.length - lines.length);
      setLines(data.lines);
      pushChat({ who: "ai", text: `${data.reply || "반영했어요"} (바뀐 문장 ${changed}개 · 시간초 다시 계산)`, at: Date.now() });
    } catch (e) {
      pushChat({ who: "ai", text: `실패: ${e instanceof Error ? e.message : "다시 시도해 주세요"}`, at: Date.now() });
    } finally {
      setSending(false);
    }
  };

  const compress = async () => {
    const t = Number(targetIn);
    if (!t) return toast("목표 초를 숫자로 적어 주세요", "error");
    setCompBusy(true);
    try {
      const data = (await post({ mode: "compress", lines, targetSec: t, topic: res.options.topic })) as { proposals?: Proposal[]; reply?: string };
      if (!data.proposals?.length) {
        toast("더 줄일 문장을 찾지 못했어요", "error");
        return;
      }
      setProposals(data.proposals);
      pushChat({ who: "ai", text: `시간 압축 제안 ${data.proposals.length}개 — 왼쪽에서 문장별로 「바꾸기 / 그대로」를 고르세요. ${data.reply ?? ""}`.trim(), at: Date.now() });
    } catch (e) {
      toast(e instanceof Error ? e.message : "압축 제안 실패", "error");
    } finally {
      setCompBusy(false);
    }
  };
  const applyProposal = (p: Proposal) => {
    setLines(p.text ? lines.map((l, k) => (k === p.i ? { ...l, text: p.text } : l)) : lines.filter((_, k) => k !== p.i));
    // 지운 문장 뒤의 제안은 번호가 하나씩 당겨진다
    setProposals((ps) => (ps ?? []).filter((x) => x.i !== p.i).map((x) => (p.text || x.i < p.i ? x : { ...x, i: x.i - 1 })));
  };
  const applyAll = () => {
    const map = new Map(proposals?.map((p) => [p.i, p.text]));
    setLines(lines.map((l, k) => (map.has(k) ? { ...l, text: map.get(k)! } : l)).filter((l) => l.text.trim()));
    setProposals(null);
    toast("제안을 모두 반영했어요", "ok");
  };

  const feedback = async () => {
    setFbBusy(true);
    try {
      const data = (await post({ mode: "feedback", lines, topic: res.options.topic, analysis: res.analysis, segments: res.sourceSegments ?? [] })) as {
        items?: { i: number; kind: string; text: string }[];
        summary?: string;
      };
      const items = data.items ?? [];
      const body = items.length
        ? items.map((x, k) => `${["①", "②", "③"][k]} [${x.kind}] ${toDisplayTime(lines[x.i]?.start ?? 0)} 「${(lines[x.i]?.text ?? "").slice(0, 18)}…」 — ${x.text}`).join("\n")
        : "고칠 것이 없어요 — 없는 숫자·사실 없음, 설계도 약속 지킴.";
      pushChat({ who: "ai", text: `피드백 · 고칠 것 ${items.length}개\n${body}${data.summary ? `\n\n${data.summary}` : ""}`, at: Date.now() });
    } catch (e) {
      toast(e instanceof Error ? e.message : "피드백 실패", "error");
    } finally {
      setFbBusy(false);
    }
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(lines.map((l) => l.text).join("\n"));
      toast("대본을 복사했어요", "ok");
    } catch {
      toast("복사가 막혔어요 — 텍스트를 드래그해서 복사해 주세요", "error");
    }
  };
  /** PDF 스토리보드 — 새 탭에 챕터별·문장별 장면 캡처가 붙은 인쇄용 페이지를 열고, 브라우저 「인쇄 → PDF로 저장」으로 내보낸다 */
  const [pdfBusy, setPdfBusy] = useState(false);
  const exportStoryboard = async () => {
    // 탭은 클릭 직후(사용자 동작 안에서) 열어야 팝업 차단에 안 걸린다 — 캡처는 그 뒤에
    const win = window.open("/storyboard", "_blank");
    if (!win) {
      toast("새 탭이 막혔어요 — 주소창의 팝업 차단을 풀고 다시 눌러 주세요", "error");
      return;
    }
    // 스토리보드 탭이 메시지를 받을 준비가 되면 신호를 보내온다(0.5초마다 반복)
    const ready = new Promise<void>((resolve) => {
      const h = (e: MessageEvent) => {
        if (e.source === win && e.data?.type === "bsg-storyboard-ready") {
          window.removeEventListener("message", h);
          resolve();
        }
      };
      window.addEventListener("message", h);
    });
    setPdfBusy(true);
    try {
      const frames = await captureFrames(res.sourceJobId, lines);
      const job = loadDoneJobs().find((j) => j.id === res.sourceJobId);
      // 레퍼런스 원본 대본과 번역 — 번역은 「원본 대본」 탭이 만든 캐시를 쓰고, 없으면 지금 받아 캐시에 넣는다
      const srcSegs: Segment[] = res.sourceSegments?.length ? res.sourceSegments : job?.segments ?? [];
      let translations: string[] | null = null;
      if (srcSegs.length && !isKorean(srcSegs)) {
        const tk = transKey(srcSegs);
        try {
          const cache = JSON.parse(localStorage.getItem(TRANS_KEY) || "{}") as Record<string, string[]>;
          translations = cache[tk] ?? null;
          if (!translations) {
            const r = await fetch("/api/convert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "translate", segments: srcSegs }) });
            const data = (await r.json()) as { translations?: string[] };
            if (r.ok && data.translations) {
              translations = data.translations;
              localStorage.setItem(TRANS_KEY, JSON.stringify({ ...cache, [tk]: translations }));
            }
          }
        } catch {
          /* 번역 없이 내보낸다 */
        }
      }
      const sourceUrl = job?.note?.match(/https?:\/\/\S+/)?.[0] ?? null;
      const topic = res.options.topic.trim();
      const html = buildStoryboardHtml({
        title: topic ? topic.slice(0, 60) : res.sourceName.replace(/\.[^.]+$/, ""),
        variantLabel: `${v.key}안 ${meta.name}`,
        topic,
        sourceName: res.sourceName.replace(/\.[^.]+$/, ""),
        sourceUrl,
        lines,
        frames,
        createdAt: Date.now(),
        source: { segments: srcSegs, translations },
        // 구조 설계도(13항목)는 PDF에서 뺐다 — 화면의 「항목 비교」 탭에서 본다(2026-09-04)
      });
      await Promise.race([ready, new Promise((r) => setTimeout(r, 10_000))]);
      win.postMessage({ type: "bsg-storyboard", html }, location.origin);
      toast(frames.some(Boolean) ? "스토리보드를 새 탭에 열었어요 — 「PDF로 저장」을 누르세요" : "스토리보드를 열었어요 — 이 대본은 영상이 없어 장면 없이 나가요", "ok");
    } catch (e) {
      win.close();
      toast(e instanceof Error ? e.message : "스토리보드를 만들지 못했어요", "error");
    } finally {
      setPdfBusy(false);
    }
  };

  const exportAll = () => {
    const blob = new Blob([toSrt(lines.map((l) => ({ start: l.start, end: l.end, text: l.text })))], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `새대본_${v.key}안_${res.sourceName.replace(/\.[^.]+$/, "")}.srt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    void copyText();
    toast(`${v.key}안 완성 — SRT 저장 + 텍스트 복사`, "ok");
  };

  return (
    <div className="editor">
      <div className="ed-head">
        <div>
          <span className="ed-tag mono">EDITOR</span>
          <div className="ed-title">
            스크립트 에디터 <span className="role-hook">· {v.key}안 {meta.name}</span>
          </div>
          <div className="ed-sub">사용 중인 {v.key}안을 자유롭게 고치고, 오른쪽 AI 코파일럿에 수정 요청을 보내 반영하세요. 시간초는 고칠 때마다 다시 계산돼요.</div>
        </div>
        <div className="ed-actions">
          <div style={{ position: "relative" }}>
            <button className="pill" onClick={() => setHistoryOpen((o) => !o)} aria-expanded={historyOpen}>
              저장 내역{versions.length ? ` ${versions.length}` : ""}
            </button>
            {historyOpen && (
              <div className="ed-history">
                {versions.length === 0 && <div className="tiny muted" style={{ padding: 8 }}>아직 저장한 버전이 없어요 — 「버전 저장」을 누르면 여기에 쌓여요</div>}
                {versions.map((s) => (
                  <button key={s.at} className="ed-hist-item" onClick={() => restore(s)}>
                    <span className="mono tiny muted">{new Date(s.at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span>
                      {s.lines.length}문장 · {linesTotal(s.lines).toFixed(0)}s · {s.lines[0]?.text.slice(0, 22)}…
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="pill solid" onClick={saveVersion}>
            버전 저장
          </button>
        </div>
      </div>

      {/* 미리보기 — 레퍼런스 영상 위에 지금 대본을 자막처럼 얹어 본다 */}
      <div className="pv-wrap">
        <div className="pv-head">
          <b>미리보기 재생</b>
          <span className="tiny muted">레퍼런스 영상 위에 지금 대본이 자막처럼 올라와요 · 고친 문장이 바로 반영돼요</span>
        </div>
        <PreviewPlayer sourceJobId={res.sourceJobId} lines={lines} sourceSegments={res.sourceSegments ?? []} />
      </div>

      <div className="ed-grid">
        <div className="ed-main">
          {groupLines(lines).map(({ sec, items }) => (
            <div key={sec} className={`ed-block ${sec.toLowerCase()}`}>
              <div className="ed-block-head">
                <span>
                  <b>{sec}</b> <span className="muted">{SECTION_KO[sec]}</span>
                </span>
                <span className="mono">
                  {items.length}문장 · {items.reduce((n, x) => n + charCount(x.l.text), 0)}글자 · {fmtRange(items)} · 약 {Math.round(secOf(items))}초
                </span>
              </div>
              <div className="ed-lines">
                {items.length === 0 && <div className="tiny muted" style={{ padding: "4px 2px" }}>이 구간에 문장이 없어요</div>}
                {items.map(({ l, i }) => {
                  const p = proposals?.find((x) => x.i === i);
                  return (
                    <div key={i} className="ed-line">
                      <span className="mono tc">{toDisplayTime(l.start)}</span>
                      <span style={{ minWidth: 0 }}>
                        <textarea className="line-edit" rows={1} value={l.text} onChange={(e) => editLine(i, e.target.value.replace(/\n/g, " "))} aria-label={`${i + 1}번째 문장`} placeholder="문장을 적어 주세요" />
                        {p && (
                          <div className="ed-prop">
                            <span className="ed-prop-text">{p.text ? `→ ${p.text}` : "→ 이 문장 지우기"}</span>
                            <button className="btn primary" style={{ height: 26, padding: "0 8px", fontSize: 11.5 }} onClick={() => applyProposal(p)}>
                              바꾸기
                            </button>
                            <button className="btn ghost" style={{ height: 26, padding: "0 8px", fontSize: 11.5 }} onClick={() => setProposals((ps) => (ps ?? []).filter((x) => x.i !== i))}>
                              그대로
                            </button>
                          </div>
                        )}
                      </span>
                      <button className="ed-x" onClick={() => removeLine(i)} aria-label="문장 삭제" title="문장 삭제">
                        <Icon.X size={12} />
                      </button>
                    </div>
                  );
                })}
                <button className="ed-add" onClick={() => addLine(sec)}>
                  + 문장 추가
                </button>
              </div>
            </div>
          ))}

          <div className="ed-total">
            <div className="ed-total-line">
              현재 총 분량{" "}
              <b>
                {lines.length}문장 · {chars}글자 · 약 {Math.round(total)}초
              </b>{" "}
              <span className={total <= target + 0.5 ? "ok" : "warn"}>{total <= target + 0.5 ? `목표 ${target}초 안` : `목표 ${target}초보다 ${Math.round(total - target)}초 김`}</span>
            </div>
            <div className="ed-tools">
              <div className="compress">
                <div className="compress-head">
                  <b>시간 압축</b>
                  <span className="muted">최소 10초</span>
                </div>
                <div className="compress-row">
                  <label className="compress-in">
                    목표
                    <input className="mono" type="number" min={10} max={Math.max(10, Math.floor(total - 1))} value={targetIn} onChange={(e) => setTargetIn(e.target.value)} placeholder="N" aria-label="목표 초" />
                    초
                  </label>
                  <button className="pill small" onClick={compress} disabled={compBusy}>
                    {compBusy ? "제안 만드는 중…" : "압축 제안 받기"}
                  </button>
                  {proposals?.length ? (
                    <>
                      <button className="pill small solid" onClick={applyAll}>
                        모두 바꾸기 ({proposals.length})
                      </button>
                      <button className="pill small" onClick={() => setProposals(null)}>
                        제안 닫기
                      </button>
                    </>
                  ) : null}
                </div>
                <div className="tiny muted">현재 대본보다 짧은 시간만 입력할 수 있어요. 제안은 문장별로 「바꾸기 / 그대로」를 고를 수 있어요.</div>
              </div>
              <button className="pill" onClick={feedback} disabled={fbBusy} title="없는 숫자·사실, 설계도 약속, 길이·말투를 검사해 고칠 것 3개만 알려줘요">
                {fbBusy ? "검사 중…" : "피드백 받기"}
              </button>
            </div>
          </div>

          <div className="ed-foot">
            <button className="pill" onClick={onReselect}>
              다시 선택하기
            </button>
            <span style={{ display: "flex", gap: 8 }}>
              <button className="pill" onClick={copyText}>
                텍스트 복사
              </button>
              <button className="pill" onClick={exportAll} title="자막 파일(SRT) 저장 + 텍스트 복사">
                SRT 저장
              </button>
              <button className="pill solid" onClick={exportStoryboard} disabled={pdfBusy} aria-busy={pdfBusy} title="챕터별로 레퍼런스 영상 장면을 붙인 인쇄용 스토리보드 — 새 탭에서 PDF로 저장">
                {pdfBusy ? "장면 캡처 중…" : "PDF 스토리보드"}
              </button>
            </span>
          </div>
        </div>

        <div className="copilot">
          <div className="cp-head">
            <b>AI 코파일럿</b>
            <span className="tiny muted">수정 · 피드백 · 시간 압축</span>
          </div>
          <div className="cp-msgs" ref={chatRef}>
            {chat.length === 0 ? (
              <div className="cp-empty">
                <div className="cp-empty-title">지금 무엇을 바꾸고 싶으세요?</div>
                <div className="tiny muted">수정 요청을 보내면 대화가 시작돼요. 바뀐 문장은 왼쪽에 바로 반영되고 시간초가 다시 계산돼요.</div>
              </div>
            ) : (
              chat.map((m, k) => (
                <div key={k} className={`cp-msg ${m.who}`}>
                  {m.who === "me" && m.scope && m.scope !== "ALL" && <span className="cp-scope">{m.scope}</span>}
                  {m.text}
                </div>
              ))
            )}
            {sending && <div className="cp-msg ai muted">고치는 중…</div>}
          </div>
          <div className="cp-input">
            <div className="scope">
              {(["ALL", ...SECTIONS] as const).map((s) => (
                <button key={s} className={`scope-chip${scope === s ? " on" : ""}`} onClick={() => setScope(s)}>
                  {s === "ALL" ? "전체" : s}
                </button>
              ))}
            </div>
            <textarea
              className="cp-text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="예: HOOK을 더 공격적으로 바꿔줘 / CTA를 상담 유도형으로 바꿔줘 / 전체를 더 짧은 문장으로"
              aria-label="수정 요청"
              disabled={sending}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="pill small solid" onClick={send} disabled={sending || !input.trim()}>
                {sending ? "보내는 중…" : "보내기"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SourceView({
  segments,
  translations,
  needsTranslation,
  translating,
  sourceName,
  totalSec,
}: {
  segments: Segment[];
  translations: string[] | null;
  needsTranslation: boolean;
  translating: boolean;
  sourceName: string;
  totalSec: number;
}) {
  const toast = useToast();
  if (!segments.length) return <div className="empty">왼쪽에서 원본 대본을 고르면 전체 문장과 한글 번역이 여기에 나와요</div>;
  const copyAll = async () => {
    const txt = segments.map((s, i) => (needsTranslation && translations?.[i] ? `${s.text}\n${translations[i]}` : s.text)).join("\n\n");
    try {
      await navigator.clipboard.writeText(txt);
      toast("원본 대본을 복사했어요", "ok");
    } catch {
      toast("복사가 막혔어요 — 텍스트를 드래그해서 복사해 주세요", "error");
    }
  };
  return (
    <div className="results">
      <article className="job">
        <div className="job-head">
          <span style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
            <span className="file" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {sourceName.replace(/\.[^.]+$/, "")}
            </span>
            {needsTranslation && (
              <span className={`status ${translating ? "running" : translations ? "done" : ""}`} style={{ fontSize: 12 }}>
                {translating ? "번역 중…" : translations ? "한글 번역" : "번역 대기"}
              </span>
            )}
          </span>
          <span className="muted" style={{ whiteSpace: "nowrap" }}>
            {segments.length}문장 · {totalSec.toFixed(0)}s
          </span>
        </div>
        <div className="lines" style={{ maxHeight: "none" }}>
          {segments.map((s, i) => (
            <div key={i} className="line orig">
              <span className="tc">
                {toDisplayTime(s.start)}–{toDisplayTime(s.end)}
              </span>
              <span>
                <span className="en">{s.text}</span>
                {needsTranslation && (translations?.[i] ? <span className="ko">{translations[i]}</span> : <span className="ko pending">{translating ? "번역 중…" : "—"}</span>)}
              </span>
            </div>
          ))}
        </div>
        <div className="job-foot">
          <div className="note">{needsTranslation ? "원문 먼저, 그 아래 한글 자막 번역" : "한국어 대본 — 번역 없이 원문만 표시"}</div>
          <div className="btn-row">
            <button className="btn" onClick={copyAll}>
              <Icon.Clip size={14} /> 복사
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}

function CompareTable({ analysis, results, sourceName }: { analysis: Analysis | null; results: ConvertResult[]; sourceName: string }) {
  const latest = results[0];
  const src = analysis ?? latest?.analysis ?? null;
  if (!src) return <div className="empty">먼저 「구조 분석하기」를 누르거나 새 대본을 만들면 여기서 항목별로 비교할 수 있어요</div>;
  return (
    <div className="lines" style={{ maxHeight: "none" }}>
      <div className="compare-row head">
        <span>항목</span>
        <span>원본 · {sourceName}</span>
        <span style={{ color: "var(--accent)" }}>새 대본이 따른 설계</span>
      </div>
      {ANALYSIS_FIELDS.map((f) => (
        <div className="compare-row" key={f.key}>
          <span className="muted">
            <b className={f.group === "후킹" ? "role-hook" : f.group === "CTA" ? "role-cta" : ""} style={{ fontSize: 10.5, marginRight: 6 }}>
              {f.group}
            </b>
            {f.label}
          </span>
          <span>{src[f.key]}</span>
          <span>{latest ? latest.analysis[f.key] : <span className="muted">—</span>}</span>
        </div>
      ))}
      <div className="tiny muted" style={{ padding: "8px 8px 2px" }}>기준표 18항목 중 대본으로 판단 가능한 13항목. 썸네일 카피·표정·색 대비, 자막 스타일, 영상 길이는 영상 화면이 필요해 제외.</div>
    </div>
  );
}
