// 레퍼런스 대본 확보 — 목업 아트보드 생성기
// 실행: node design/mockup/build-mockup.mjs  → Main(인터랙티브) / Default / Editing / Result .dc.html + canvas.json
import { writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { interactiveMain } from "./interactive.mjs";
import { convertThree } from "./convert3.mjs";

const here = dirname(fileURLToPath(import.meta.url));

// ---------- tokens (자체 팔레트) ----------
const T = {
  bg: "#0E1116", side: "#12161D", panel: "#171C25", panel2: "#1E2430", panel3: "#252C3A",
  line: "#2A3140", line2: "#343C4D",
  ink: "#E8ECF2", ink2: "#9AA5B5", ink3: "#66718A",
  blue: "#7FA7FF", blueSoft: "#1B2740",
  font: `"IBM Plex Sans KR", "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif`,
};

// ---------- icons (stroke, 24 grid) ----------
const ic = (paths, size = 18, extra = "") =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="flex: 0 0 auto; ${extra}">${paths}</svg>`;
const I = {
  steps: ic('<path d="M9 6h12M9 12h12M9 18h12"/><path d="M3.5 5.5L4.5 5v3M3.5 12.5h2l-2 2.5h2M3.5 17h1.5a1 1 0 0 1 0 2H4.5a1 1 0 0 1 0 2H3.5"/>'),
  ref: ic('<rect x="3" y="5" width="14" height="14" rx="2"/><path d="M17 9l4-2v10l-4-2"/><path d="M7 12h6M7 15h4"/>'),
  convert: ic('<path d="M4 7h11l-3-3M20 17H9l3 3"/><path d="M4 7v2a3 3 0 0 0 3 3h2M20 17v-2a3 3 0 0 0-3-3h-2"/>'),
  bell: ic('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21a2 2 0 0 0 4 0"/>', 20),
  globe: ic('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>', 20),
  upload: ic('<path d="M12 16V5M7 10l5-5 5 5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>', 28),
  at: ic('<circle cx="12" cy="12" r="4"/><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-4 7.5"/>', 16),
  chev: ic('<path d="M6 9l6 6 6-6"/>', 16),
  chevUp: ic('<path d="M6 15l6-6 6 6"/>', 16),
  chevR: ic('<path d="M9 6l6 6-6 6"/>', 16),
  chevL: ic('<path d="M15 6l-6 6 6 6"/>', 16),
  play: ic('<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>', 16),
  mute: ic('<path d="M4 10v4h3l4 3V7L7 10z"/><path d="M16 9l5 6M21 9l-5 6"/>', 18),
  x: ic('<path d="M6 6l12 12M18 6L6 18"/>', 14),
  download: ic('<path d="M12 4v11M7 10l5 5 5-5"/><path d="M4 19h16"/>', 16),
  refresh: ic('<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>', 16),
  chat: ic('<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4z"/>', 22),
  clip: ic('<path d="M15 7l-6.5 6.5a2.5 2.5 0 0 0 3.5 3.5L19 10a5 5 0 0 0-7-7L5 10"/>', 14),
  folderS: ic('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', 14),
  link: ic('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5"/>', 16),
  overseas: ic('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  search: ic('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>', 16),
  check: ic('<path d="M5 12l5 5L20 7"/>', 12),
  warn: ic('<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>', 12),
};

// ---------- shell ----------
function topbar() {
  return `
<div style="height: 64px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; border-bottom: 1px solid ${T.line}; background: ${T.bg};">
  <div style="display: flex; align-items: center; gap: 10px;">
    <div style="width: 30px; height: 30px; border-radius: 8px; background: {{accent}}; display: flex; align-items: center; justify-content: center;">
      <svg width="16" height="16" viewBox="0 0 24 24"><path d="M7 5v14l11-7z" fill="#0E1116"/></svg>
    </div>
    <span style="font-size: 18px; font-weight: 700; letter-spacing: -0.01em; color: ${T.ink};">BinStaGram</span>
  </div>
  <div style="display: flex; align-items: center; gap: 14px;">
    <div style="width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: ${T.ink2};">${I.bell}</div>
    <div style="width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: ${T.ink2};">${I.globe}</div>
    <div style="width: 36px; height: 36px; border-radius: 50%; background: ${T.blueSoft}; color: ${T.blue}; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center;">h</div>
  </div>
</div>`;
}

const navItem = (icon, label, { active = false } = {}) => `
<div style="display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 12px; border-radius: 10px; font-size: 14px; ${
  active ? `background: ${T.panel2}; color: ${T.ink}; font-weight: 600; box-shadow: inset 0 0 0 1px ${T.line2};` : `color: ${T.ink2};`
}">
  <span style="display: flex; color: ${active ? "{{accent}}" : T.ink3};">${icon}</span>
  <span style="flex: 1 1 auto;">${label}</span>
</div>`;

function sidebar(active = "search") {
  const grp = (t) => `<div style="font-size: 11.5px; color: ${T.ink3}; padding: 0 12px; margin: 18px 0 6px; letter-spacing: 0.02em;">${t}</div>`;
  return `
<aside style="width: 232px; flex: 0 0 auto; background: ${T.side}; border-right: 1px solid ${T.line}; padding: 16px 12px; display: flex; flex-direction: column; gap: 2px;">
  ${navItem(I.steps, "순서")}
  ${grp("제작 도구")}
  ${navItem(I.search, "링크로 찾기", { active: active === "search" })}
  ${navItem(I.ref, "레퍼런스 대본 확보", { active: active === "extract" })}
  ${navItem(I.convert, "레퍼런스 대본 변환", { active: active === "convert" })}
</aside>`;
}

const fab = `
<div style="position: absolute; right: 28px; bottom: 28px; width: 52px; height: 52px; border-radius: 50%; background: {{accent}}; color: #0E1116; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(0,0,0,0.35);">${I.chat}</div>`;

// ---------- left panel ----------
const panelTitle = `
<div>
  <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: ${T.ink}; letter-spacing: -0.01em;">레퍼런스 대본 확보</h1>
  <div style="font-size: 12.5px; color: ${T.ink2}; margin-top: 4px;">레퍼런스 영상의 <b style="color: ${T.ink};">음성을 글로 변환</b>해 타임코드가 붙은 대본을 만듭니다.</div>
</div>`;

function uploadZone({ chips = [] } = {}) {
  const chipHtml = chips.length
    ? `<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;">${chips
        .map(
          (c) => `
      <div style="display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 8px 0 4px; border-radius: 8px; background: ${T.panel3}; border: 1px solid ${T.line2}; font-size: 12.5px; color: ${T.ink};">
        <span style="width: 28px; height: 28px; border-radius: 6px; background: ${T.panel2}; display: flex; align-items: center; justify-content: center; color: ${T.ink2}; font-size: 10px; font-weight: 700;">${c.kind}</span>
        <span style="font-weight: 500;">${c.name}</span>
        <span style="color: ${T.ink3}; font-variant-numeric: tabular-nums;">${c.meta}</span>
        <span style="display: flex; color: ${T.ink3}; margin-left: 2px;">${I.x}</span>
      </div>`
        )
        .join("")}</div>`
    : "";
  return `
<div style="border: 1px solid ${T.line}; border-radius: 12px; padding: 14px 16px 16px; background: ${T.panel};">
  <div style="font-size: 12.5px; color: ${T.ink2}; margin-bottom: 10px;">동영상 / 오디오 최대 5개 <span style="color: ${T.ink3};">(파일당 25MB 이하 · 파일마다 대본 1개)</span> <span style="color: ${T.ink3};">· ${chips.length}/5</span></div>
  <div style="border: 1.5px dashed ${T.line2}; border-radius: 10px; padding: ${chips.length ? "16px" : "26px"} 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; background: ${T.panel2};">
    <span style="display: flex; color: ${T.ink2};">${I.upload}</span>
    <div style="font-size: 14px; font-weight: 600; color: ${T.ink};">동영상 / 오디오</div>
    <div style="font-size: 12px; color: ${T.ink3};">클릭하거나 파일을 끌어다 업로드</div>
    <div style="display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; margin-top: 6px; border-radius: 8px; background: ${T.panel3}; border: 1px solid ${T.line2}; font-size: 12.5px; color: ${T.ink};"><span style="display: flex; color: ${T.ink2};">${I.folderS}</span>에셋 선택</div>
  </div>
  ${chipHtml}
</div>`;
}

const token = (t) => `<span style="display: inline-block; padding: 0 6px; border-radius: 5px; background: ${T.blueSoft}; color: ${T.blue}; font-weight: 600;">@${t}</span>`;

function noteBox({ text = "", count = 0 } = {}) {
  const body = text
    ? `<div style="font-size: 14px; line-height: 1.7; color: ${T.ink};">${text}</div>`
    : `<div style="font-size: 14px; line-height: 1.7; color: ${T.ink3};">추출 후 다듬기 지시 (선택) — 예: 구어체 그대로 유지, 군더더기 제거, 문장 단위로 줄바꿈. @로 파일을 지정할 수 있어요.</div>`;
  return `
