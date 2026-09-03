import { NextResponse } from "next/server";
import type { Segment, SpeechCheck, TranscribeResponse } from "@/lib/types";
import { MAX_BYTES } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const OPENAI = "https://api.openai.com/v1";

type WhisperSegment = { start: number; end: number; text: string; no_speech_prob?: number; avg_logprob?: number; compression_ratio?: number };
type WhisperVerbose = { language?: string; duration?: number; text?: string; segments?: WhisperSegment[] };

function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * 말소리 판정. 배경음악·무음뿐인 릴스에 Whisper 를 돌리면 엉뚱한 언어로 없는 문장을 지어낸다(환각).
 * Whisper 가 구간마다 주는 무음 확률(no_speech_prob)·평균 로그확률(avg_logprob)·압축비(compression_ratio)를
 * Whisper 자체 기준(0.6 / -1.0 / 2.4)으로 보고, 믿을 만한 구간의 길이가 전체의 몇 %인지로 등급을 매긴다.
 */
/** Whisper 가 무음·음악에서 자주 지어내는 상투구(학습 데이터의 자막 크레딧·인사말) */
const HALLUCINATION_RE =
  /ご視聴|ご覧いただき|ありがとうございました|チャンネル登録|thanks? (you )?for watching|subscribe|subtitles? by|amara\.org|시청해\s*주셔서|구독과 좋아요|감사합니다\.?$|谢谢观看|请不吝点赞|字幕/i;

/** 텍스트의 주된 문자 체계 — 감지 언어와 어긋나면(예: nynorsk 인데 한글) 환각으로 본다 */
function scriptOf(text: string): "hangul" | "kana" | "han" | "latin" | "other" {
  const n = { hangul: 0, kana: 0, han: 0, latin: 0 };
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    if ((c >= 0xac00 && c <= 0xd7a3) || (c >= 0x1100 && c <= 0x11ff) || (c >= 0x3130 && c <= 0x318f)) n.hangul++;
    else if ((c >= 0x3040 && c <= 0x30ff) || (c >= 0xff66 && c <= 0xff9f)) n.kana++;
    else if (c >= 0x4e00 && c <= 0x9fff) n.han++;
    else if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) || (c >= 0xc0 && c <= 0x24f)) n.latin++;
  }
  const best = (Object.entries(n) as [keyof typeof n, number][]).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : "other";
}
function scriptMismatch(language: string | undefined, text: string): boolean {
  const lang = (language ?? "").toLowerCase();
  const sc = scriptOf(text);
  if (sc === "other") return false;
  if (sc === "hangul") return lang !== "korean";
  if (sc === "kana") return lang !== "japanese";
  if (sc === "han") return !/japanese|chinese|cantonese/.test(lang);
  // 라틴 문자인데 한국어·일본어·중국어로 감지
  return /korean|japanese|chinese|cantonese|thai|arabic|hebrew|russian|ukrainian|greek|hindi|bengali|urdu|persian/.test(lang);
}

