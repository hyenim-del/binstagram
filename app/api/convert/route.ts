import { NextResponse } from "next/server";
import type { Segment } from "@/lib/types";
import { ANALYSIS_FIELDS, CPS, SECTIONS, checkReuse, retime, sectionOf, variantMeta, type Analysis, type ConvertOptions, type NewLine, type Section, type Variant, type VariantStyle } from "@/lib/convert";

export const runtime = "nodejs";
export const maxDuration = 120;

const OPENAI = "https://api.openai.com/v1";

function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

async function chatJson<T>(key: string, model: string, system: string, user: string, temperature = 0.3, maxTokens?: number): Promise<T> {
  const r = await fetch(`${OPENAI}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) {
    let msg = `OpenAI 요청 실패 (${r.status})`;
    try {
      const e = (await r.json()) as { error?: { message?: string } };
      if (/no credits|insufficient_quota|quota/i.test(e.error?.message ?? "")) msg = "OpenAI 계정에 크레딧이 없어요 — Billing에서 충전해 주세요";
      else if (e.error?.message) msg = e.error.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const data = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  return JSON.parse(data.choices?.[0]?.message?.content ?? "{}") as T;
}

const scriptText = (segments: Segment[]) => segments.map((s) => `[${s.start.toFixed(1)}–${s.end.toFixed(1)}] ${s.text}`).join("\n");

/** 1단계: 분석 기준표 13항목으로 원본 대본 구조 분석 */
async function analyze(key: string, segments: Segment[]): Promise<Analysis> {
  const fields = ANALYSIS_FIELDS.map((f) => `- ${f.key} (${f.group} · ${f.label}): ${f.hint}`).join("\n");
  const total = segments.length ? segments[segments.length - 1].end : 0;
  const out = await chatJson<Partial<Analysis>>(
    key,
    "gpt-4o-mini",
    "당신은 숏폼(릴스·쇼츠) 대본 분석가입니다. 주어진 타임코드 대본을 아래 항목으로 분석해 JSON 객체 하나로만 답합니다. " +
      "각 값은 한국어 한 줄(30자 이내)로, 항목의 보기 중 하나를 고르고 필요하면 괄호로 근거를 덧붙입니다. 모르면 '판단 어려움'.\n항목:\n" +
      fields,
    `영상 길이: ${total.toFixed(1)}초, 문장 수: ${segments.length}\n\n대본:\n${scriptText(segments)}`,
    0.2
  );
  const analysis = {} as Analysis;
  for (const f of ANALYSIS_FIELDS) analysis[f.key] = String(out[f.key] ?? "판단 어려움").trim();
  return analysis;
}

/** 2단계: 분석(설계도) + 내 주제로 새 대본 생성. 원문 문장 재사용 금지 */
/** 안별 쓰기 규칙 — A 원본형 · B 대화형 · C 후킹형 */
const STYLE_RULE: Record<VariantStyle, string> = {
  original: "안 유형 = 원본형: 레퍼런스와 같은 문장 수·같은 흐름·같은 길이. 설계도의 톤을 그대로 따른다.",
  conversational:
    "안 유형 = 대화형: 친구에게 말하듯 묻고 답하는 대화체('~있으세요?', '~거든요', '~죠'). 질문 → 답 리듬을 살리되 구조·문장 수는 설계도와 같게.",
  hook: "안 유형 = 후킹형: 첫 문장은 결과를 예고하는 강한 훅 한 문장(타겟을 문장 안에 명시), 본문은 짧고 리듬감 있게, CTA는 혜택을 먼저 말한 뒤 행동을 요청. 문장 수는 ±2 허용.",
};

async function generate(key: string, segments: Segment[], analysis: Analysis, opts: ConvertOptions, retryNote = "", style: VariantStyle = "original"): Promise<NewLine[]> {
  const total = segments.length ? segments[segments.length - 1].end : 20;
  const n = segments.length;
  const targetN = opts.length === "shorter" ? Math.max(3, Math.round(n * 0.7)) : opts.length === "longer" ? Math.round(n * 1.3) : n;
  const targetDur = opts.length === "shorter" ? total * 0.75 : opts.length === "longer" ? total * 1.25 : total;
  const toneRule =
    opts.tone === "casual" ? "말투는 친근한 반말." : opts.tone === "polite" ? "말투는 정중한 존댓말." : `말투·톤은 분석 결과(${analysis.tone})를 그대로 따른다.`;
  const design = ANALYSIS_FIELDS.map((f) => `- ${f.group} · ${f.label}: ${analysis[f.key]}`).join("\n");

  const out = await chatJson<{ lines?: Partial<NewLine>[] }>(
    key,
    "gpt-4o",
    "당신은 숏폼 대본 작가입니다. 레퍼런스 대본의 '구조 설계도'(분석 결과)를 그대로 따르되, 문장은 전부 새로 씁니다.\n" +
      "절대 규칙:\n" +
      "1) 레퍼런스의 문장·표현을 그대로 또는 살짝 바꿔 재사용하지 않는다(6글자 이상 연속 일치 금지). 레퍼런스의 소재·제품·사람도 쓰지 않는다.\n" +
      "2) 설계도의 후킹 유형, 타겟 명시, 전개 흐름, 사례·숫자 위치, 전문성 어필 방식, CTA 위치·톤·요구 행동·혜택 제시를 모두 지킨다.\n" +
      "3) 내 주제에서 사실이 아닌 수치·후기·자격을 지어내지 않는다. 구체 수치가 필요하면 [숫자] 같은 대괄호 자리표시를 쓴다.\n" +
      "4) 한 문장은 말로 2~5초 분량(한국어 12~35자, 초당 6.5자). 총 글자 수가 목표 길이에 맞아야 한다 — 문장이 짧으면 문장 수를 늘린다. 타임코드는 0초부터 순서대로 이어지고 마지막 end가 목표 길이와 같다.\n" +
      `5) ${toneRule}\n` +
      `6) ${STYLE_RULE[style]}\n` +
      "출력: JSON {\"lines\": [{\"start\": 초, \"end\": 초, \"role\": \"훅|문제|원인|해결|증거|결론|CTA\", \"why\": \"어느 설계 항목을 따랐는지 12자 내\", \"text\": \"문장\"}]} 만.",
    `## 구조 설계도 (레퍼런스 분석)\n${design}\n\n## 레퍼런스 대본 (참고만, 재사용 금지)\n${scriptText(segments)}\n\n## 내 주제·제품·타겟\n${opts.topic}\n\n## 목표\n문장 수 ${targetN}개 내외, 총 길이 약 ${targetDur.toFixed(0)}초(공백 제외 약 ${Math.round(targetDur * CPS)}글자).${retryNote}`,
    0.8
  );
  const lines = (out.lines ?? [])
    .map((l) => ({
      start: Math.max(0, Number(l.start ?? 0)),
      end: Math.max(0, Number(l.end ?? 0)),
      role: String(l.role ?? "본문").trim(),
      why: String(l.why ?? "").trim(),
      text: String(l.text ?? "").trim(),
    }))
    .filter((l) => l.text);
  // 시간 정리: 순서대로, 겹침 방지
  let t = 0;
  for (const l of lines) {
    if (l.start < t) l.start = t;
    if (l.end <= l.start) l.end = l.start + 2.5;
    t = l.end;
  }
  return lines;
}