<div style="border: 1px solid ${T.line}; border-radius: 12px; padding: 14px 16px 12px; background: ${T.panel}; min-height: 150px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px;">
  ${body}
  <div style="display: flex; align-items: center; justify-content: space-between;">
    <div style="display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 8px; background: ${T.panel2}; border: 1px solid ${T.line}; font-size: 12.5px; color: ${T.ink2};"><span style="display: flex;">${I.at}</span>참조</div>
    <div style="font-size: 12px; color: ${T.ink3}; font-variant-numeric: tabular-nums;">${count}/1000</div>
  </div>
</div>`;
}

function optGroup(label, items, selected) {
  return `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div style="font-size: 12px; color: ${T.ink3};">${label}</div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">${items
        .map((it, i) => `<span style="display: flex; align-items: center; height: 32px; padding: 0 12px; border-radius: 8px; font-size: 13px; ${
          i === selected ? `background: {{accent}}; color: #0E1116; font-weight: 600;` : `background: ${T.panel3}; color: ${T.ink}; border: 1px solid ${T.line2};`
        }">${it}</span>`)
        .join("")}</div>
    </div>`;
}

function controls({ speakers = false, active = false, fileCount = 0, lang = "" } = {}) {
  return `
<div style="display: flex; flex-direction: column; gap: 12px;">
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;">
    <div style="display: flex; align-items: center; justify-content: space-between; height: 44px; padding: 0 14px; border-radius: 10px; background: ${T.panel}; border: 1px solid ${T.line}; font-size: 14px; color: ${T.ink};">
      <span style="display: flex; gap: 8px; align-items: center;"><span style="color: ${T.ink3}; font-size: 12.5px;">언어</span><span style="font-weight: 500;">${lang || (speakers ? "한국어" : "자동 감지")}</span></span><span style="display: flex; color: ${T.ink3};">${I.chev}</span>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; height: 44px; padding: 0 14px; border-radius: 10px; background: ${T.panel}; border: 1px solid ${T.line}; font-size: 14px; color: ${T.ink};">
      <span style="display: flex; gap: 8px; align-items: center;"><span style="color: ${T.ink3}; font-size: 12.5px;">화자 구분</span><span style="font-weight: 500;">${speakers ? "켜기" : "끄기"}</span></span>
      <span style="width: 34px; height: 20px; border-radius: 10px; background: ${speakers ? "{{accent}}" : T.line2}; position: relative;"><span style="position: absolute; top: 2px; left: ${speakers ? "16px" : "2px"}; width: 16px; height: 16px; border-radius: 50%; background: #FFFFFF;"></span></span>
    </div>
  </div>
  <div style="height: 52px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; ${
    active ? `background: {{accent}}; color: #0E1116;` : `background: ${T.panel2}; color: ${T.ink3};`
  }">대본 생성${fileCount > 1 ? ` (${fileCount}개)` : ""}</div>
  <div style="font-size: 11.5px; color: ${T.ink3}; text-align: center;">${active ? "파일마다 대본 1개가 만들어져요 · 음성 인식은 OpenAI Whisper API로 처리 예정" : "동영상 또는 오디오를 올리면 버튼이 활성화돼요"}</div>
</div>`;
}

function leftPanel(state) {
  return `
<section style="width: 560px; flex: 0 0 auto; display: flex; flex-direction: column; gap: 16px; padding: 20px; border-radius: 16px; background: ${T.side}; border: 1px solid ${T.line};">
  ${panelTitle}
  ${uploadZone(state)}
  ${noteBox(state)}
  ${controls(state)}
</section>`;
}

// ---------- right panel ----------
const SAMPLES = [
  { label: "요리 릴스", tone: "#3A3324", selected: true },
  { label: "운동 루틴", tone: "#22303C" },
  { label: "인터뷰 클립", tone: "#2B2F3F" },
  { label: "제품 리뷰", tone: "#3A2630" },
  { label: "브이로그", tone: "#26343A" },
];

const caption = (text, bottom = 22) => `
<div style="position: absolute; left: 16px; right: 16px; bottom: ${bottom}px; display: flex; justify-content: center;">
  <span style="max-width: 90%; text-align: center; background: rgba(0,0,0,0.72); color: #FFFFFF; padding: 7px 14px; border-radius: 8px; font-size: 15px; font-weight: 600; line-height: 1.45;">${text}</span>
</div>`;

function poster(tone, h, label, { big = false, cap = "" } = {}) {
  return `
<div style="position: relative; height: ${h}px; border-radius: ${big ? 14 : 10}px; overflow: hidden; background: linear-gradient(160deg, ${tone} 0%, #0E1116 100%); display: flex; align-items: center; justify-content: center;">
  <div style="width: ${big ? 56 : 28}px; height: ${big ? 56 : 28}px; border-radius: 50%; background: rgba(232,236,242,0.14); display: flex; align-items: center; justify-content: center; color: ${T.ink};">${big ? ic('<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>', 24) : I.play}</div>
  <span style="position: absolute; left: ${big ? 14 : 10}px; ${big ? "top: 14px" : "bottom: 8px"}; font-size: ${big ? 12 : 10.5}px; color: ${T.ink2};">${label}</span>
  ${cap ? caption(cap) : ""}
</div>`;
}

const tabs = (results) => `
<div style="display: flex; gap: 20px; border-bottom: 1px solid ${T.line}; margin-bottom: 16px;">
  <span style="padding: 0 2px 10px; font-size: 14px; ${results ? `font-weight: 600; color: ${T.ink}; border-bottom: 2px solid {{accent}};` : `color: ${T.ink3};`}">대본 결과 <span style="color: ${T.ink3}; font-weight: 500;">${results ? 1 : 0}</span></span>
  <span style="padding: 0 2px 10px; font-size: 14px; ${results ? `color: ${T.ink3};` : `font-weight: 600; color: ${T.ink}; border-bottom: 2px solid {{accent}};`}">예시</span>
</div>`;

function samplePanel() {
  return `
<section style="flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; padding: 20px; border-radius: 16px; background: ${T.side}; border: 1px solid ${T.line};">
  ${tabs(false)}
  <div style="display: flex; flex-direction: column; gap: 14px;">
    <div style="position: relative;">
      ${poster("#3A3324", 380, "요리 릴스 · 음소거", { big: true, cap: "자, 이 장면 잘 보세요. 여기서 딱 3초만 멈춰볼게요." })}
      <div style="position: absolute; right: 14px; top: 14px; width: 32px; height: 32px; border-radius: 8px; background: rgba(14,17,22,0.6); display: flex; align-items: center; justify-content: center; color: ${T.ink};">${I.mute}</div>
    </div>
    <div style="font-size: 12.5px; color: ${T.ink2}; line-height: 1.6;">이렇게 나옵니다 — 영상 위에 <b style="color: ${T.ink};">말한 문장이 자막으로 동기 표시</b>되고, 아래에 타임코드가 붙은 대본이 정리됩니다. 왼쪽에 영상을 올리고 「대본 생성」을 눌러보세요.</div>
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="display: flex; color: ${T.ink3};">${I.chevL}</span>
      <div style="flex: 1 1 auto; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px;">
        ${SAMPLES.map((s) => `<div style="border-radius: 10px; ${s.selected ? `outline: 2px solid {{accent}}; outline-offset: 2px;` : ""}">${poster(s.tone, 96, s.label)}</div>`).join("")}
      </div>
      <span style="display: flex; color: ${T.ink3};">${I.chevR}</span>
    </div>
  </div>
</section>`;
}

const CUES_X = [
  ["0:00.0–0:02.9", "화자 1", "자, 이 장면 잘 보세요.", false],
  ["0:02.9–0:05.8", "화자 1", "여기서 딱 3초만 멈춰볼게요.", false],
  ["0:05.8–0:08.6", "화자 2", "이게 핵심인데요, 처음엔 아무도 안 믿었어요.", true],
  ["0:08.6–0:11.5", "화자 1", "비결은 생각보다 단순합니다.", false],
  ["0:11.5–0:14.4", "화자 2", "첫 번째, 화면 전환은 두 컷 이상 넘기지 않기.", false],
  ["0:14.4–0:17.3", "화자 1", "두 번째, 첫 문장에서 결론을 먼저 말하기.", false],
];

function resultPanel() {
  const btn = (icon, label) => `<span style="display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: 8px; background: ${T.panel3}; border: 1px solid ${T.line2}; font-size: 12.5px; color: ${T.ink}; white-space: nowrap;">${icon}${label}</span>`;
  return `
