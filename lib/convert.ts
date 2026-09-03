import type { Segment } from "./types";

/** 분석 기준표(xlsx) 중 대본만으로 판단 가능한 13항목 */
export const ANALYSIS_FIELDS = [
  { key: "hookType", group: "후킹", label: "첫 문장 유형", hint: "질문형 / 반전형 / 숫자형 / 공감형 / 경고형" },
  { key: "hookTarget", group: "후킹", label: "타겟 명시", hint: "명시(누구) / 미명시" },
  { key: "hookMode", group: "후킹", label: "정보 vs 감정", hint: "정보형 / 감정형 / 혼합형" },
  { key: "hookLength", group: "후킹", label: "후킹 길이", hint: "예: 4초 / 12단어" },
  { key: "flow", group: "본문", label: "전개 흐름", hint: "예: 문제-원인-해결-증거-결론" },
  { key: "evidence", group: "본문", label: "사례·숫자 위치", hint: "예: 중반 1회, 후반 2회" },
  { key: "authority", group: "본문", label: "전문성 어필", hint: "자격·경력형 / 결과물형 / 스토리형 / 없음" },
  { key: "density", group: "본문", label: "정보 밀도", hint: "예: 30초 / 3포인트" },
  { key: "ctaPosition", group: "CTA", label: "CTA 위치", hint: "끝부분만 / 중간+끝 / 도입부 예고 / 없음" },
  { key: "ctaTone", group: "CTA", label: "CTA 문구 톤", hint: "명령형 / 제안형 / 희소성형 / 궁금증형" },
  { key: "ctaAction", group: "CTA", label: "요구 행동", hint: "댓글 / DM / 프로필링크 / 저장·공유 / 없음" },
  { key: "ctaBenefit", group: "CTA", label: "혜택 선행 제시", hint: "혜택 먼저 / 행동 요청만 / 둘 다 없음" },
  { key: "tone", group: "기타", label: "말투·톤", hint: "존댓말/반말 · 에너지 · 반복어" },
] as const;

export type AnalysisKey = (typeof ANALYSIS_FIELDS)[number]["key"];
export type Analysis = Record<AnalysisKey, string>;

export type NewLine = {
  start: number;
  end: number;
  role: string; // 훅 / 문제 / 원인 / 해결 / 증거 / 결론 / CTA …
  why: string; // 이 문장이 어느 분석 항목을 따르는지
  text: string;
};

export type ReuseReport = {
  identical: number; // 원문과 같은 문장 수
  overlaps: { line: number; snippet: string }[]; // 원문과 6글자 이상 겹치는 구간
  total: number;
};

export type ConvertOptions = {
  topic: string;
  tone: "original" | "casual" | "polite";
  length: "same" | "shorter" | "longer";
};

/* ---------- A안·B안·C안 (원본형 · 대화형 · 후킹형) ---------- */
export type VariantKey = "A" | "B" | "C";
export type VariantStyle = "original" | "conversational" | "hook";
export const VARIANT_STYLES: { key: VariantKey; style: VariantStyle; name: string; desc: string }[] = [
  { key: "A", style: "original", name: "원본형", desc: "레퍼런스의 흐름·문장 수·길이를 그대로 따라 씀" },
  { key: "B", style: "conversational", name: "대화형", desc: "친구에게 말하듯 묻고 답하는 말투 · 구조는 같음" },
  { key: "C", style: "hook", name: "후킹형", desc: "첫 문장을 결과 예고로 세게 · 타겟 명시 · CTA에 혜택" },
];
export const variantMeta = (style: VariantStyle) => VARIANT_STYLES.find((v) => v.style === style) ?? VARIANT_STYLES[0];

export type Variant = {
  key: VariantKey;
  style: VariantStyle;
  lines: NewLine[];
  reuse: ReuseReport;
  edited?: boolean;
};

/** 대본 구간 — 문장의 role(훅/문제/…/CTA)을 HOOK · BODY · CTA 셋으로 묶는다 */
export type Section = "HOOK" | "BODY" | "CTA";
export const SECTIONS: Section[] = ["HOOK", "BODY", "CTA"];
export const SECTION_KO: Record<Section, string> = { HOOK: "훅", BODY: "본문", CTA: "CTA" };
export const sectionOf = (role: string): Section => (/훅|hook/i.test(role) ? "HOOK" : /cta/i.test(role) ? "CTA" : "BODY");