/**
 * 원본 대본 줄별 한국어 번역 (영어 등 외국어 원본용)
 *
 * 원칙: 한 줄도, 한 구절도 빠뜨리지 않는다. 자막처럼 짧게 줄이라고 하면 모델이 뒷부분을 잘라 먹는 일이 있어
 * (실제 사례: 60초 가사 한 줄이 "모든걸 다 가진 기분이야"에서 끊김) 요약·축약을 금지하고,
 *  - 40줄씩 나눠 보내 출력이 잘리지 않게 하고
 *  - 번역이 원문 대비 지나치게 짧은 줄은 그 줄만 다시 번역해 더 긴 쪽을 쓴다.
 */
const TRANSLATE_MODEL = "gpt-4o";
const TRANSLATE_BATCH = 40;
const TRANSLATE_SYSTEM =
  "당신은 영상 대본 전문 번역가입니다. 번호가 붙은 각 줄을 한국어로 번역합니다.\n" +
  "규칙:\n" +
  "1) 각 줄의 내용을 처음부터 끝까지 전부 옮깁니다. 요약·축약·생략 금지. 원문이 길면 번역도 그만큼 깁니다.\n" +
  "2) 줄 수와 순서를 그대로 유지합니다 (입력 N줄 → 출력 N줄). 줄을 합치거나 나누지 않습니다.\n" +
  "3) 말투는 자연스러운 구어체(영상 자막 톤). 노래 가사면 가사 느낌을 살리되 모든 구절을 옮깁니다.\n" +
  "4) 이미 한국어인 줄은 그대로 둡니다. 고유명사·브랜드명은 원문 표기를 유지해도 됩니다.\n" +
  '출력: JSON {"lines": ["번역1", "번역2", ...]} 만 (번호 없이).';