<section style="flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; padding: 20px; border-radius: 16px; background: ${T.side}; border: 1px solid ${T.line};">
  ${tabs(true)}
  <div style="border: 1px solid ${T.line}; border-radius: 14px; padding: 14px; background: ${T.panel}; display: flex; flex-direction: column; gap: 12px;">
    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; color: ${T.ink2};">
      <span style="display: flex; gap: 10px; align-items: center;"><span style="font-weight: 600; color: ${T.ink};">reel_cooking.mp4</span><span style="font-weight: 600; color: #6CCB9A;">완료</span></span>
      <span style="color: ${T.ink3};">23s · 한국어 · 화자 구분</span>
    </div>
    <div style="position: relative; height: 240px; border-radius: 14px; overflow: hidden; background: linear-gradient(160deg, #3A3324 0%, #0E1116 100%); display: flex; align-items: center; justify-content: center;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(232,236,242,0.14); display: flex; align-items: center; justify-content: center; color: ${T.ink};">${ic('<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>', 24)}</div>
      ${caption("화자 2 · 이게 핵심인데요, 처음엔 아무도 안 믿었어요.", 44)}
      <div style="position: absolute; left: 0; right: 0; bottom: 0; height: 34px; background: rgba(0,0,0,0.5); display: flex; align-items: center; gap: 10px; padding: 0 12px; font-size: 11px; color: ${T.ink2};">${I.play}<span style="flex: 1 1 auto; height: 3px; background: rgba(255,255,255,0.2); border-radius: 2px; overflow: hidden;"><span style="display: block; width: 30%; height: 100%; background: #FFFFFF;"></span></span><span style="font-variant-numeric: tabular-nums;">0:07 / 0:23</span></div>
    </div>
    <div style="border-radius: 12px; background: ${T.panel2}; border: 1px solid ${T.line}; padding: 10px 14px 12px; display: flex; flex-direction: column; gap: 2px;">
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 2px 8px 6px;"><span style="font-size: 11px; color: {{accent}}; font-weight: 600; letter-spacing: 0.02em;">목업 예시 — 영상 소리를 듣고 만든 대본이 아닙니다 (고정 문장). 실제 대본은 Whisper API 연결 후 나옵니다</span><span style="font-size: 11px; color: ${T.ink3};">문장 클릭 = 그 구간으로</span></div>
      ${CUES_X.map(([tm, spk, ln, on]) => `<div style="display: grid; grid-template-columns: 92px 44px 1fr; gap: 10px; padding: 5px 8px; border-radius: 6px; font-size: 13px; line-height: 1.6; ${on ? `background: ${T.panel3}; color: ${T.ink};` : `color: ${T.ink3};`}"><span style="font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; color: ${T.ink3}; padding-top: 2px;">${tm}</span><span style="font-size: 11.5px; color: ${T.blue}; font-weight: 600; padding-top: 2px;">${spk}</span><span>${ln}</span></div>`).join("")}
      <div style="font-size: 11.5px; color: ${T.ink3}; padding: 4px 8px;">… 2줄 더</div>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
      <div style="font-size: 12.5px; color: ${T.ink3}; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">다듬기: 구어체 그대로, 군더더기만 제거</div>
      <div style="display: flex; gap: 8px; flex: 0 0 auto;">${btn(I.clip, "복사 (글만)")}${btn(I.download, "SRT 저장")}${btn(I.refresh, "다시 추출")}</div>
    </div>
  </div>
</section>`;
}

// ---------- 링크로 찾기 (검색형 UX) ----------
const OK = "#6CCB9A";
function searchBar({ url = "", compact = false } = {}) {
  const active = !!url;
  return `
<div style="display: flex; align-items: center; gap: 10px; height: ${compact ? 52 : 60}px; padding: 0 8px 0 18px; border-radius: 16px; background: ${T.panel}; border: 1.5px solid ${active ? "{{accent}}" : T.line2}; box-shadow: 0 10px 30px rgba(0,0,0,0.25);">
  <span style="display: flex; color: ${active ? "{{accent}}" : T.ink3};">${I.link}</span>
  <span style="flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: ${compact ? 14 : 15}px; color: ${active ? T.ink : T.ink3};">${url || "https:// 영상 링크를 붙여넣으세요 — 인스타그램 · 유튜브 · 틱톡"}</span>
  <span style="display: flex; align-items: center; gap: 6px; height: ${compact ? 38 : 44}px; padding: 0 16px; border-radius: 11px; font-size: 14px; font-weight: 700; white-space: nowrap; ${active ? `background: {{accent}}; color: #0E1116;` : `background: ${T.panel3}; color: ${T.ink3};`}">${I.search}대본 가져오기</span>
</div>`;
}
const toggle = (on) => `<span style="width: 34px; height: 20px; border-radius: 10px; background: ${on ? "{{accent}}" : T.line2}; position: relative; flex: 0 0 auto;"><span style="position: absolute; top: 2px; left: ${on ? "16px" : "2px"}; width: 16px; height: 16px; border-radius: 50%; background: #FFFFFF;"></span></span>`;
function optionsRow({ views = "100만 이상", comments = "500 ~ 1,000개" } = {}) {
  const pill = (inner) => `<div style="display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 14px; border-radius: 10px; background: ${T.panel}; border: 1px solid ${T.line}; font-size: 13.5px; color: ${T.ink};">${inner}</div>`;
  return `
<div style="display: flex; gap: 10px; flex-wrap: wrap;">
  ${pill(`<span style="color: ${T.ink3}; font-size: 12.5px;">조회수</span><span style="font-weight: 500;">${views}</span><span style="display: flex; color: ${T.ink3};">${I.chev}</span>`)}
  ${pill(`<span style="color: ${T.ink3}; font-size: 12.5px;">댓글</span><span style="font-weight: 500;">${comments}</span><span style="display: flex; color: ${T.ink3};">${I.chev}</span>`)}
  ${pill(`<span style="color: ${T.ink3}; font-size: 12.5px;">기간</span><span style="font-weight: 500;">전체 기간</span><span style="display: flex; color: ${T.ink3};">${I.chev}</span>`)}
</div>`;
}
const platformChip = (name) => `<span style="display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 10px; border-radius: 999px; background: ${T.blueSoft}; color: ${T.blue}; font-size: 11.5px; font-weight: 600;">${I.check}${name} · 링크 인식됨</span>`;

function searchEmpty() {
  return `
<main style="flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 24px 96px;">
  <div style="width: 880px; display: flex; flex-direction: column; gap: 22px; align-items: center;">
    <div style="display: flex; flex-direction: column; gap: 8px; align-items: center; text-align: center;">
      <h1 style="margin: 0; font-size: 30px; font-weight: 700; color: ${T.ink}; letter-spacing: -0.02em;">링크로 찾기</h1>
      <div style="font-size: 14.5px; color: ${T.ink2}; line-height: 1.6;">영상 링크를 붙여넣으면 <b style="color: ${T.ink};">타임코드가 붙은 대본</b>을 가져옵니다. 해외 영상은 <b style="color: ${T.ink};">한국어 번역</b>까지 같이 나와요.</div>
    </div>
    <div style="width: 100%; display: flex; flex-direction: column; gap: 12px;">
      ${searchBar()}
      ${optionsRow()}
    </div>
    <div style="font-size: 12.5px; color: ${T.ink3};">파일 업로드 없이 링크만 · 한 번에 최대 5개 · 문장을 클릭하면 영상이 그 구간으로 이동</div>
  </div>
</main>`;
}

const STAGES = ["영상 내려받기", "음성 인식", "문장 나누기 · 타임코드", "한국어 번역"];
function searchFetching() {
  const step = (label, state) => `<div style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: ${state === "done" ? OK : state === "now" ? T.ink : T.ink3};"><span style="width: 8px; height: 8px; border-radius: 50%; background: ${state === "done" ? OK : state === "now" ? "{{accent}}" : T.line2};"></span>${label}</div>`;
  return `
<main style="flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; align-items: center; padding: 24px;">
  <div style="width: 880px; display: flex; flex-direction: column; gap: 14px;">
    <div style="display: flex; align-items: baseline; justify-content: space-between;"><h1 style="margin: 0; font-size: 22px; font-weight: 700; color: ${T.ink}; letter-spacing: -0.01em;">링크로 찾기</h1><span style="font-size: 12.5px; color: ${T.ink3};">가져온 대본 1</span></div>
    ${searchBar({ url: "https://www.instagram.com/reel/DPxQ7abcDEF/", compact: true })}
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">${platformChip("Instagram Reel")}${optionsRow()}</div>
    <div style="border: 1px solid ${T.line}; border-radius: 16px; padding: 16px; background: ${T.panel}; display: flex; flex-direction: column; gap: 14px;">
      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; color: ${T.ink2};">
        <span style="display: flex; gap: 10px; align-items: center;"><span style="font-weight: 600; color: ${T.ink};">instagram.com/reel/DPxQ7abcDEF</span><span style="font-weight: 600; color: {{accent}};">가져오는 중 42%</span></span>
        <span style="color: ${T.ink3};">82s · English → 한국어 번역</span>
      </div>
      <div style="height: 6px; border-radius: 3px; background: ${T.panel3}; overflow: hidden;"><div style="width: 42%; height: 100%; background: {{accent}};"></div></div>
      <div style="display: flex; gap: 22px; flex-wrap: wrap;">${step(STAGES[0], "done")}${step(STAGES[1], "now")}${step(STAGES[2], "")}${step(STAGES[3], "")}</div>
      <div style="font-size: 11.5px; color: ${T.ink3};">음성 인식은 OpenAI Whisper API, 번역은 gpt-4o-mini로 처리 예정 · 82초 영상 기준 약 1분</div>
    </div>
  </div>
</main>`;
}