/**
 * 시간초 계산 — 한국어 말속도를 초당 6.5글자(공백 제외)로 잡는다(훅AI 표기와 비슷: 24글자 ≈ 4초).
 * 문장을 고칠 때마다 이걸로 다시 계산하므로 모델이 준 타임코드에 의존하지 않는다.
 */
export const CPS = 6.5;
export const MIN_LINE_SEC = 1.2;
const r1 = (x: number) => Math.round(x * 10) / 10;
export const charCount = (text: string) => text.replace(/\s/g, "").length;
export const estSec = (text: string) => Math.max(MIN_LINE_SEC, charCount(text) / CPS);
export function retime<T extends { text: string }>(lines: T[]): (T & { start: number; end: number })[] {
  let t = 0;
  return lines.map((l) => {
    const s = t;
    t = r1(t + estSec(l.text));
    return { ...l, start: s, end: t };
  });
}
export const totalSec = (lines: { end: number }[]) => (lines.length ? lines[lines.length - 1].end : 0);

export type ChatMsg = { who: "me" | "ai"; text: string; at: number; scope?: Section | "ALL" };
export type Snapshot = { at: number; lines: NewLine[] };

export type ConvertResult = {
  id: string;
  sourceJobId: string | null;
  sourceName: string;
  analysis: Analysis;
  options: ConvertOptions;
  /** 예전 저장분 호환 — 지금은 variants 를 쓴다(A안 문장과 같음) */
  lines: NewLine[];
  reuse: ReuseReport;
  createdAt: number;
  version?: number; // 같은 원본·주제에서 몇 번째 버전인지
  sourceSegments?: Segment[]; // 다른 버전 추출용 원본
  edited?: boolean; // 사용자가 문장을 직접 고쳤는지
  variants?: Variant[];
  /** 「사용하기」를 누른 안 */
  selected?: VariantKey | null;
  /** 「버전 저장」 스냅샷(사용 중인 안 기준) */
  versions?: Snapshot[];
  /** AI 코파일럿 대화 */
  chat?: ChatMsg[];
  /** 목표 길이(초) — 원본 길이 또는 길이 옵션 반영 */
  targetSec?: number;
};

/** 예전 저장분(안 1개)을 3안 구조로 맞춘다 */
export function normalizeResult(r: ConvertResult): ConvertResult {
  if (r.variants?.length) return r;
  return { ...r, variants: [{ key: "A", style: "original", lines: r.lines, reuse: r.reuse, edited: r.edited }], selected: r.selected ?? null };
}
export const selectedVariant = (r: ConvertResult): Variant | null => r.variants?.find((v) => v.key === r.selected) ?? null;

const norm = (s: string) => s.replace(/[\s.,!?~…·"'“”‘’()\[\]-]/g, "").toLowerCase();

/** 원문 재사용 검사: 문장 단위 동일 + 6글자 이상 연속 일치 */
export function checkReuse(source: Segment[], lines: NewLine[], minRun = 6): ReuseReport {
  const srcNorm = source.map((s) => norm(s.text));
  const srcJoined = srcNorm.join("|");
  let identical = 0;
  const overlaps: ReuseReport["overlaps"] = [];
  lines.forEach((l, i) => {
    const n = norm(l.text);
    if (!n) return;
    if (srcNorm.includes(n)) {
      identical++;
      overlaps.push({ line: i, snippet: l.text });
      return;
    }
    // 6글자 창을 밀며 원문에 포함되는지
    for (let k = 0; k + minRun <= n.length; k++) {
      const win = n.slice(k, k + minRun);
      if (srcJoined.includes(win)) {
        // 겹치는 최대 길이까지 확장
        let end = k + minRun;
        while (end < n.length && srcJoined.includes(n.slice(k, end + 1))) end++;
        overlaps.push({ line: i, snippet: n.slice(k, end) });
        break;
      }
    }
  });
  return { identical, overlaps, total: lines.length };
}