/** 번역이 원문에 비해 너무 짧으면(뒷부분 누락 의심) true. 한국어는 보통 영어 글자 수의 40~90% */
function looksTruncated(src: string, ko: string): boolean {
  const a = src.trim().length;
  const b = ko.trim().length;
  if (a < 40) return b === 0;
  return b < a * 0.3;
}

async function translateBatch(key: string, lines: string[]): Promise<string[]> {
  const numbered = lines.map((t, i) => `${i + 1}. ${t}`).join("\n");
  const out = await chatJson<{ lines?: unknown[] }>(key, TRANSLATE_MODEL, TRANSLATE_SYSTEM, numbered, 0, 8000);
  const arr = Array.isArray(out.lines) ? out.lines.map((x) => String(x ?? "").replace(/^\d+[.)]\s*/, "").trim()) : [];
  return lines.map((_, i) => arr[i] ?? "");
}

async function translateOne(key: string, line: string): Promise<string> {
  const out = await chatJson<{ ko?: unknown }>(
    key,
    TRANSLATE_MODEL,
    "다음 문장을 한국어로 빠짐없이 완역합니다. 요약·축약·생략 금지. 원문의 모든 구절이 번역에 들어가야 합니다. " +
      '출력: JSON {"ko": "번역"} 만.',
    line,
    0,
    4000
  );
  return String(out.ko ?? "").trim();
}

async function translate(key: string, segments: Segment[]): Promise<string[]> {
  const lines = segments.map((s) => s.text);
  const result: string[] = new Array(lines.length).fill("");
  for (let i = 0; i < lines.length; i += TRANSLATE_BATCH) {
    const chunk = lines.slice(i, i + TRANSLATE_BATCH);
    const ko = await translateBatch(key, chunk);
    ko.forEach((t, j) => (result[i + j] = t));
  }
  // 누락 의심 줄은 하나씩 다시 — 두 결과 중 더 긴(=더 완전한) 쪽
  await Promise.all(
    lines.map(async (src, i) => {
      if (!looksTruncated(src, result[i])) return;
      try {
        const again = await translateOne(key, src);
        if (again.length > result[i].length) result[i] = again;
      } catch {
        /* 첫 번역 유지 */
      }
    })
  );
  return result;
}

/* ---------- 스크립트 에디터 · AI 코파일럿 ---------- */
const linesText = (lines: NewLine[]) => lines.map((l, i) => `${i + 1}. [${sectionOf(l.role)} · ${l.role}] ${l.text}`).join("\n");
const designText = (analysis?: Analysis) => (analysis ? ANALYSIS_FIELDS.map((f) => `- ${f.group} · ${f.label}: ${analysis[f.key]}`).join("\n") : "(없음)");
const EDIT_RULES =
  "절대 규칙: 사실이 아닌 수치·후기·자격을 지어내지 않는다(필요하면 [숫자] 같은 대괄호 자리표시). 한 문장은 한국어 12~30자, 말로 2~4초. " +
  "각 문장의 role 은 훅|문제|원인|해결|증거|결론|CTA 중 하나. 문장 순서는 훅 → 본문 → CTA.";

/** 수정 요청(범위: 전체 / HOOK / BODY / CTA)을 반영해 문장 전체를 돌려준다 */
async function editLines(key: string, lines: NewLine[], scope: Section | "ALL", request: string, topic: string, analysis?: Analysis) {
  if (!request.trim()) throw new Error("무엇을 바꿀지 적어 주세요");
  const scopeRule =
    scope === "ALL"
      ? "범위: 전체. 요청과 무관한 문장은 그대로 둔다."
      : `범위: ${scope} 구간만. ${scope} 가 아닌 문장은 한 글자도 바꾸지 말고 그대로 돌려준다(role 도 유지).`;
  const out = await chatJson<{ lines?: Partial<NewLine>[]; reply?: string }>(
    key,
    "gpt-4o",
    "당신은 숏폼(릴스·쇼츠) 대본 편집자입니다. 사용자의 수정 요청을 현재 대본에 반영해 대본 전체를 다시 돌려줍니다.\n" +
      `${scopeRule}\n${EDIT_RULES}\n` +
      '출력: JSON {"lines": [{"role": "…", "why": "바꾼 이유 12자 내(안 바꿨으면 빈 문자열)", "text": "문장"}], "reply": "무엇을 어떻게 바꿨는지 한두 문장(존댓말)"} 만.',
    `## 내 주제·제품·타겟\n${topic || "(없음)"}\n\n## 구조 설계도\n${designText(analysis)}\n\n## 현재 대본\n${linesText(lines)}\n\n## 수정 요청\n${request.trim()}`,
    0.5,
    4000,
  );
  const next = (out.lines ?? [])
    .map((l, i) => ({
      role: String(l.role ?? lines[i]?.role ?? "본문").trim(),
      why: String(l.why ?? "").trim() || lines[i]?.why || "",
      text: String(l.text ?? "").trim(),
    }))
    .filter((l) => l.text);
  if (!next.length) throw new Error("수정 결과가 비어 있어요 — 다시 요청해 주세요");
  return { lines: retime(next), reply: String(out.reply ?? "반영했어요").trim() };
}