// 벤치마크(2026-09-02)와 같은 조건: 82초 영어 릴스 → 16문장 · 초 단위 타임스탬프 · 한국어 번역 동시 표시
const CUES = [
  ["0:00.0", "Can you build a good app with zero money?", "돈 한 푼 없이도 좋은 앱을 만들 수 있을까요?"],
  ["0:05.1", "Everyone told me I needed a developer first.", "다들 개발자부터 구해야 한다고 했어요."],
  ["0:10.3", "I had no budget, no team, just an idea.", "예산도 팀도 없이 아이디어 하나뿐이었죠."],
  ["0:15.4", "So I opened Claude Cowork and typed one sentence.", "그래서 클로드 코워크를 열고 한 문장을 입력했어요."],
  ["0:20.5", "Describe the app like you're texting a friend.", "친구한테 문자 보내듯 앱을 설명하세요."],
  ["0:25.6", "Twenty minutes later it was running on my phone.", "20분 뒤엔 제 폰에서 돌아가고 있었어요."],
  ["0:30.8", "Here's the part nobody shows you.", "아무도 안 보여주는 부분이 여기예요."],
  ["0:35.9", "The first version was ugly and broken.", "첫 버전은 못생기고 자꾸 멈췄어요."],
  ["0:41.0", "I fixed it by asking one question at a time.", "한 번에 질문 하나씩 던지면서 고쳤어요."],
];
function resultCard() {
  const on = 3;
  return `
<div style="border: 1px solid ${T.line}; border-radius: 16px; padding: 14px 16px 16px; background: ${T.panel}; display: flex; flex-direction: column; gap: 12px;">
  <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; color: ${T.ink2};">
    <span style="display: flex; gap: 10px; align-items: center;"><span style="font-weight: 600; color: ${T.ink};">instagram.com/reel/DPxQ7abcDEF</span><span style="font-weight: 600; color: ${OK};">완료</span></span>
    <span style="color: ${T.ink3};">82s · 16문장 · English → 한국어 번역 · 화자 1명</span>
  </div>
  <div style="display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 14px;">
    <div style="position: relative; height: 444px; border-radius: 14px; overflow: hidden; background: linear-gradient(160deg, #22303C 0%, #0E1116 100%); display: flex; align-items: center; justify-content: center;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(232,236,242,0.14); display: flex; align-items: center; justify-content: center; color: ${T.ink};">${ic('<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>', 24)}</div>
      <div style="position: absolute; left: 12px; right: 12px; bottom: 48px; display: flex; justify-content: center;">
        <span style="text-align: center; background: rgba(0,0,0,0.72); color: #FFFFFF; padding: 7px 12px; border-radius: 8px; font-size: 13.5px; font-weight: 600; line-height: 1.45; display: flex; flex-direction: column; gap: 2px;"><span>${CUES[on][1]}</span><span style="font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.8);">${CUES[on][2]}</span></span>
      </div>
      <div style="position: absolute; left: 0; right: 0; bottom: 0; height: 34px; background: rgba(0,0,0,0.5); display: flex; align-items: center; gap: 10px; padding: 0 12px; font-size: 11px; color: ${T.ink2};">${I.play}<span style="flex: 1 1 auto; height: 3px; background: rgba(255,255,255,0.2); border-radius: 2px; overflow: hidden;"><span style="display: block; width: 20%; height: 100%; background: #FFFFFF;"></span></span><span style="font-variant-numeric: tabular-nums;">0:16 / 1:22</span></div>
    </div>
    <div style="border-radius: 12px; background: ${T.panel2}; border: 1px solid ${T.line}; padding: 8px 12px 10px; display: flex; flex-direction: column; gap: 1px; min-width: 0;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 2px 6px 6px;"><span style="font-size: 11px; color: {{accent}}; font-weight: 600;">목업 예시 — 고정 문장 (실제 대본은 Whisper API 연결 후)</span><span style="font-size: 11px; color: ${T.ink3};">문장 클릭 = 그 구간으로</span></div>
      ${CUES.map(([tm, ln, tr], i) => `<div style="display: grid; grid-template-columns: 52px 1fr; gap: 10px; padding: 5px 6px; border-radius: 6px; font-size: 13px; line-height: 1.45; ${i === on ? `background: ${T.panel3}; color: ${T.ink};` : `color: ${T.ink3};`}"><span style="font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; color: ${T.ink3}; padding-top: 2px;">${tm}</span><span style="display: flex; flex-direction: column; gap: 1px;"><span>${ln}</span><span style="font-size: 12px; opacity: 0.85;">${tr}</span></span></div>`).join("")}
      <div style="font-size: 11.5px; color: ${T.ink3}; padding: 4px 6px;">… 7줄 더</div>
    </div>
  </div>
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
    <div style="font-size: 12.5px; color: ${T.ink3}; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">이 대본으로 바로 「레퍼런스 대본 변환」에 넘길 수 있어요</div>
    <div style="display: flex; gap: 8px; flex: 0 0 auto;">
      ${["clip|복사 (글만)", "download|SRT 저장", "convert|변환으로 보내기", "refresh|다시 가져오기"].map((x) => { const [k, l] = x.split("|"); return `<span style="display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: 8px; background: ${T.panel3}; border: 1px solid ${T.line2}; font-size: 12.5px; color: ${T.ink}; white-space: nowrap;">${I[k]}${l}</span>`; }).join("")}
    </div>
  </div>
</div>`;
}
function searchResult() {
  return `
<main style="flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; align-items: center; padding: 24px;">
  <div style="width: 880px; display: flex; flex-direction: column; gap: 14px;">
    <div style="display: flex; align-items: baseline; justify-content: space-between;"><h1 style="margin: 0; font-size: 22px; font-weight: 700; color: ${T.ink}; letter-spacing: -0.01em;">링크로 찾기</h1><span style="font-size: 12.5px; color: ${T.ink3};">가져온 대본 1</span></div>
    ${searchBar({ compact: true })}
    ${optionsRow()}
    ${resultCard()}
  </div>
</main>`;
}

// ---------- 레퍼런스 대본 변환 (정지 화면) — 분석 기준표(xlsx) 기반 ----------
const ANALYSIS = [
  ["후킹", "첫 문장 유형", "질문형"],
  ["후킹", "타겟 명시", "명시 (영상 만드는 분들)"],
  ["후킹", "정보 vs 감정", "혼합형"],
  ["후킹", "후킹 길이", "5.8초 / 14단어"],
  ["본문", "전개 흐름", "문제 → 해결 → 증거 → 결론"],
  ["본문", "사례·숫자 위치", "중반 2회 (3초, 두 컷)"],
  ["본문", "전문성 어필", "결과물(반응 변화)형"],
  ["본문", "정보 밀도", "23초 / 2포인트"],
  ["CTA", "위치", "끝부분만"],
  ["CTA", "문구 톤", "궁금증형"],
  ["CTA", "요구 행동", "저장 유도"],
  ["CTA", "혜택 선행 제시", "행동 요청만"],
  ["기타", "말투·톤", "존댓말 · 차분함 · '자,' 반복"],
];
const NEW_LINES = [
  ["0:00.0", "훅", "질문형 · 타겟 명시", "출근 전 커피, 3분 안에 끝내고 싶은 분 있죠?"],
  ["0:03.0", "훅", "혼합형(고민→예고)", "저도 매일 편의점 갔는데, 이거 하나로 바뀌었어요."],
  ["0:05.8", "문제", "공감", "드립백은 맛이 없다는 말, 저도 믿었거든요."],
  ["0:08.6", "해결", "핵심 1문장", "비결은 물 온도 하나예요."],
  ["0:11.5", "증거", "숫자 1", "92도로 두 번에 나눠 부으면 끝."],
  ["0:14.4", "증거", "숫자 2", "첫 30초는 그냥 기다리기, 이게 전부예요."],
  ["0:17.3", "결론", "결과물형 어필", "이렇게 내리고 나서 사무실에서 다들 물어봤어요."],
  ["0:20.1", "CTA", "궁금증형 · 저장 유도", "내일 아침에 바로 해보고 싶으면 저장해두세요."],
];