function assessSpeech(raw: WhisperSegment[], total: number, language?: string): SpeechCheck {
  const dur = (s: WhisperSegment) => Math.max(0, s.end - s.start);
  const seen = new Map<string, number>();
  for (const s of raw) {
    const k = (s.text ?? "").trim().toLowerCase();
    if (k) seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  const mismatch = scriptMismatch(language, raw.map((s) => s.text ?? "").join(" "));
  const suspicious = (s: WhisperSegment) =>
    mismatch ||
    (s.no_speech_prob ?? 0) > 0.55 ||
    (s.avg_logprob ?? 0) < -1.0 ||
    (s.compression_ratio ?? 0) > 2.4 ||
    HALLUCINATION_RE.test((s.text ?? "").trim()) ||
    (seen.get((s.text ?? "").trim().toLowerCase()) ?? 0) >= 3; // 같은 문장 반복 = 전형적인 환각
  const speechSec = raw.filter((s) => !suspicious(s)).reduce((n, s) => n + dur(s), 0);
  const badSec = raw.filter(suspicious).reduce((n, s) => n + dur(s), 0);
  const base = Math.max(total, speechSec + badSec, 0.1);
  const coverage = Math.min(1, speechSec / base);
  const pct = Math.round(coverage * 100);
  const badPct = Math.round(Math.min(1, badSec / base) * 100);
  // 말이 있는 릴스는 보통 길이의 60% 이상이 말로 채워진다. 30% 미만이면 배경음악·무음 영상으로 본다
  if (raw.length === 0 || coverage < 0.3) {
    return {
      level: "none",
      message: "말소리가 거의 없는 영상이에요",
      detail: `말로 인식된 구간이 전체의 ${pct}%뿐이에요(무음·음악으로 판정된 구간 ${badPct}%). 아래 대본은 Whisper가 지어냈을 가능성이 커요 — 내레이션이 있는 다른 영상을 고르는 걸 권해요.`,
      coverage,
    };
  }
  if (coverage < 0.6) {
    return {
      level: "low",
      message: "말소리가 적은 영상이에요",
      detail: `말로 인식된 구간이 전체의 ${pct}%예요(무음·음악으로 판정된 구간 ${badPct}%). 나머지 구간의 문장은 정확하지 않을 수 있으니 영상과 대조해 주세요.`,
      coverage,
    };
  }
  return { level: "ok", message: "", detail: "", coverage };
}

/**
 * 전사 내용이 말인지 노래 가사인지 헛소리인지 gpt-4o-mini 로 가른다.
 * 노래를 따라 부르는 릴스는 가사가 또렷해서 Whisper 점수로는 정상처럼 보이지만, 가사는 레퍼런스 대본으로 쓸 수 없다(2026-09-03).
 * 실패하면 null — 점수 기반 판정만 남긴다.
 */
async function classifyTranscript(segments: Segment[], key: string): Promise<"speech" | "lyrics" | "nonsense" | null> {
  const text = segments.map((s) => s.text).join("\n").slice(0, 4000);
  if (!text.trim()) return null;
  try {
    const r = await fetch(`${OPENAI}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You classify a transcript that automatic speech recognition produced from a short social video (Reels/Shorts). " +
              'Answer JSON {"kind": "speech" | "lyrics" | "nonsense"}. ' +
              "speech = spoken narration, dialogue, voice-over, or someone reading tips aloud, in any language. " +
              "lyrics = sung song lyrics, rap, a chorus, humming, or lines that read like a song rather than someone talking. " +
              "nonsense = incoherent fragments, random words or numbers, a lone stock phrase such as 'Thanks for watching' or 'ご視聴ありがとうございました', or text that could not be real narration of a video. " +
              "If speech and a short sung part are mixed, answer speech.",
          },
          { role: "user", content: text },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    const kind = (JSON.parse(data.choices?.[0]?.message?.content ?? "{}") as { kind?: string }).kind;
    return kind === "speech" || kind === "lyrics" || kind === "nonsense" ? kind : null;
  } catch {
    return null;
  }
}

/** 화자 구분 (추정): 문장 사이 침묵이 길면 화자가 바뀐 것으로 봄. Whisper는 화자 분리를 제공하지 않음. */
function guessSpeakers(segments: Segment[]): Segment[] {
  let speaker = 1;
  return segments.map((s, i) => {
    if (i > 0) {
      const gap = s.start - segments[i - 1].end;
      if (gap > 1.0) speaker = speaker === 1 ? 2 : 1;
    }
    return { ...s, speaker: `화자 ${speaker}` };
  });
}

/**
 * Whisper 구간은 문장 중간에서 잘리는 일이 잦다("비결은 생각 / 보다 단순합니다").
 * 전체 텍스트를 이어 붙인 뒤 문장 부호 기준으로 다시 나누고, 시간은 글자 수 비례로 배분한다.
 */
function resegmentBySentence(segments: Segment[]): Segment[] {
  if (segments.length === 0) return segments;
  // 글자마다 시간 부여
  const chars: { ch: string; t: number }[] = [];
  segments.forEach((s, i) => {
    const text = s.text.trim();
    const span = Math.max(0.05, s.end - s.start);
    for (let k = 0; k < text.length; k++) chars.push({ ch: text[k], t: s.start + (span * k) / Math.max(1, text.length - 1) });
    if (i < segments.length - 1 && !/\s$/.test(text)) chars.push({ ch: " ", t: s.end });
  });
  const full = chars.map((c) => c.ch).join("");
  // 문장 경계: . ? ! 。 뒤에 공백/끝, 또는 한국어 종결 어미 뒤 공백은 보수적으로 문장부호만 사용
  const re = /[^.?!。]+[.?!。]+|[^.?!。]+$/g;
  const out: Segment[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(full)) !== null) {
    const raw = m[0];
    const lead = raw.length - raw.trimStart().length;
    const a = m.index + lead;
    const b = m.index + raw.trimEnd().length - 1;
    const text = raw.trim();
    if (!text) continue;
    out.push({ start: chars[Math.min(a, chars.length - 1)].t, end: chars[Math.min(b, chars.length - 1)].t, text });
  }
  // 끝 시간이 시작과 같으면 최소 길이 부여, 다음 문장 시작 전까지 늘림
  for (let i = 0; i < out.length; i++) {
    const nextStart = i + 1 < out.length ? out[i + 1].start : segments[segments.length - 1].end;
    out[i].end = Math.max(out[i].start + 0.4, Math.min(nextStart, out[i].end + 0.35));
  }
  return out.length ? splitLongLines(out) : segments;
}

/**
 * 문장 부호가 거의 없는 말(노래 가사, 쉼 없이 이어지는 설명)은 한 줄이 60초짜리가 되기도 한다.
 * 그런 줄은 쉼표·접속사 자리에서 자막 길이(약 MAX_LINE 자)로 나누고, 시간은 글자 수 비례로 배분한다.
 * 줄이 짧아야 화면에서 읽히고, 번역도 구절 단위로 빠짐없이 나온다.
 */
const MAX_LINE = 110;
function splitLongLines(segs: Segment[]): Segment[] {
  const out: Segment[] = [];
  for (const s of segs) {
    if (s.text.length <= MAX_LINE) {
      out.push(s);
      continue;
    }
    // 끊을 수 있는 자리: 쉼표·세미콜론 뒤, 또는 접속사 앞
    const pieces: string[] = [];
    let buf = "";
    const tokens = s.text.split(/(?<=[,;:])\s+|\s+(?=(?:and|but|so|because|then|while|when|or|that)\b)|(?<=[,、，])/);
    for (const tok of tokens) {
      const cand = buf ? `${buf} ${tok}` : tok;
      if (cand.length > MAX_LINE && buf) {
        pieces.push(buf.trim());
        buf = tok;
      } else buf = cand;
    }
    if (buf.trim()) pieces.push(buf.trim());
    // 그래도 긴 조각은 단어 단위로 강제 분할
    const finalPieces = pieces.flatMap((p) => {
      if (p.length <= MAX_LINE * 1.4) return [p];
      const words = p.split(/\s+/);
      const res: string[] = [];
      let b = "";
      for (const w of words) {
        if ((b + " " + w).trim().length > MAX_LINE && b) {
          res.push(b.trim());
          b = w;
        } else b = (b + " " + w).trim();
      }
      if (b) res.push(b);
      return res;
    });
    const total = finalPieces.reduce((n, p) => n + p.length, 0) || 1;
    const span = s.end - s.start;
    let t = s.start;
    for (const p of finalPieces) {
      const d = (span * p.length) / total;
      out.push({ ...s, text: p, start: t, end: t + d });
      t += d;
    }
  }
  return out;
}

/** 선택 입력 '다듬기 지시'를 gpt-4o-mini로 적용. 줄 합치기는 허용(빈 문자열), 개수 불일치·실패 시 원문 유지. */
async function refine(segments: Segment[], note: string, key: string): Promise<Segment[] | null> {
  const lines = segments.map((s) => s.text);
  const body = {
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You edit the lines of a speech transcript according to the user's instruction. " +
          `Return JSON {"lines": string[]} with EXACTLY ${lines.length} strings, same order as input (line i = edited input line i). ` +
          "If two adjacent lines should be joined into one sentence, put the joined text in the EARLIER line and an empty string \"\" in the later line. " +
          "Never add new lines, never reorder, keep the original language, and do not invent content that was not spoken.",
      },
      { role: "user", content: `지시: ${note}\n\n입력 줄(JSON): ${JSON.stringify(lines)}` },
    ],
  };
  const r = await fetch(`${OPENAI}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) return null;
  const data = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  try {
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}") as { lines?: unknown };
    const out = parsed.lines;
    if (!Array.isArray(out) || out.length !== lines.length) return null;
    // 빈 줄 = 앞 줄에 합쳐짐 → 앞 구간의 끝 시간을 이어받음
    const merged: Segment[] = [];
    segments.forEach((s, i) => {
      const text = String(out[i] ?? "").trim();
      if (text) merged.push({ ...s, text });
      else if (merged.length) merged[merged.length - 1].end = s.end;
      else merged.push(s);
    });
    return merged;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return fail(500, "서버에 OPENAI_API_KEY가 설정되지 않았어요 (.env.local 확인)");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "업로드 형식이 올바르지 않아요");
  }
  const file = form.get("file");
  if (!(file instanceof Blob)) return fail(400, "파일이 없어요");
  const name = (file as File).name || "media";
  if (file.size > MAX_BYTES) return fail(413, "파일이 25MB를 넘어요 — 잘라서 올려주세요");

  const language = String(form.get("language") || "auto");
  const speakers = String(form.get("speakers") || "false") === "true";
  const note = String(form.get("note") || "").trim();

  // --- Whisper ---
  const fd = new FormData();
  fd.append("file", file, name);
  fd.append("model", "whisper-1");
  fd.append("response_format", "verbose_json");
  fd.append("timestamp_granularities[]", "segment");
  if (language !== "auto") fd.append("language", language);

  const r = await fetch(`${OPENAI}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
  });
  if (!r.ok) {
    let msg = `음성 인식 요청 실패 (${r.status})`;
    try {
      const e = (await r.json()) as { error?: { message?: string; code?: string } };
      const m = e.error?.message ?? "";
      if (/no credits|insufficient_quota|exceeded your current quota/i.test(m) || e.error?.code === "insufficient_quota") {
        msg = "OpenAI 계정에 크레딧이 없어요 — platform.openai.com › Settings › Billing 에서 충전(최소 $5)하면 바로 동작합니다";
      } else if (r.status === 401) {
        msg = "OpenAI API 키가 올바르지 않아요 (.env.local 확인 후 서버 재시작)";
      } else if (/Invalid file format|unsupported/i.test(m)) {
        msg = "지원하지 않는 파일 형식이에요 — mp4 · m4a · mp3 · wav · webm 으로 변환해 올려주세요 (mov는 미지원)";
      } else if (m) msg = m;
    } catch {
      /* ignore */
    }
    return fail(r.status === 401 ? 401 : 502, msg);
  }
  const data = (await r.json()) as WhisperVerbose;
  const rawSegments = data.segments ?? [];
  const speech = assessSpeech(rawSegments, data.duration ?? (rawSegments.length ? rawSegments[rawSegments.length - 1].end : 0), data.language);

  let segments: Segment[] = (data.segments ?? [])
    .map((s) => ({ start: Math.max(0, s.start), end: Math.max(s.start, s.end), text: (s.text ?? "").trim() }))
    .filter((s) => s.text.length > 0);

  if (segments.length === 0 && data.text?.trim()) {
    segments = [{ start: 0, end: data.duration ?? 0, text: data.text.trim() }];
  }
  if (segments.length === 0) return fail(422, "음성을 인식하지 못했어요 — 소리가 없거나 너무 작은 파일일 수 있어요");

  segments = resegmentBySentence(segments);

  // 점수로는 정상이어도 노래 가사·헛소리면 대본으로 쓸 수 없다. 노래는 점수 판정과 무관하게 「노래만」으로 표시
  const kind = await classifyTranscript(segments, key);
  if (kind === "lyrics") {
    speech.kind = "lyrics";
    speech.level = "none";
    speech.message = "노래 소리만 있는 영상이에요";
    speech.detail = "인식된 내용이 노래 가사예요. 가사는 레퍼런스 대본으로 쓸 수 없어요 — 말로 설명하는 영상을 골라 주세요.";
  } else if (kind === "nonsense" && speech.level !== "none") {
    speech.kind = "nonsense";
    speech.level = "none";
    speech.message = "말소리가 거의 없는 영상이에요";
    speech.detail = "인식된 문장이 앞뒤가 맞지 않아요. 배경음악·잡음을 Whisper가 글자로 바꾼 것으로 보여요 — 내레이션이 있는 다른 영상을 고르는 걸 권해요.";
  } else if (speech.level === "none") speech.kind = "nonsense";
  else if (kind === "speech") speech.kind = "speech";

  if (speakers) segments = guessSpeakers(segments);

  let refined = false;
  if (note) {
    const out = await refine(segments, note, key);
    if (out) {
      segments = out;
      refined = true;
    }
  }

  const res: TranscribeResponse = {
    language: data.language ?? language,
    duration: data.duration ?? segments[segments.length - 1].end,
    segments,
    refined,
    speech,
  };
  if (String(form.get("debug") || "") === "1") {
    return NextResponse.json({ ...res, rawSegments: rawSegments.map((s) => ({ start: s.start, end: s.end, text: s.text, no_speech_prob: s.no_speech_prob, avg_logprob: s.avg_logprob, compression_ratio: s.compression_ratio })) });
  }
  return NextResponse.json(res);
}