/** 목표 초에 맞춰 줄이기 — 문장별 제안(빈 문자열 = 삭제 제안) */
async function compressLines(key: string, lines: NewLine[], targetSec: number, topic: string) {
  const cur = lines.reduce((n, l) => n + l.text.replace(/\s/g, "").length, 0);
  const curSec = cur / CPS;
  if (!targetSec || targetSec < 10) throw new Error("목표는 10초 이상으로 적어 주세요");
  if (targetSec >= curSec) throw new Error(`지금 약 ${Math.round(curSec)}초예요 — 그보다 짧은 시간만 입력할 수 있어요`);
  const targetChars = Math.round(targetSec * CPS);
  const out = await chatJson<{ proposals?: { i?: number; text?: string }[]; reply?: string }>(
    key,
    "gpt-4o",
    "당신은 숏폼 대본 편집자입니다. 대본을 목표 길이에 맞게 줄입니다. 핵심(훅·해결·CTA)은 남기고 군더더기·중복·수식어부터 뺍니다. " +
      "문장을 합치거나 지워도 되지만 새 사실을 넣지 않습니다. 말투는 그대로. 목표보다 지나치게 짧게 만들지 않습니다(줄인 뒤 총 글자 수가 목표 글자 수의 85~100%). " +
      '출력: JSON {"proposals": [{"i": 문장 번호(1부터), "text": "줄인 문장(지우려면 빈 문자열)"}], "reply": "무엇을 줄였는지 한두 문장(존댓말)"} 만. 바뀌지 않는 문장은 proposals 에 넣지 않는다.',
    `## 내 주제\n${topic || "(없음)"}\n\n## 현재 대본 (공백 제외 ${cur}글자 ≈ ${curSec.toFixed(0)}초)\n${linesText(lines)}\n\n## 목표\n약 ${targetSec}초 = 공백 제외 약 ${targetChars}글자 이하. 초당 ${CPS}글자 기준.`,
    0.3,
    3000,
  );
  const proposals = (out.proposals ?? [])
    .map((p) => ({ i: Number(p.i) - 1, text: String(p.text ?? "").trim() }))
    .filter((p) => Number.isInteger(p.i) && p.i >= 0 && p.i < lines.length && p.text !== lines[p.i].text);
  return { proposals, reply: String(out.reply ?? "").trim(), targetSec, targetChars };
}