function convertLeft() {
  const grpColor = { "후킹": "{{accent}}", "본문": T.ink2, "CTA": T.blue, "기타": T.ink3 };
  return `
<section style="width: 560px; flex: 0 0 auto; display: flex; flex-direction: column; gap: 14px; padding: 20px; border-radius: 16px; background: ${T.side}; border: 1px solid ${T.line};">
  <div>
    <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: ${T.ink}; letter-spacing: -0.01em;">레퍼런스 대본 변환</h1>
    <div style="font-size: 12.5px; color: ${T.ink2}; margin-top: 4px;">원본을 <b style="color: ${T.ink};">분석 기준표 18항목</b>으로 뜯어 구조 설계도를 만들고, 그 설계도대로 <b style="color: ${T.ink};">내 주제의 새 대본 3가지 톤</b>을 씁니다. 쓴 뒤엔 스스로 검증해요.</div>
  </div>

  <div style="border: 1px solid ${T.line}; border-radius: 12px; padding: 12px 14px; background: ${T.panel}; display: flex; flex-direction: column; gap: 8px;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div style="font-size: 12.5px; color: ${T.ink2};"><span style="display: inline-grid; place-items: center; width: 18px; height: 18px; border-radius: 5px; background: ${T.panel3}; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: {{accent}}; margin-right: 6px;">1</span>원본 대본</div>
      <span style="font-size: 11.5px; color: ${T.ink3};">「링크로 찾기」 결과에서 선택 · 직접 붙여넣기</span>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; height: 40px; padding: 0 12px; border-radius: 10px; background: ${T.panel2}; border: 1px solid ${T.line}; font-size: 13.5px; color: ${T.ink};">
      <span style="display: flex; gap: 10px; align-items: center;"><span style="font-weight: 500;">instagram.com/reel/coffee_3min</span><span style="font-size: 12px; color: ${T.ink3};">8문장 · 23s · 한국어</span></span><span style="display: flex; color: ${T.ink3};">${I.chev}</span>
    </div>
  </div>

  <div style="border: 1px solid ${T.line}; border-radius: 12px; padding: 12px 14px; background: ${T.panel}; display: flex; flex-direction: column; gap: 8px;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div style="font-size: 12.5px; color: ${T.ink2};"><span style="display: inline-grid; place-items: center; width: 18px; height: 18px; border-radius: 5px; background: ${T.panel3}; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: {{accent}}; margin-right: 6px;">2</span>구조 분석 <span style="color: #6CCB9A; font-weight: 600;">완료</span> <span style="color: ${T.ink3};">· 기준표 13/18 (썸네일 3·자막·길이는 영상 필요)</span></div>
      <span style="font-size: 11.5px; color: {{accent}}; font-weight: 600;">항목 클릭해 수정</span>
    </div>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 12px;">
      ${ANALYSIS.map(([g, k, v]) => `<div style="display: grid; grid-template-columns: 30px 88px 1fr; gap: 6px; align-items: baseline; font-size: 12px; line-height: 1.5; padding: 2px 0;"><span style="font-size: 10.5px; font-weight: 700; color: ${grpColor[g]};">${g}</span><span style="color: ${T.ink3};">${k}</span><span style="color: ${T.ink}; font-weight: 500;">${v}</span></div>`).join("")}
    </div>
  </div>

  <div style="border: 1px solid ${T.line}; border-radius: 12px; padding: 12px 14px; background: ${T.panel}; display: flex; flex-direction: column; gap: 8px;">
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
      <div style="font-size: 12.5px; color: ${T.ink2};"><span style="display: inline-grid; place-items: center; width: 18px; height: 18px; border-radius: 5px; background: ${T.panel3}; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: {{accent}}; margin-right: 6px;">3</span>내 주제 · 제품 · 타겟</div>
      <span style="display: inline-flex; align-items: center; gap: 5px; height: 22px; padding: 0 8px; border-radius: 999px; background: ${T.blueSoft}; color: ${T.blue}; font-size: 11px; font-weight: 600;">${I.check}페르소나 기억됨 · 20대 직장인 · 존댓말 · 차분</span>
    </div>
    <div style="min-height: 40px; font-size: 13.5px; line-height: 1.65; color: ${T.ink};">홈카페 드립백 커피 신제품. 아침 출근 전 3분. 프로필 링크에 첫 주문 20% 할인.</div>
    <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
      <div style="display: flex; gap: 6px; flex-wrap: wrap;"><span style="font-size: 11.5px; color: ${T.ink3};">말투</span><span style="font-size: 11.5px; color: ${T.ink};">원본 분석대로</span><span style="font-size: 11.5px; color: ${T.ink3};">· 길이</span><span style="font-size: 11.5px; color: ${T.ink};">원본과 같게(23s) · 초과 시 자동 단축</span><span style="font-size: 11.5px; color: ${T.ink3};">· 톤</span><span style="font-size: 11.5px; color: ${T.ink};">3가지 동시</span></div>
      <span style="font-size: 12px; color: ${T.ink3}; font-variant-numeric: tabular-nums;">52/1000</span>
    </div>
    <div style="font-size: 11.5px; color: ${T.ink3};">누구에게 · 무슨 이야기 · 어떤 말투는 처음 한 번만 입력하면 다음 변환에도 그대로 유지돼요.</div>
  </div>

  <div style="display: flex; flex-direction: column; gap: 8px;">
    <div style="height: 52px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; background: {{accent}}; color: #0E1116;">새 대본 생성</div>
    <div style="font-size: 11.5px; color: ${T.ink3}; text-align: center;">설계도대로 3가지 톤을 새로 쓰고 → 셀프 검증(원문 베끼기 · 설계도 약속 · 지어낸 숫자) → 고칠 것 3개만 알려줘요</div>
  </div>
</section>`;
}

function convertRight() {
  const WARN = "#E9B25B", WARN_BG = "#3A3324", OK = "#6CCB9A", OK_BG = "#123424";
  const roleColor = (r) => r === "훅" ? "{{accent}}" : r === "CTA" ? T.blue : T.ink2;
  const flagOf = { 0: ["②", "타겟 없음"], 4: ["①", "숫자 근거 없음"], 6: ["③", "후기 근거 없음"] };
  const row = ([tc, role, why, line], i) => {
    const flag = flagOf[i];
    return `
    <div style="display: grid; grid-template-columns: 46px 40px 1fr; gap: 10px; padding: 4px 10px; border-radius: 8px; font-size: 13px; line-height: 1.45; ${flag ? `background: ${T.panel3};` : ""}">
      <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: ${T.ink3}; padding-top: 3px;">${tc}</span>
      <span style="font-size: 11px; font-weight: 700; color: ${roleColor(role)}; padding-top: 3px;">${role}</span>
      <span style="display: flex; flex-direction: column; gap: 1px;">
        <span style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px;"><span style="color: ${T.ink};">${line}</span>${flag ? `<span style="flex: 0 0 auto; display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; color: ${WARN};">${I.warn}${flag[0]} ${flag[1]}</span>` : ""}</span>
        <span style="font-size: 10.5px; color: ${T.ink3};">↳ ${why}</span>
      </span>
    </div>`;
  };
  const pill = (bg, color, text) => `<span style="display: inline-flex; align-items: center; gap: 5px; height: 26px; padding: 0 10px; border-radius: 999px; background: ${bg}; color: ${color}; font-size: 11.5px; font-weight: 600;">${text}</span>`;
  const toneTab = (label, on) => `<span style="display: flex; align-items: center; height: 30px; padding: 0 12px; border-radius: 8px; font-size: 12.5px; ${on ? `background: {{accent}}; color: #0E1116; font-weight: 600;` : `background: ${T.panel3}; color: ${T.ink}; border: 1px solid ${T.line2};`}">${label}</span>`;
  const FIXES = [
    ["지어낸 숫자", "0:11.5 「92도」 — 입력에 없는 숫자. 실제 온도로 바꾸거나 빼기"],
    ["설계도 약속", "'타겟 명시'인데 훅에 「20대 직장인」 없음 → 첫 문장에 넣기"],
    ["없는 사실", "0:17.3 「다들 물어봤어요」 — 확인 안 된 후기 → 실제 후기 1개로"],
  ];
  const TITLES = ["출근 전 3분, 드립백이 맛없다는 건 오해였다", "편의점 커피 끊게 만든 건 물 온도 하나", "물 온도만 바꿨더니 사무실이 물어본 커피"];
  const btn = (icon, label) => `<span style="display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: 8px; background: ${T.panel3}; border: 1px solid ${T.line2}; font-size: 12.5px; color: ${T.ink}; white-space: nowrap; flex: 0 0 auto;">${icon}${label}</span>`;
  return `
<section style="flex: 1 1 auto; min-width: 0; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; padding: 20px; border-radius: 16px; background: ${T.side}; border: 1px solid ${T.line};">
  <div style="display: flex; gap: 20px; border-bottom: 1px solid ${T.line}; margin-bottom: 14px; flex: 0 0 auto;">
    <span style="padding: 0 2px 10px; font-size: 14px; font-weight: 600; color: ${T.ink}; border-bottom: 2px solid {{accent}};">새 대본 <span style="color: ${T.ink3}; font-weight: 500;">3</span></span>
    <span style="padding: 0 2px 10px; font-size: 14px; color: ${T.ink3};">분석표 비교</span>
    <span style="padding: 0 2px 10px; font-size: 14px; color: ${T.ink3};">예시</span>
  </div>
  <div style="border: 1px solid ${T.line}; border-radius: 14px; padding: 12px 14px; background: ${T.panel}; display: flex; flex-direction: column; gap: 8px;">
    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; color: ${T.ink2};">
      <span style="display: flex; gap: 10px; align-items: center;"><span style="font-weight: 600; color: ${T.ink};">홈카페 드립백 · reel/coffee_3min 구조</span><span style="font-weight: 600; color: ${OK};">완료</span></span>
      <span style="color: ${T.ink3};">8문장 · 23.0s <span style="color: ${OK};">길이 맞춤 (24.5 → 23.0, 자동 단축 1회)</span> · 존댓말</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 11.5px; color: ${T.ink3}; margin-right: 4px;">톤 3가지 중 고르세요</span>
      ${toneTab("원본형", true)}${toneTab("대화형", false)}${toneTab("후킹 강조형", false)}
    </div>
    <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
      <span style="font-size: 11.5px; color: ${T.ink3}; margin-right: 2px;">셀프 검증</span>
      ${pill(OK_BG, OK, `${I.check}원문 문장 재사용 0 / 8`)}
      ${pill(WARN_BG, WARN, `${I.warn}설계도 약속 12 / 13`)}
      ${pill(WARN_BG, WARN, `${I.warn}지어낸 숫자 · 사실 2건`)}
      <span style="font-size: 11px; color: ${T.ink3};">→ 고칠 것 3개</span>
    </div>
    <div style="border-radius: 12px; background: ${T.panel2}; border: 1px solid ${T.line}; padding: 6px; display: flex; flex-direction: column; gap: 1px;">
      <div style="font-size: 11px; color: {{accent}}; font-weight: 600; padding: 4px 10px 5px;">목업 예시 — 실제 분석·생성·검증은 구현 단계에서 OpenAI 모델 연결 · ①②③ = 아래 「고칠 것」</div>
      ${NEW_LINES.map(row).join("")}
    </div>
    <div style="display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 10px;">
      <div style="border: 1px solid ${T.line}; border-radius: 12px; background: ${T.panel2}; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;">
        <div style="display: flex; align-items: center; justify-content: space-between;"><span style="font-size: 12.5px; font-weight: 600; color: ${T.ink};">고칠 것 딱 3개</span><span style="font-size: 11px; color: ${T.ink3};">점수 대신 수정 포인트만</span></div>
        ${FIXES.map(([k, v], i) => `<div style="display: grid; grid-template-columns: 16px 64px 1fr; gap: 6px; font-size: 12px; line-height: 1.5;"><span style="font-weight: 700; color: ${WARN};">${["①", "②", "③"][i]}</span><span style="color: ${T.ink2}; font-weight: 600;">${k}</span><span style="color: ${T.ink};">${v}</span></div>`).join("")}
      </div>
      <div style="border: 1px solid ${T.line}; border-radius: 12px; background: ${T.panel2}; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;">
        <div style="display: flex; align-items: center; justify-content: space-between;"><span style="font-size: 12.5px; font-weight: 600; color: ${T.ink};">제목 추천 3개</span><span style="font-size: 11px; color: ${T.ink3};">영상 첫 장면 기준 · 영상 있을 때만</span></div>
        ${TITLES.map((t, i) => `<div style="display: grid; grid-template-columns: 16px 1fr; gap: 6px; font-size: 12px; line-height: 1.5;"><span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: ${T.ink3};">${i + 1}</span><span style="color: ${T.ink};">${t}</span></div>`).join("")}
      </div>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
      <div style="font-size: 12.5px; color: ${T.ink3}; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">줄을 클릭하면 그 문장만 다시 쓰고, 고치면 자동으로 다시 검증해요</div>
      <div style="display: flex; gap: 8px;">
        ${btn(I.clip, "복사")}${btn(I.download, "SRT 저장")}${btn(I.download, "분석표(xlsx)")}${btn(I.refresh, "다시 생성")}
      </div>
    </div>
  </div>
</section>`;
}

// ---------- 벤치마크 보드 — 훅AI vs 빈스타그램 (2026-09-02) → 설계 반영표 ----------
function benchmarkBoard() {
  const HOOK = "#E9B25B", BIN = T.blue, NEW = "#6CCB9A";
  const tag = (color, text) => `<span style="display: inline-flex; align-items: center; height: 22px; padding: 0 8px; border-radius: 6px; background: ${T.panel3}; color: ${color}; font-size: 11px; font-weight: 700; white-space: nowrap;">${text}</span>`;
  const ROUNDS = [
    ["① 속도", "받아쓰기 30초 + 대본 3개까지 총 3분", "받아쓰기 10초 + 표·대본까지 총 1분", "빈스타그램", BIN],
    ["② 받아쓰기 정확도", "타임스탬프 없음 · 고유명사 오청취 (“클로드 코워크” → “코워크드”)", "16문장 분리 + 초 단위 타임스탬프 + 한국어 번역 + 클릭 시 영상 이동", "빈스타그램", BIN],
    ["③ 성공 요인 분석", "서술형 설명 · 범용 문구 일부 섞임", "13칸 구조화 표 (후킹 유형 · 타겟 · 타이밍 · CTA 등)", "무승부 — 서술 vs 표, 목적이 다름", T.ink2],
    ["④ 새 대본 퀄리티", "3가지 톤 제공 · 문장이 자연스러움 / 길이 82 → 96초로 초과", "1개만 제공 · 81초로 길이 정확 / 문장 밋밋 + 없는 통계 지어냄 (“일주일 → 하루”)", "훅AI 문장력 · 빈스타 정확도", T.ink2],
    ["⑤ 수정 편의성", "초 단위 환산 · 길이 자동 단축 버튼 · 채팅으로 재요청", "문장 클릭 수정 + SRT 내보내기만", "훅AI", HOOK],
  ];
  const INSIGHTS = [
    ["“잘 쓰는 것”과 “잘 보여주는 것”은 다른 능력", "훅AI는 결과물은 좋지만 과정을 숨기고, 빈스타그램은 과정은 투명하지만 결과물이 심심함. 왕초보에게는 둘 다 필요."],
    ["선택지를 주면 의사결정이 쉬워진다", "대본 1개면 “이게 맞나?” 고민하지만, 3개를 주고 고르게 하면 초보자도 잘 고름."],
    ["AI는 스스로 정한 규칙도 어긴다", "표에 ‘타겟 명시’라고 적고 정작 대본엔 타겟을 안 넣음 · 없는 숫자를 지어내는 할루시네이션 발생 → 생성 후 자동 검증 단계 필수."],
  ];
  const FEATURES = [
    [NEW, "신규", "필수", "링크 한 줄 입력", "파일 업로드 대신 URL 붙여넣기 · 해외 영상 지원 · 왕초보 진입장벽 최소화", "확보 v3", true],
    [BIN, "빈스타", "필수", "타임스탬프 + 한국어 번역 동시 표시", "문장별 몇 초인지 · 원문·번역 함께 · 클릭하면 그 구간 재생", "확보 v3", true],
    [BIN, "빈스타", "필수", "13칸 구조화 분석표", "“왜 잘 됐는지”를 서술 대신 표로 → 학습 곡선 낮춤", "변환 v2", true],
    [HOOK, "훅AI", "", "페르소나 1회 입력 후 기억", "누구에게 · 무슨 이야기 · 어떤 말투를 처음 한 번만 받고 계속 유지", "변환 v3", true],
    [HOOK, "훅AI", "", "3가지 톤 대본 동시 제공", "원본형 · 대화형 · 후킹 강조형 중 사용자가 고름", "변환 v3", true],
    [BIN, "빈스타", "", "길이 자동 맞춤", "초 단위 정확 계산(빈스타) + 초과 시 자동 단축(훅AI) 결합", "변환 v3", true],
    [NEW, "신규", "필수 · 최우선", "생성 후 자동 셀프 검증", "원문을 베꼈나? · 설계도 약속(타겟·구조)을 지켰나? · 없는 숫자·사실을 지어냈나? 3가지 자동 체크", "변환 v3", true],
    [NEW, "신규", "", "“고칠 것 딱 3개”만 안내", "점수 매기기 · 복잡한 채팅창 대신 수정 포인트 3개만", "변환 v3", true],
    [HOOK, "훅AI", "", "썸네일 기반 제목 3개 추천", "첫 장면을 분석해 클릭을 부르는 제목 후보 3개 (영상 있을 때만)", "변환 v3", true],
  ];
  const cell = (extra = "") => `style="padding: 9px 12px; border-top: 1px solid ${T.line}; vertical-align: top; font-size: 12.5px; line-height: 1.5; ${extra}"`;
  const h = (t) => `<div style="font-size: 15px; font-weight: 700; color: ${T.ink}; letter-spacing: -0.01em;">${t}</div>`;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
  <style>
    body { margin: 0; background: ${T.bg}; font-family: ${T.font}; -webkit-font-smoothing: antialiased; }
    a { color: ${HOOK}; } a:hover { color: ${T.ink}; }
    * { box-sizing: border-box; }
  </style>
</helmet>
<div translate="no" style="width: 1440px; height: 900px; background: ${T.bg}; color: ${T.ink}; padding: 28px 36px; display: flex; flex-direction: column; gap: 18px; overflow: hidden;">
  <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 24px;">
    <div style="display: flex; flex-direction: column; gap: 6px; max-width: 760px;">
      <div style="font-size: 11.5px; font-weight: 700; letter-spacing: 0.06em; color: ${HOOK}; text-transform: uppercase;">Reference Script Tool · 벤치마킹 리포트 · 2026-09-02</div>
      <div style="font-size: 24px; font-weight: 700; color: ${T.ink}; letter-spacing: -0.01em; line-height: 1.3;">훅AI vs 빈스타그램 — 같은 영상, 같은 요청으로 붙여본 결과</div>
      <div style="font-size: 13px; color: ${T.ink2}; line-height: 1.6;">82초 영어 릴스(“돈 없이도 좋은 앱을 만들 수 있을까?”)를 두 도구에 동시에 입력 → “이 구조를 따라 <b style="color: ${T.ink};">AI로 릴스 대본 쉽게 만드는 법</b>을 알려주는 새 대본을 써줘” → 속도 · 정확도 · 완성도 비교. 결과는 오른쪽 <b style="color: ${T.ink};">설계 반영표</b>로 정리해 이 목업 v3에 넣었습니다.</div>
    </div>
    <div style="display: grid; grid-template-columns: repeat(2, 250px); gap: 10px; flex: 0 0 auto;">
      <div style="border: 1px solid ${T.line}; border-radius: 12px; background: ${T.panel}; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px;">
        <div style="display: flex; align-items: center; justify-content: space-between;"><span style="font-size: 13.5px; font-weight: 700; color: ${HOOK};">훅AI</span><span style="font-size: 11px; color: ${T.ink3};">hookai.kr · “척척 요리사”</span></div>
        <div style="font-size: 12px; color: ${T.ink2}; line-height: 1.5;">영상 하나로 대본 3개 · 문장이 자연스러움 / 느리고 근거 과정이 안 보임(블랙박스)</div>
      </div>
      <div style="border: 1px solid ${T.line}; border-radius: 12px; background: ${T.panel}; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px;">
        <div style="display: flex; align-items: center; justify-content: space-between;"><span style="font-size: 13.5px; font-weight: 700; color: ${BIN};">빈스타그램</span><span style="font-size: 11px; color: ${T.ink3};">로컬 · 자체 개발 중 · “꼼꼼 선생님”</span></div>
        <div style="font-size: 12px; color: ${T.ink2}; line-height: 1.5;">문장별 타임스탬프 · 번역 · 근거 표 / 대본 1개뿐이고 톤이 딱딱함</div>
      </div>
    </div>
  </div>

  <div style="flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: 800px minmax(0, 1fr); gap: 20px;">
    <div style="display: flex; flex-direction: column; gap: 14px; min-width: 0;">
      <div style="border: 1px solid ${T.line}; border-radius: 14px; background: ${T.panel}; overflow: hidden;">
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px 10px;">${h("5라운드 결과")}<span style="font-size: 11.5px; color: ${T.ink3};">실험 조건 한계: 훅AI엔 새 주제를 따로 지정하지 않아 완전히 동일 조건은 아님</span></div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <th style="padding: 7px 12px; text-align: left; font-size: 11px; font-weight: 600; color: ${T.ink3}; background: ${T.panel2}; width: 130px;">라운드</th>
            <th style="padding: 7px 12px; text-align: left; font-size: 11px; font-weight: 700; color: ${HOOK}; background: ${T.panel2};">훅AI</th>
            <th style="padding: 7px 12px; text-align: left; font-size: 11px; font-weight: 700; color: ${BIN}; background: ${T.panel2};">빈스타그램</th>
            <th style="padding: 7px 12px; text-align: left; font-size: 11px; font-weight: 600; color: ${T.ink3}; background: ${T.panel2}; width: 150px;">승자</th>
          </tr>
          ${ROUNDS.map(([r, a, b, w, c]) => `<tr><td ${cell(`color: ${T.ink}; font-weight: 600;`)}>${r}</td><td ${cell(`color: ${T.ink2};`)}>${a}</td><td ${cell(`color: ${T.ink2};`)}>${b}</td><td ${cell(`color: ${c}; font-weight: 700;`)}>${w}</td></tr>`).join("")}
        </table>
      </div>
      <div style="border: 1px solid ${T.line}; border-radius: 14px; background: ${T.panel}; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;">
        ${h("핵심 인사이트 3가지")}
        ${INSIGHTS.map(([t, d], i) => `<div style="display: grid; grid-template-columns: 22px 1fr; gap: 8px; align-items: baseline;"><span style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: ${HOOK}; font-weight: 500;">${i + 1}</span><div style="font-size: 12.5px; line-height: 1.55;"><span style="font-weight: 600; color: ${T.ink};">${t}</span> <span style="color: ${T.ink2};">— ${d}</span></div></div>`).join("")}
      </div>
    </div>

    <div style="border: 1px solid ${T.line}; border-radius: 14px; background: ${T.panel}; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; min-width: 0;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">${h("신규 서비스 기능 설계 반영표")}<div style="display: flex; gap: 6px;">${tag(HOOK, "훅AI에서")}${tag(BIN, "빈스타에서")}${tag(NEW, "새로 추가")}</div></div>
      ${FEATURES.map(([c, src, pri, t, d, where, done]) => `
      <div style="display: grid; grid-template-columns: 64px 1fr 74px; gap: 10px; align-items: start; padding: 7px 0; border-top: 1px solid ${T.line};">
        <div style="display: flex; flex-direction: column; gap: 3px; align-items: flex-start;">${tag(c, src)}${pri ? `<span style="font-size: 10px; color: ${T.ink3}; white-space: nowrap;">${pri}</span>` : ""}</div>
        <div style="min-width: 0;"><div style="font-size: 13px; font-weight: 600; color: ${T.ink}; line-height: 1.4;">${t}</div><div style="font-size: 11.5px; color: ${T.ink2}; line-height: 1.5;">${d}</div></div>
        <div style="display: flex; flex-direction: column; gap: 2px; align-items: flex-end; text-align: right;"><span style="font-size: 11.5px; font-weight: 600; color: ${done ? NEW : T.ink3};">${where}</span><span style="font-size: 10px; color: ${T.ink3};">${done ? "목업 반영" : "추후"}</span></div>
      </div>`).join("")}
    </div>
  </div>

  <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 11.5px; color: ${T.ink3};">
    <span>남은 확인 사항 — hookai.kr · localhost:3000 실제 화면(버튼 배치 · 로딩 화면)은 아직 직접 확인 전. 화면 기록 권한 설정 또는 스크린샷 공유 후 디테일 반영.</span>
    <span>조이 (Hermes Agent) 정리 · “대본 로봇 두 대의 시합” 리포트 재구성 · 2026-09-02</span>
  </div>
</div>
</x-dc>
</body>
</html>`;
}

// ---------- page frame ----------
function page({ left = "", right = "", body = "", active = "search", h = 900 }) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
  <style>
    body { margin: 0; background: ${T.bg}; font-family: ${T.font}; -webkit-font-smoothing: antialiased; }
    a { color: {{accent}}; } a:hover { color: ${T.ink}; }
    * { box-sizing: border-box; }
  </style>
</helmet>
<div translate="no" style="width: 1440px; height: ${h}px; background: ${T.bg}; color: ${T.ink}; display: flex; flex-direction: column; position: relative; overflow: hidden;">
  ${topbar()}
  <div style="flex: 1 1 auto; display: flex; min-height: 0;">
    ${sidebar(active)}
    ${body || `<main style="flex: 1 1 auto; min-width: 0; display: flex; gap: 20px; padding: 24px;">
      ${left}
      ${right}
    </main>`}
  </div>
  ${fab}
</div>
</x-dc>
<script data-dc-script data-props='{"accent":{"editor":"color","default":"#E9B25B","options":["#E9B25B","#5EE0B8","#7FA7FF","#F26D7D"],"section":"브랜드"},"$preview":{"width":1440,"height":${h}}}'>
class Component extends DCLogic {
  renderVals() {
    return { accent: this.props.accent ?? '#E9B25B' };
  }
}
</script>
</body>
</html>`;
}