/** 고칠 것 딱 3개 — 없는 숫자·사실, 설계도 약속 위반, 길이·말투 문제 */
async function feedbackLines(key: string, lines: NewLine[], topic: string, analysis?: Analysis, segments: Segment[] = []) {
  const reuse = segments.length ? checkReuse(segments, lines) : null;
  const out = await chatJson<{ items?: { i?: number; kind?: string; text?: string }[]; summary?: string }>(
    key,
    "gpt-4o",
    "당신은 숏폼 대본 검수자입니다. 점수 대신 '고칠 것' 최대 3개만 짚습니다. 우선순위: ① 입력에 없는 숫자·후기·자격을 지어낸 곳 ② 구조 설계도의 약속(타겟 명시, CTA 위치·혜택 등)을 안 지킨 곳 ③ 한 문장에 말이 너무 많거나(30자 초과) 말투가 흔들리는 곳. " +
      "문제가 없으면 items 를 비운다. " +
      '출력: JSON {"items": [{"i": 문장 번호(1부터), "kind": "없는 숫자|없는 사실|설계도 약속|길이|말투 중 하나", "text": "무엇이 문제고 어떻게 고칠지 한 문장(존댓말)"}], "summary": "전체 한 줄 평(존댓말)"} 만.',
    `## 내 주제·제품·타겟 (여기 없는 사실은 '없는 사실')\n${topic || "(없음)"}\n\n## 구조 설계도\n${designText(analysis)}\n\n## 대본\n${linesText(lines)}${
      reuse && reuse.overlaps.length ? `\n\n## 참고: 레퍼런스 원문과 겹친 표현\n${reuse.overlaps.map((o) => `- ${o.line + 1}번: "${o.snippet}"`).join("\n")}` : ""
    }`,
    0.2,
    1500,
  );
  const items = (out.items ?? [])
    .map((x) => ({ i: Number(x.i) - 1, kind: String(x.kind ?? "").trim(), text: String(x.text ?? "").trim() }))
    .filter((x) => x.text && Number.isInteger(x.i) && x.i >= 0 && x.i < lines.length)
    .slice(0, 3);
  return { items, summary: String(out.summary ?? "").trim(), sections: SECTIONS };
}

export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return fail(500, "서버에 OPENAI_API_KEY가 설정되지 않았어요 (.env.local 확인)");

  let body: {
    mode?: "analyze" | "generate" | "translate" | "edit" | "compress" | "feedback";
    segments?: Segment[];
    analysis?: Analysis;
    options?: ConvertOptions;
    previous?: string[];
    style?: VariantStyle;
    lines?: NewLine[];
    scope?: Section | "ALL";
    request?: string;
    targetSec?: number;
    topic?: string;
  };
  try {
    body = await req.json();
  } catch {
    return fail(400, "요청 형식이 올바르지 않아요");
  }
  const segments = (body.segments ?? []).filter((s) => s && typeof s.text === "string" && s.text.trim());
  const mode = body.mode ?? "generate";

  try {
    // ----- 에디터 계열: 원본 대본 없이 현재 문장만 받는다 -----
    if (mode === "edit" || mode === "compress" || mode === "feedback") {
      const lines = (body.lines ?? []).filter((l) => l && typeof l.text === "string" && l.text.trim());
      if (!lines.length) return fail(400, "고칠 문장이 없어요");
      if (mode === "edit") return NextResponse.json(await editLines(key, lines, body.scope ?? "ALL", body.request ?? "", body.topic ?? "", body.analysis));
      if (mode === "compress") return NextResponse.json(await compressLines(key, lines, Number(body.targetSec) || 0, body.topic ?? ""));
      return NextResponse.json(await feedbackLines(key, lines, body.topic ?? "", body.analysis, segments));
    }

    if (segments.length === 0) return fail(400, "원본 대본이 비어 있어요");
    if (mode === "translate") {
      const translations = await translate(key, segments);
      return NextResponse.json({ translations });
    }
    if (mode === "analyze") {
      const analysis = await analyze(key, segments);
      return NextResponse.json({ analysis });
    }

    const opts = body.options;
    if (!opts?.topic?.trim()) return fail(400, "내 주제·제품을 입력해 주세요");
    const analysis = body.analysis ?? (await analyze(key, segments));

    const prev = (body.previous ?? []).filter((x) => typeof x === "string" && x.trim()).slice(0, 40);
    const variantNote = prev.length
      ? `\n\n※ 이미 만든 이전 버전(아래)과는 다른 표현·다른 예시·다른 어순으로 새로 쓴다. 이전 버전 문장을 그대로 또는 살짝 바꿔 쓰지 않는다.\n${prev.map((l) => `- ${l}`).join("\n")}`
      : "";
    // A·B·C 세 안을 동시에 쓴다(style 을 지정하면 그 안만)
    const styles: VariantStyle[] = body.style ? [body.style] : ["original", "conversational", "hook"];
    const variants: Variant[] = await Promise.all(
      styles.map(async (style) => {
        let lines = await generate(key, segments, analysis, opts, variantNote, style);
        let reuse = checkReuse(segments, lines);
        if (reuse.identical > 0 || reuse.overlaps.length > Math.ceil(lines.length / 3)) {
          // 재사용이 많으면 한 번 다시 쓰기
          const bad = reuse.overlaps.map((o) => `"${o.snippet}"`).slice(0, 6).join(", ");
          lines = await generate(key, segments, analysis, opts, `${variantNote}\n\n※ 이전 시도에서 레퍼런스와 겹친 표현: ${bad}. 이 표현들은 절대 쓰지 말고 완전히 다른 말로 쓴다.`, style);
          reuse = checkReuse(segments, lines);
        }
        return { key: variantMeta(style).key, style, lines: retime(lines), reuse };
      }),
    );
    return NextResponse.json({ analysis, variants, lines: variants[0].lines, reuse: variants[0].reuse });
  } catch (e) {
    return fail(502, e instanceof Error ? e.message : "변환 중 오류가 났어요");
  }
}