// ---------- artboards ----------
const chips2 = [
  { kind: "VID", name: "reel_cooking.mp4", meta: "23s" },
  { kind: "AUD", name: "voice_memo.m4a", meta: "19s" },
];
const boards = {
  Search: page({ body: searchEmpty() }),
  Default: page({ left: leftPanel({ chips: [], text: "", count: 0, active: false }), right: samplePanel(), active: "extract" }),
  Editing: page({
    left: leftPanel({ chips: chips2, text: `${token("reel_cooking.mp4")} 는 구어체 그대로 유지하고 군더더기만 제거. ${token("voice_memo.m4a")} 는 문장 단위로 줄바꿈.`, count: 72, speakers: true, active: true, fileCount: 2 }),
    right: samplePanel(), active: "extract",
  }),
  ExtractResult: page({
    left: leftPanel({ chips: [chips2[0]], text: `${token("reel_cooking.mp4")} 구어체 그대로, 군더더기만 제거`, count: 31, speakers: true, active: true, fileCount: 1 }),
    right: resultPanel(), active: "extract",
  }),
  Fetching: page({ body: searchFetching() }),
  Result: page({ body: searchResult() }),
  Convert: page({ left: convertLeft(), right: convertRight(), active: "convert", h: 1000 }),
  Convert3: page({ body: convertThree({ T, I }), active: "convert", h: 1820 }),
  Benchmark: benchmarkBoard(),
};

writeFileSync(join(here, "Main.dc.html"), interactiveMain({ T, I, ic, convertLeft, convertRight }));
for (const [name, html] of Object.entries(boards)) writeFileSync(join(here, `${name}.dc.html`), html);

const canvas = {
  artboards: [
    { file: "Main.dc.html", title: "★ 클릭해서 확인 — 인터랙티브 프로토타입 v4 (링크로 찾기 · 레퍼런스 대본 확보 · 변환, 사이드바로 전환)", x: 0, y: 0, w: 1440, h: 900, is_interactive: true },
    { file: "Benchmark.dc.html", title: "벤치마크 · 훅AI vs 빈스타그램 (2026-09-02) → 설계 반영표", x: 1560, y: 0, w: 1440, h: 900 },
    { file: "Search.dc.html", title: "링크로 찾기 1 · 검색 전", x: 0, y: 1080, w: 1440, h: 900 },
    { file: "Fetching.dc.html", title: "링크로 찾기 2 · 링크 입력 → 가져오는 중 (단계 표시)", x: 1560, y: 1080, w: 1440, h: 900 },
    { file: "Result.dc.html", title: "링크로 찾기 3 · 대본 결과 (영상 + 동기 자막 + 타임코드 + 한국어 번역)", x: 3120, y: 1080, w: 1440, h: 900 },
    { file: "Default.dc.html", title: "레퍼런스 대본 확보 1 · 기본 (예시 탭)", x: 0, y: 2160, w: 1440, h: 900 },
    { file: "Editing.dc.html", title: "레퍼런스 대본 확보 2 · 입력 중 (파일 2개 · @참조 · 화자 구분 켜기)", x: 1560, y: 2160, w: 1440, h: 900 },
    { file: "ExtractResult.dc.html", title: "레퍼런스 대본 확보 3 · 대본 결과 (영상 + 동기 자막 + 타임코드 대본)", x: 3120, y: 2160, w: 1440, h: 900 },
    { file: "Convert.dc.html", title: "레퍼런스 대본 변환 v3 (설계도 기반 · 3가지 톤 · 셀프 검증 · 고칠 것 3개 · 제목 추천)", x: 0, y: 3240, w: 1440, h: 1000 },
    { file: "Convert3.dc.html", title: "★ 레퍼런스 대본 변환 v4 · 새 대본 A안·B안·C안 나란히 (원본형 · 대화형 · 후킹형) + HOOK·BODY·CTA 구간별 시간초", x: 0, y: 4360, w: 1440, h: 1820 },
  ],
  annotations: [
    {
      id: "brief", x: 0, y: -420, w: 600,
      text:
        "BinStaGram · 화면 목업 v4 (2026-09-02)\n제작 도구 3개: ① 링크로 찾기 — 영상 링크(인스타그램 · 유튜브 · 틱톡)를 붙여넣으면 음성을 글로 변환 → 타임코드 대본 + 동기 자막 + 한국어 번역. ② 레퍼런스 대본 확보 — 내 파일(동영상/오디오)을 올려 같은 방식으로 대본 추출. ③ 레퍼런스 대본 변환 — 설계도대로 내 주제의 새 대본.\n위 첫 보드는 클릭해서 동작 확인: 검색창에 링크 붙여넣기 → 「대본 가져오기」 → 단계 진행(내려받기 → 음성 인식 → 문장 나누기 → 번역) → 결과 카드(영상 + 자막 + 문장 클릭 = 그 구간으로) · 복사 / SRT 저장 / 변환으로 보내기. 언어 · 화자 구분 · 번역은 검색창 아래 옵션.\n주의: 목업에는 다운로드·음성 인식이 없어 대본은 '샘플 문장'입니다. 실제 구현은 OpenAI Whisper API.\n오른쪽 보드 = 이 목업의 근거가 된 벤치마크 결과와 설계 반영표. 아래 3장은 상태별 정지 화면(참고용).",
    },
    {
      id: "convert-q", x: 1560, y: 3240, w: 520,
      text:
        "레퍼런스 대본 변환 v3 — 설계도('레퍼런스_영상대본_분석기준.xlsx' 13항목) + 2026-09-02 벤치마크 반영\n① 원본 대본 선택 → ② 기준표 13항목 자동 분석(후킹 4 · 본문 4 · CTA 4 · 말투) → 항목 클릭해 수정 → ③ 내 주제 입력(페르소나는 처음 한 번만, 이후 기억) → 「새 대본 생성」.\n결과: 설계도대로 쓴 새 대본을 원본형 · 대화형 · 후킹 강조형 3가지 톤으로 동시 제공(훅AI 방식). 길이는 초 단위로 계산하고 초과하면 자동 단축(빈스타 + 훅AI 결합).\n생성 직후 셀프 검증 3가지: 원문 문장 재사용? · 설계도 약속(타겟 명시 · 구조)을 대본이 실제로 지켰나? · 없는 숫자·사실을 지어냈나? → 점수 대신 「고칠 것 딱 3개」만 안내. 예시 화면은 벤치마크에서 실제 발견된 두 실수(타겟 누락 · 지어낸 수치)를 잡아낸 상태.\n제목 추천 3개는 영상 첫 장면 기준이라 영상이 있을 때만. 「분석표 비교」 탭 = xlsx 2번 시트 형식 대조 + xlsx 내보내기.",
    },
    {
      id: "changes", x: 1560, y: -420, w: 460,
      text:
        "v3 → v4 변경 (2026-09-02)\n· 사이드바: 「해외 레퍼런스 확보」 삭제, 「링크로 찾기」를 제작 도구 첫 메뉴로 → 제작 도구 = 링크로 찾기 · 레퍼런스 대본 확보 · 레퍼런스 대본 변환\n· 링크로 찾기 = 검색창 하나로 시작하는 링크 검색 UX (업로드 · 예시 탭 없음). 레퍼런스 대본 확보(파일 업로드 · 다듬기 지시 · 예시/결과 탭)는 v2 형태 그대로 유지, 링크 입력란만 링크로 찾기로 이동\n· 옵션(언어 · 화자 구분 · 한국어 번역)은 검색창 아래 한 줄\n· 결과 카드: 세로 영상 + 문장 목록(원문 + 번역) 나란히, 「변환으로 보내기」 버튼\n\nv2 → v3: 벤치마크 반영 (3가지 톤 · 셀프 검증 · 고칠 것 3개 · 제목 추천 · 번역 표시)\nv1 → v2: 언어/화자 구분 토글, 크레딧 삭제, Whisper 25MB 한도",
    },
  ],
  launch: { view: "canvas" },
};
canvas.annotations.push({
  id: "convert3", x: 1560, y: 4360, w: 520,
  text:
    "레퍼런스 대본 변환 v4 (2026-09-03) — 훅AI 방식 반영\n· 새 대본이 A안 원본형 · B안 대화형 · C안 후킹형 3개로 동시에 나와 나란히 비교. 각 안 하단에 큰 「사용하기」 버튼 하나. 누르면 그 안이 '사용 중'(테두리 강조)이 되고 버튼이 「편집하기」로 바뀜. 편집하기를 누르면 3안 아래에 스크립트 에디터가 펼쳐짐(훅AI 에디터 방식): HOOK·BODY·CTA 칸을 직접 고치고(문장 앞 시간초, 칸마다 문장 수·글자·구간·초), 총 분량 + 시간 압축(목표 N초 → 압축 제안), 피드백 받기, 다시 선택하기 · 텍스트 복사 · 완성 및 내보내기. 오른쪽 AI 코파일럿: 범위(전체·HOOK·BODY·CTA) 고르고 수정 요청 → 왼쪽에 바로 반영. 「고칠 것 3개」·「제목 추천」 패널은 삭제(피드백 받기로 흡수).\n· 각 안은 HOOK · BODY · CTA 세 구간으로 나누고, 구간마다 시작–끝 초와 길이(예: 0:00.0 – 0:05.8 · 5.8s), 문장마다 시작 초를 붙임 → 훅AI(시간 없음)와 달리 몇 초에 무슨 말을 하는지 바로 보임.\n· 3안이 들어갈 폭을 만들기 위해 결과가 나오면 왼쪽 ①②③ 설정 패널이 64px 레일로 접힘(클릭하면 다시 펼침). 레일에 원본·분석·주제 상태만 표시.\n· 검증 경고(없는 숫자·후기)는 해당 문장에 인라인, 안별 머리에 '고칠 것 N / 검증 통과'.",
});
canvas.annotations.push({
  id: "benchmark", x: 3080, y: 0, w: 520,
  text:
    "벤치마크 보드 (오른쪽) — 출처: hookai_vs_binsta_analysis.html (2026-09-02, 조이/Hermes Agent 정리)\n5라운드 요약: 속도·받아쓰기 정확도 = 빈스타 승 / 성공 요인 분석 = 무승부 / 새 대본 퀄리티 = 훅AI 문장력 · 빈스타 정확도 / 수정 편의성 = 훅AI 승.\n이 목업 v3에 반영한 것 9개 중 8개는 v3 신규, '13칸 분석표'는 v2에서 이미 반영. 가장 큰 리스크(할루시네이션 · 자기 규칙 위반)는 변환 보드의 '셀프 검증 → 고칠 것 3개'로 대응.\n미확인: 훅AI 실제 화면(UI/UX)은 아직 직접 못 봄 — 버튼 배치·로딩 화면은 스크린샷 확보 후 반영.",
});
writeFileSync(join(here, "canvas.json"), JSON.stringify(canvas, null, 2));
console.log("wrote Main/Search/Fetching/Result/Default/Editing/ExtractResult/Convert/Benchmark .dc.html + canvas.json");
