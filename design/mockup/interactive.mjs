// Main.dc.html — 클릭 가능한 프로토타입 아트보드 (링크로 찾기 = 영상 링크 → 타임코드 대본 + 한국어 번역)
// build-mockup.mjs 가 import. 실제 다운로드·음성 인식은 없음 — 결과는 "샘플 대본"으로 표기.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** LinkVideos.dc.html(프로필 + 인스타그램 카드 목업)을 읽어 CSS 는 .lv 로 스코프, 본문은 그대로 돌려준다 */
function linkVideosPage() {
  const raw = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "LinkVideos.dc.html"), "utf8");
  const css = raw.slice(raw.indexOf("<style>") + 7, raw.indexOf("</style>"));
  const body = raw.slice(raw.indexOf("</style>") + 8).trim();
  // 셀렉터마다 .lv 접두 — :root/body 는 .lv 자체로
  let out = "", buf = "", depth = 0, inAt = false;
  for (const ch of css) {
    if (ch === "{") {
      const sel = buf.trim();
      if (sel.startsWith("@")) { out += buf + "{"; inAt = depth === 0; }
      else out += buf.slice(0, buf.length - buf.trimStart().length) + sel.split(",").map((x) => {
        x = x.trim();
        if (x === ":root" || x === "body") return ".lv";
        return ".lv " + x;
      }).join(", ") + "{";
      buf = ""; depth++;
    } else if (ch === "}") { out += buf + "}"; buf = ""; depth--; if (depth === 0) inAt = false; }
    else if (ch === ";" && depth > 0) { out += buf + ";"; buf = ""; }
    else buf += ch;
  }
  return { css: out + buf, body };
}

export function interactiveMain({ T, I, ic, convertLeft, convertRight }) {
  const OK = "#6CCB9A";
  const LV = linkVideosPage();
  const searchBar = (compact) => `
        <div style="display: flex; align-items: center; gap: 10px; height: ${compact ? 52 : 60}px; padding: 0 8px 0 18px; border-radius: 16px; background: ${T.panel}; border: 1.5px solid {{barBorder}}; box-shadow: 0 10px 30px rgba(0,0,0,0.25);">
          <span style="display: flex; color: {{barIcon}};">${I.link}</span>
          <input type="text" value="{{url}}" onChange="{{onUrl}}" placeholder="https:// 영상 링크를 붙여넣으세요 — 인스타그램 · 유튜브 · 틱톡" style="flex: 1 1 auto; min-width: 0; border: none; background: transparent; color: ${T.ink}; font-size: ${compact ? 14 : 15}px; font-family: inherit; padding: 0;"></input>
          <span class="clk" onClick="{{fetchUrl}}" style="display: flex; align-items: center; gap: 6px; height: ${compact ? 38 : 44}px; padding: 0 16px; border-radius: 11px; font-size: 14px; font-weight: 700; white-space: nowrap; {{fetchStyle}}">${I.search}대본 가져오기</span>
        </div>`;
  const optionsRow = `
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
          <sc-if value="{{hasPlatform}}" hint-placeholder-val="{{ false }}"><span style="display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 10px; border-radius: 999px; background: ${T.blueSoft}; color: ${T.blue}; font-size: 11.5px; font-weight: 600; margin-right: 4px;">${I.check}{{platform}} · 링크 인식됨</span></sc-if>
          <div style="position: relative;">
            <div class="clk" onClick="{{toggleLang}}" style="display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 14px; border-radius: 10px; background: ${T.panel}; border: 1px solid {{langBorder}}; font-size: 13.5px; color: ${T.ink};"><span style="color: ${T.ink3}; font-size: 12.5px;">언어</span><span style="font-weight: 500;">{{langName}}</span><span style="display: flex; color: ${T.ink3};">${I.chev}</span></div>
            <sc-if value="{{langOpen}}" hint-placeholder-val="{{ false }}">
              <div style="position: absolute; left: 0; top: calc(100% + 8px); width: 300px; background: ${T.panel2}; border: 1px solid ${T.line2}; border-radius: 12px; padding: 8px; box-shadow: 0 12px 32px rgba(0,0,0,0.45); z-index: 5; display: flex; flex-direction: column; gap: 2px;">
                <div style="font-size: 11.5px; color: ${T.ink3}; padding: 6px 10px;">음성 언어</div>
                <sc-for list="{{langs}}" as="m" hint-placeholder-count="3">
                  <div class="clk" onClick="{{m.pick}}" style="display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border-radius: 8px; {{m.style}}"><div style="font-size: 13.5px; font-weight: 600; color: ${T.ink};">{{m.name}}</div><div style="font-size: 12px; color: ${T.ink2};">{{m.desc}}</div></div>
                </sc-for>
              </div>
            </sc-if>
          </div>
          <div class="clk" onClick="{{toggleSpeakers}}" style="display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 14px; border-radius: 10px; background: ${T.panel}; border: 1px solid ${T.line}; font-size: 13.5px; color: ${T.ink};"><span style="color: ${T.ink3}; font-size: 12.5px;">화자 구분</span><span style="font-weight: 500;">{{speakersLabel}}</span><span style="width: 34px; height: 20px; border-radius: 10px; background: {{spkBg}}; position: relative; flex: 0 0 auto;"><span style="position: absolute; top: 2px; left: {{spkKnob}}; width: 16px; height: 16px; border-radius: 50%; background: #FFFFFF; transition: left .15s;"></span></span></div>
          <div class="clk" onClick="{{toggleTranslate}}" style="display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 14px; border-radius: 10px; background: ${T.panel}; border: 1px solid ${T.line}; font-size: 13.5px; color: ${T.ink};"><span style="color: ${T.ink3}; font-size: 12.5px;">한국어 번역</span><span style="font-weight: 500;">{{translateLabel}}</span><span style="width: 34px; height: 20px; border-radius: 10px; background: {{trBg}}; position: relative; flex: 0 0 auto;"><span style="position: absolute; top: 2px; left: {{trKnob}}; width: 16px; height: 16px; border-radius: 50%; background: #FFFFFF; transition: left .15s;"></span></span></div>
        </div>`;

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
    .clk { cursor: pointer; user-select: none; transition: filter .12s, background .12s; }
    .clk:hover { filter: brightness(1.12); }
    textarea { font-family: inherit; }
    textarea::placeholder { color: ${T.ink3}; }
    textarea:focus { outline: none; }
    input[type="text"]::placeholder { color: ${T.ink3}; }
    input[type="text"]:focus { outline: none; }
    /* 링크로 찾은 영상 (LinkVideos.dc.html, .lv 스코프) */
    ${LV.css}
    .lv { padding: 0; }
    .lv .wrap { max-width: none; padding: 24px 24px 80px; }
  </style>
</helmet>
<div translate="no" style="width: 1440px; height: 900px; background: ${T.bg}; color: ${T.ink}; display: flex; flex-direction: column; position: relative; overflow: hidden;">

  <!-- 상단바 -->
  <div style="height: 64px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; border-bottom: 1px solid ${T.line}; background: ${T.bg};">
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="width: 30px; height: 30px; border-radius: 8px; background: {{accent}}; display: flex; align-items: center; justify-content: center;">
        <svg width="16" height="16" viewBox="0 0 24 24"><path d="M7 5v14l11-7z" fill="#0E1116"/></svg>
      </div>
      <span style="font-size: 18px; font-weight: 700; letter-spacing: -0.01em; color: ${T.ink};">BinStaGram</span>
    </div>
    <div style="display: flex; align-items: center; gap: 14px;">
      <div class="clk" onClick="{{bell}}" style="width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: ${T.ink2};">${I.bell}</div>
      <div class="clk" onClick="{{lang}}" style="width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: ${T.ink2};">${I.globe}</div>
      <div style="width: 36px; height: 36px; border-radius: 50%; background: ${T.blueSoft}; color: ${T.blue}; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center;">h</div>
    </div>
  </div>

  <div style="flex: 1 1 auto; display: flex; min-height: 0;">
    <aside style="width: 232px; flex: 0 0 auto; background: ${T.side}; border-right: 1px solid ${T.line}; padding: 16px 12px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto;">
      <div class="clk" onClick="{{goSteps}}" style="display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 12px; border-radius: 10px; font-size: 14px; color: ${T.ink2};"><span style="display: flex; color: ${T.ink3};">${I.steps}</span><span style="flex: 1 1 auto;">순서</span></div>
      <div style="font-size: 11.5px; color: ${T.ink3}; padding: 0 12px; margin: 18px 0 6px; letter-spacing: 0.02em;">제작 도구</div>
      <div class="clk" onClick="{{goSearch}}" style="display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 12px; border-radius: 10px; font-size: 14px; {{navSearchStyle}}"><span style="display: flex; color: {{navSearchIcon}};">${I.search}</span><span style="flex: 1 1 auto;">링크로 찾기</span></div>
      <div class="clk" onClick="{{goLinkVideos}}" style="display: flex; align-items: center; gap: 10px; height: 36px; padding: 0 12px 0 24px; border-radius: 10px; font-size: 13.5px; {{navLinkVideosStyle}}"><span style="display: flex; color: {{navLinkVideosIcon}};">${ic('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 10h4M3 14h4M17 10h4M17 14h4"/>', 16)}</span><span style="flex: 1 1 auto;">링크로 찾은 영상</span></div>
      <div class="clk" onClick="{{goExtract}}" style="display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 12px; border-radius: 10px; font-size: 14px; {{navExtractStyle}}"><span style="display: flex; color: {{navExtractIcon}};">${I.ref}</span><span style="flex: 1 1 auto;">레퍼런스 대본 확보</span></div>
      <div class="clk" onClick="{{goConvert}}" style="display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 12px; border-radius: 10px; font-size: 14px; {{navConvertStyle}}"><span style="display: flex; color: {{navConvertIcon}};">${I.convert}</span><span style="flex: 1 1 auto;">레퍼런스 대본 변환</span></div>

      <!-- 최근: 세 저장소(링크로 찾은 영상·대본 결과·변환 결과)를 읽기만 하는 목록. 진행 중이 맨 위 -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 12px; margin: 22px 0 6px;">
        <span style="font-size: 11.5px; color: ${T.ink3}; letter-spacing: 0.02em;">최근</span>
        <span style="font-size: 11px; color: ${T.ink3};">8</span>
      </div>
      ${[
        { view: "linkvideos", kind: "extract", title: "awesome_motherhood_DcbNsJPRwxX.mp4", sub: "대본 추출 중 · 42%", when: "지금", state: "run" },
        { view: "linkvideos", kind: "link", title: "@awesome_motherhood", sub: "계정 · 기준 충족 4", when: "3분 전", state: "ok" },
        { view: "extract", kind: "extract", title: "awesome_motherhood_DcjB2hVx2Rz.mp4", sub: "대본 · 13.8s · EN", when: "12분 전", state: "ok" },
        { view: "linkvideos", kind: "link", title: "@cleaningwithida", sub: "계정 · 기준 없음 → 1위 2개", when: "1시간 전", state: "warn" },
        { view: "convert", kind: "convert", title: "instagram_claudeai_DcbjzD0NuVq", sub: "변환 · 주부 타겟 · 3안", when: "2시간 전", state: "ok" },
        { view: "linkvideos", kind: "link", title: "@aiwithanushka", sub: "계정 · 기준 없음 → 1위 1개", when: "어제", state: "warn" },
        { view: "extract", kind: "extract", title: "instagram_claudeai_DalKeQqOguu.mp4", sub: "대본 · 90.1s · EN", when: "어제", state: "ok" },
        { view: "linkvideos", kind: "post", title: "DcbNsJPRwxX (게시물)", sub: "직접 지정 · 1개", when: "2일 전", state: "ok" },
      ].map((r) => {
        const go = r.view === "linkvideos" ? "goLinkVideos" : r.view === "extract" ? "goExtract" : "goConvert";
        const icon = r.kind === "link" || r.kind === "post"
          ? ic('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 10h4M3 14h4M17 10h4M17 14h4"/>', 14)
          : r.kind === "extract" ? ic('<rect x="3" y="5" width="14" height="14" rx="2"/><path d="M17 9l4-2v10l-4-2"/><path d="M7 12h6M7 15h4"/>', 14)
          : ic('<path d="M4 7h11l-3-3M20 17H9l3 3"/><path d="M4 7v2a3 3 0 0 0 3 3h2M20 17v-2a3 3 0 0 0-3-3h-2"/>', 14);
        const dot = r.state === "run"
          ? `<span style="width: 7px; height: 7px; border-radius: 50%; background: #E9B25B; box-shadow: 0 0 0 3px rgba(233,178,91,.22); flex: 0 0 auto;"></span>`
          : r.state === "warn"
            ? `<span style="width: 7px; height: 7px; border-radius: 50%; background: #E9B25B; opacity: .55; flex: 0 0 auto;"></span>`
            : `<span style="width: 7px; height: 7px; border-radius: 50%; background: ${OK}; flex: 0 0 auto;"></span>`;
        const bg = r.state === "run" ? `background: ${T.panel2}; box-shadow: inset 0 0 0 1px ${T.line2};` : "";
        return `<div class="clk" onClick="{{${go}}}" title="${r.title}" style="display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 10px; border-radius: 10px; ${bg}">
        ${dot}
        <span style="display: flex; color: ${r.state === "run" ? "#E9B25B" : T.ink3}; flex: 0 0 auto;">${icon}</span>
        <span style="flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; line-height: 1.25;">
          <span style="font-size: 12.5px; color: ${T.ink}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${r.state === "run" ? "font-weight: 600;" : ""}">${r.title}</span>
          <span style="font-size: 11px; color: ${r.state === "run" ? "#E9B25B" : T.ink3}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.sub}</span>
        </span>
        <span style="font-size: 10.5px; color: ${T.ink3}; flex: 0 0 auto; font-family: "IBM Plex Mono", Menlo, monospace;">${r.when}</span>
      </div>`;
      }).join("\n      ")}
      <div class="clk" onClick="{{goLinkVideos}}" style="margin-top: 4px; padding: 0 12px; height: 30px; display: flex; align-items: center; font-size: 11.5px; color: ${T.ink3};">전체 보기 ›</div>
    </aside>

    <sc-if value="{{viewConvert}}" hint-placeholder-val="{{ false }}">
      <main style="flex: 1 1 auto; min-width: 0; display: flex; gap: 20px; padding: 24px;">
        ${convertLeft()}
        ${convertRight()}
      </main>
    </sc-if>

    <sc-if value="{{viewLinkVideos}}" hint-placeholder-val="{{ false }}">
      <main style="flex: 1 1 auto; min-width: 0; overflow-y: auto;">
        <div class="lv">${LV.body}</div>
      </main>
    </sc-if>

    <sc-if value="{{viewExtract}}" hint-placeholder-val="{{ false }}">
      <main style="flex: 1 1 auto; min-width: 0; display: flex; gap: 20px; padding: 24px;">
      <!-- 좌측 작업 패널 -->
      <section style="width: 560px; flex: 0 0 auto; display: flex; flex-direction: column; gap: 16px; padding: 20px; border-radius: 16px; background: ${T.side}; border: 1px solid ${T.line};">
        <div>
          <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: ${T.ink}; letter-spacing: -0.01em;">레퍼런스 대본 확보</h1>
          <div style="font-size: 12.5px; color: ${T.ink2}; margin-top: 4px;">레퍼런스 영상의 <b style="color: ${T.ink};">음성을 글로 변환</b>해 타임코드가 붙은 대본을 만듭니다.</div>
        </div>

        <div style="border: 1px solid ${T.line}; border-radius: 12px; padding: 14px 16px 16px; background: ${T.panel};">
          <div style="font-size: 12.5px; color: ${T.ink2}; margin-bottom: 10px;">동영상 / 오디오 최대 5개 <span style="color: ${T.ink3};">(파일당 25MB 이하 · 파일마다 대본 1개)</span> <span style="color: ${T.ink3}; font-variant-numeric: tabular-nums;">· {{chipCount}}/5</span></div>
          <div onDragOver="{{onDragOver}}" onDrop="{{onDrop}}" style="border: 1.5px dashed {{zoneBorder}}; border-radius: 10px; padding: {{zonePad}} 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; background: ${T.panel2};">
            <input type="file" id="realFileInput" multiple="{{ true }}" accept="video/*,audio/*" onChange="{{onFiles}}" style="display: none;"></input>
            <label for="realFileInput" class="clk" style="display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%;">
              <span style="display: flex; color: ${T.ink2};">${I.upload}</span>
              <div style="font-size: 14px; font-weight: 600; color: ${T.ink};">동영상 / 오디오</div>
              <div style="font-size: 12px; color: ${T.ink3};">{{zoneHint}}</div>
            </label>
          </div>
          <sc-if value="{{hasChips}}" hint-placeholder-val="{{ false }}">
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; max-height: 84px; overflow-y: auto;">
              <sc-for list="{{chips}}" as="c" hint-placeholder-count="2">
                <div style="display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 8px 0 4px; border-radius: 8px; background: ${T.panel3}; border: 1px solid ${T.line2}; font-size: 12.5px; color: ${T.ink};">
                  <span style="width: 28px; height: 28px; border-radius: 6px; background: ${T.panel2}; display: flex; align-items: center; justify-content: center; color: ${T.ink2}; font-size: 10px; font-weight: 700;">{{c.kindLabel}}</span>
                  <span style="font-weight: 500;">{{c.name}}</span>
                  <span style="color: ${T.ink3}; font-variant-numeric: tabular-nums;">{{c.meta}}</span>
                  <span class="clk" onClick="{{c.remove}}" style="display: flex; color: ${T.ink3}; margin-left: 2px;">${I.x}</span>
                </div>
              </sc-for>
            </div>
          </sc-if>
        </div>

        <div style="border: 1px solid ${T.line}; border-radius: 12px; padding: 14px 16px 12px; background: ${T.panel}; min-height: 150px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; position: relative;">
          <textarea value="{{note}}" onChange="{{onNote}}" maxLength="1000" placeholder="추출 후 다듬기 지시 (선택) — 예: 구어체 그대로 유지, 군더더기 제거, 문장 단위로 줄바꿈. @로 파일을 지정할 수 있어요." style="width: 100%; min-height: 78px; resize: none; border: none; background: transparent; color: ${T.ink}; font-size: 14px; line-height: 1.7; padding: 0;"></textarea>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div class="clk" onClick="{{toggleMention}}" style="display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 8px; background: ${T.panel2}; border: 1px solid ${T.line}; font-size: 12.5px; color: ${T.ink2};"><span style="display: flex;">${I.at}</span>참조</div>
            <div style="font-size: 12px; color: ${T.ink3}; font-variant-numeric: tabular-nums;">{{noteLen}}/1000</div>
          </div>
          <sc-if value="{{mentionOpen}}" hint-placeholder-val="{{ false }}">
            <div style="position: absolute; left: 16px; bottom: 52px; width: 300px; background: ${T.panel2}; border: 1px solid ${T.line2}; border-radius: 10px; padding: 8px; box-shadow: 0 12px 32px rgba(0,0,0,0.45); z-index: 3; display: flex; flex-direction: column; gap: 2px;">
              <div style="font-size: 11.5px; color: ${T.ink3}; padding: 4px 8px;">파일 참조 삽입</div>
              <sc-if value="{{noChips}}" hint-placeholder-val="{{ false }}"><div style="font-size: 12.5px; color: ${T.ink2}; padding: 8px;">먼저 파일을 업로드하세요.</div></sc-if>
              <sc-for list="{{chips}}" as="c" hint-placeholder-count="2">
                <div class="clk" onClick="{{c.mention}}" style="display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 8px; border-radius: 7px; font-size: 13px; color: ${T.ink};"><span style="color: ${T.blue}; font-weight: 600;">@</span>{{c.name}}<span style="margin-left: auto; color: ${T.ink3}; font-size: 12px;">{{c.meta}}</span></div>
              </sc-for>
            </div>
          </sc-if>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; position: relative;">
            <div style="position: relative;">
              <div class="clk" onClick="{{xToggleLang}}" style="display: flex; align-items: center; justify-content: space-between; height: 44px; padding: 0 14px; border-radius: 10px; background: ${T.panel}; border: 1px solid {{xLangBorder}}; font-size: 14px; color: ${T.ink};">
                <span style="display: flex; gap: 8px; align-items: center;"><span style="color: ${T.ink3}; font-size: 12.5px;">언어</span><span style="font-weight: 500;">{{xLangName}}</span></span><span style="display: flex; color: ${T.ink3};">${I.chev}</span>
              </div>
              <sc-if value="{{xLangOpen}}" hint-placeholder-val="{{ false }}">
                <div style="position: absolute; left: 0; bottom: calc(100% + 8px); width: 320px; background: ${T.panel2}; border: 1px solid ${T.line2}; border-radius: 12px; padding: 8px; box-shadow: 0 12px 32px rgba(0,0,0,0.45); z-index: 2; display: flex; flex-direction: column; gap: 2px;">
                  <div style="font-size: 11.5px; color: ${T.ink3}; padding: 6px 10px;">음성 언어</div>
                  <sc-for list="{{xLangs}}" as="m" hint-placeholder-count="3">
                    <div class="clk" onClick="{{m.pick}}" style="display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border-radius: 8px; {{m.style}}">
                      <div style="font-size: 13.5px; font-weight: 600; color: ${T.ink};">{{m.name}}</div>
                      <div style="font-size: 12px; color: ${T.ink2};">{{m.desc}}</div>
                    </div>
                  </sc-for>
                </div>
              </sc-if>
            </div>
            <div class="clk" onClick="{{xToggleSpeakers}}" style="display: flex; align-items: center; justify-content: space-between; height: 44px; padding: 0 14px; border-radius: 10px; background: ${T.panel}; border: 1px solid ${T.line}; font-size: 14px; color: ${T.ink};">
              <span style="display: flex; gap: 8px; align-items: center;"><span style="color: ${T.ink3}; font-size: 12.5px;">화자 구분</span><span style="font-weight: 500;">{{xSpeakersLabel}}</span></span>
              <span style="width: 34px; height: 20px; border-radius: 10px; background: {{xToggleBg}}; position: relative; flex: 0 0 auto;"><span style="position: absolute; top: 2px; left: {{xToggleKnob}}; width: 16px; height: 16px; border-radius: 50%; background: #FFFFFF; transition: left .15s;"></span></span>
            </div>
          </div>
          <div class="clk" onClick="{{generate}}" style="height: 52px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 16px; font-weight: 700; {{genStyle}}">{{genLabel}}</div>
          <div style="font-size: 11.5px; color: ${T.ink3}; text-align: center;">{{genHint}}</div>
        </div>
      </section>

      <!-- 우측 패널 -->
      <section style="flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; padding: 20px; border-radius: 16px; background: ${T.side}; border: 1px solid ${T.line};">
        <div style="display: flex; gap: 20px; border-bottom: 1px solid ${T.line}; margin-bottom: 16px;">
          <span class="clk" onClick="{{tabResults}}" style="padding: 0 2px 10px; font-size: 14px; {{tabResultsStyle}}">대본 결과 <span style="color: ${T.ink3}; font-weight: 500;">{{xJobCount}}</span></span>
          <span class="clk" onClick="{{tabSample}}" style="padding: 0 2px 10px; font-size: 14px; {{tabSampleStyle}}">예시</span>
        </div>

        <sc-if value="{{showSample}}" hint-placeholder-val="{{ true }}">
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="position: relative; height: 380px; border-radius: 14px; overflow: hidden; background: linear-gradient(160deg, {{sampleTone}} 0%, #0E1116 100%); display: flex; align-items: center; justify-content: center;">
              <div class="clk" onClick="{{togglePlay}}" style="width: 56px; height: 56px; border-radius: 50%; background: rgba(232,236,242,0.14); display: flex; align-items: center; justify-content: center; color: ${T.ink}; font-size: 18px;">{{playGlyph}}</div>
              <span style="position: absolute; left: 14px; top: 14px; font-size: 12px; color: ${T.ink2};">{{sampleLabel}}</span>
              <div class="clk" onClick="{{toggleMute}}" style="position: absolute; right: 14px; top: 14px; width: 32px; height: 32px; border-radius: 8px; background: rgba(14,17,22,0.6); display: flex; align-items: center; justify-content: center; color: ${T.ink};">${I.mute}</div>
              <div style="position: absolute; left: 16px; right: 16px; bottom: 22px; display: flex; justify-content: center; pointer-events: none;">
                <span style="max-width: 90%; text-align: center; background: rgba(0,0,0,0.72); color: #FFFFFF; padding: 7px 14px; border-radius: 8px; font-size: 15px; font-weight: 600; line-height: 1.45;">{{sampleCue}}</span>
              </div>
            </div>
            <div style="font-size: 12.5px; color: ${T.ink2}; line-height: 1.6;">이렇게 나옵니다 — 영상 위에 <b style="color: ${T.ink};">말한 문장이 자막으로 동기 표시</b>되고, 아래에 타임코드가 붙은 대본이 정리됩니다. 왼쪽에 영상을 올리고 「대본 생성」을 눌러보세요.</div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="clk" onClick="{{prevSample}}" style="display: flex; color: ${T.ink3};">${I.chevL}</span>
              <div style="flex: 1 1 auto; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px;">
                <sc-for list="{{samples}}" as="s" hint-placeholder-count="5">
                  <div class="clk" onClick="{{s.pick}}" style="position: relative; height: 96px; border-radius: 10px; overflow: hidden; background: linear-gradient(160deg, {{s.tone}} 0%, #0E1116 100%); display: flex; align-items: center; justify-content: center; {{s.ring}}">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background: rgba(232,236,242,0.14); display: flex; align-items: center; justify-content: center; color: ${T.ink};">${I.play}</div>
                    <span style="position: absolute; left: 10px; bottom: 8px; font-size: 10.5px; color: ${T.ink2};">{{s.label}}</span>
                  </div>
                </sc-for>
              </div>
              <span class="clk" onClick="{{nextSample}}" style="display: flex; color: ${T.ink3};">${I.chevR}</span>
            </div>
          </div>
        </sc-if>

        <sc-if value="{{showResults}}" hint-placeholder-val="{{ false }}">
          <div style="display: flex; flex-direction: column; gap: 14px; overflow-y: auto; max-height: 700px;">
            <sc-if value="{{xNoJobs}}" hint-placeholder-val="{{ false }}">
              <div style="height: 240px; border-radius: 14px; border: 1px dashed ${T.line2}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: ${T.ink3}; font-size: 13px;">아직 추출한 대본이 없어요<span style="font-size: 12px;">왼쪽에 영상을 올리고 「대본 생성」을 눌러보세요</span></div>
            </sc-if>
            <sc-for list="{{xJobs}}" as="j" hint-placeholder-count="1">
              <div style="border: 1px solid ${T.line}; border-radius: 14px; padding: 14px; background: ${T.panel}; display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; color: ${T.ink2};">
                  <span style="display: flex; gap: 10px; align-items: center;"><span style="font-weight: 600; color: ${T.ink};">{{j.file}}</span><span style="font-weight: 600; color: {{j.statusColor}};">{{j.statusText}}</span></span>
                  <span style="color: ${T.ink3};">{{j.meta}}</span>
                </div>
                <sc-if value="{{j.isDone}}" hint-placeholder-val="{{ false }}">
                  <div style="position: relative; height: 240px; border-radius: 14px; overflow: hidden; background: #05070A; display: flex; align-items: center; justify-content: center;">
                    <sc-if value="{{j.hasVideo}}" hint-placeholder-val="{{ false }}">
                      <video src="{{j.videoSrc}}" controls="{{ true }}" muted="{{ true }}" autoPlay="{{ true }}" loop="{{ true }}" playsInline="{{ true }}" onTimeUpdate="{{j.onTime}}" onError="{{j.onVideoError}}" style="width: 100%; height: 100%; object-fit: contain; display: block;"></video>
                    </sc-if>
                    <sc-if value="{{j.noVideo}}" hint-placeholder-val="{{ false }}">
                      <div style="position: absolute; inset: 0; background: linear-gradient(160deg, {{j.tone}} 0%, #0E1116 100%); display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 12px; color: ${T.ink3};">{{j.posterNote}}</span>
                      </div>
                    </sc-if>
                    <sc-if value="{{j.hasCue}}" hint-placeholder-val="{{ false }}">
                      <div style="position: absolute; left: 16px; right: 16px; bottom: 44px; display: flex; justify-content: center; pointer-events: none;">
                        <span style="max-width: 90%; text-align: center; background: rgba(0,0,0,0.72); color: #FFFFFF; padding: 7px 14px; border-radius: 8px; font-size: 15px; font-weight: 600; line-height: 1.45; text-shadow: 0 1px 2px rgba(0,0,0,0.6); display: flex; flex-direction: column; gap: 2px;"><span>{{j.cue}}</span><sc-if value="{{j.hasCueTr}}" hint-placeholder-val="{{ false }}"><span style="font-size: 12.5px; font-weight: 500; color: rgba(255,255,255,0.8);">{{j.cueTr}}</span></sc-if></span>
                      </div>
                    </sc-if>
                  </div>
                  <div style="border-radius: 12px; background: ${T.panel2}; border: 1px solid ${T.line}; padding: 10px 14px 12px; max-height: 170px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 2px 8px 6px;"><span style="font-size: 11px; color: {{accent}}; font-weight: 600; letter-spacing: 0.02em;">목업 예시 — 영상 소리를 듣고 만든 대본이 아닙니다 (고정 문장). 실제 대본은 Whisper API 연결 후 나옵니다</span><span style="font-size: 11px; color: ${T.ink3}; white-space: nowrap;">{{j.cueHint}}</span></div>
                    <sc-for list="{{j.cues}}" as="q" hint-placeholder-count="3">
                      <div class="clk" onClick="{{q.seek}}" style="display: grid; grid-template-columns: {{q.cols}}; gap: 10px; padding: 5px 8px; border-radius: 6px; font-size: 13px; line-height: 1.6; {{q.style}}">
                        <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; color: ${T.ink3}; padding-top: 2px; font-variant-numeric: tabular-nums;">{{q.time}}</span>
                        <sc-if value="{{q.hasSpk}}" hint-placeholder-val="{{ false }}"><span style="font-size: 11.5px; color: ${T.blue}; font-weight: 600; padding-top: 2px;">{{q.spk}}</span></sc-if>
                        <span style="display: flex; flex-direction: column; gap: 1px;"><span>{{q.line}}</span><sc-if value="{{q.hasTr}}" hint-placeholder-val="{{ false }}"><span style="font-size: 12px; opacity: 0.85;">{{q.tr}}</span></sc-if></span>
                      </div>
                    </sc-for>
                  </div>
                </sc-if>
                <sc-if value="{{j.isRunning}}" hint-placeholder-val="{{ false }}">
                  <div style="height: 200px; border-radius: 14px; background: ${T.panel2}; border: 1px dashed ${T.line2}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;">
                    <div style="width: 60%; height: 6px; border-radius: 3px; background: ${T.panel3}; overflow: hidden;"><div style="width: {{j.progressPct}}; height: 100%; background: {{accent}}; transition: width .3s;"></div></div>
                    <span style="font-size: 12.5px; color: ${T.ink3};">{{j.stage}}</span>
                  </div>
                </sc-if>
                <sc-if value="{{j.isFailed}}" hint-placeholder-val="{{ false }}">
                  <div style="height: 120px; border-radius: 14px; background: ${T.panel2}; border: 1px solid #5A2A33; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;">
                    <span style="font-size: 13px; color: #F26D7D; font-weight: 600;">음성을 인식하지 못했어요</span>
                    <span style="font-size: 12px; color: ${T.ink3};">소리가 없거나 너무 작은 파일일 수 있어요</span>
                  </div>
                </sc-if>
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                  <div style="font-size: 12.5px; color: ${T.ink3}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;">{{j.noteLine}}</div>
                  <div style="display: flex; gap: 8px; flex: 0 0 auto;">
                    <sc-if value="{{j.isDone}}" hint-placeholder-val="{{ false }}"><span class="clk" onClick="{{j.copy}}" style="display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: 8px; background: ${T.panel3}; border: 1px solid ${T.line2}; font-size: 12.5px; color: ${T.ink}; white-space: nowrap;">${I.clip}복사 (글만)</span></sc-if>
                    <sc-if value="{{j.isDone}}" hint-placeholder-val="{{ false }}"><span class="clk" onClick="{{j.download}}" style="display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: 8px; background: ${T.panel3}; border: 1px solid ${T.line2}; font-size: 12.5px; color: ${T.ink}; white-space: nowrap;">${I.download}SRT 저장</span></sc-if>
                    <sc-if value="{{j.canRetry}}" hint-placeholder-val="{{ false }}"><span class="clk" onClick="{{j.retry}}" style="display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: 8px; background: ${T.panel3}; border: 1px solid ${T.line2}; font-size: 12.5px; color: ${T.ink}; white-space: nowrap;">${I.refresh}다시 추출</span></sc-if>
                  </div>
                </div>
              </div>
            </sc-for>
          </div>
        </sc-if>
      </section>
      </main>
    </sc-if>

    <sc-if value="{{viewSearch}}" hint-placeholder-val="{{ true }}">
      <!-- 검색 전: 가운데 검색창 -->
      <sc-if value="{{noJobs}}" hint-placeholder-val="{{ true }}">
      <main style="flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 24px 96px;">
        <div style="width: 880px; display: flex; flex-direction: column; gap: 22px; align-items: center;">
          <div style="display: flex; flex-direction: column; gap: 8px; align-items: center; text-align: center;">
            <h1 style="margin: 0; font-size: 30px; font-weight: 700; color: ${T.ink}; letter-spacing: -0.02em;">링크로 찾기</h1>
            <div style="font-size: 14.5px; color: ${T.ink2}; line-height: 1.6;">영상 링크를 붙여넣으면 <b style="color: ${T.ink};">타임코드가 붙은 대본</b>을 가져옵니다. 해외 영상은 <b style="color: ${T.ink};">한국어 번역</b>까지 같이 나와요.</div>
          </div>
          <div style="width: 100%; display: flex; flex-direction: column; gap: 12px;">
            ${searchBar(false)}
            ${optionsRow}
          </div>
          <div style="font-size: 12.5px; color: ${T.ink3};">파일 업로드 없이 링크만 · 한 번에 최대 5개 · 문장을 클릭하면 영상이 그 구간으로 이동</div>
        </div>
      </main>
      </sc-if>

      <!-- 결과가 있으면: 위 검색창 + 카드 목록 -->
      <sc-if value="{{hasJobs}}" hint-placeholder-val="{{ false }}">
      <main style="flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; align-items: center; padding: 24px; overflow-y: auto;">
        <div style="width: 880px; display: flex; flex-direction: column; gap: 14px;">
          <div style="display: flex; align-items: baseline; justify-content: space-between;"><h1 style="margin: 0; font-size: 22px; font-weight: 700; color: ${T.ink}; letter-spacing: -0.01em;">링크로 찾기</h1><span style="font-size: 12.5px; color: ${T.ink3};">가져온 대본 {{jobCount}}</span></div>
          ${searchBar(true)}
          ${optionsRow}
          <sc-for list="{{jobs}}" as="j" hint-placeholder-count="1">
            <div style="border: 1px solid ${T.line}; border-radius: 16px; padding: 14px 16px 16px; background: ${T.panel}; display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; color: ${T.ink2};">
                <span style="display: flex; gap: 10px; align-items: center;"><span style="font-weight: 600; color: ${T.ink};">{{j.label}}</span><span style="font-weight: 600; color: {{j.statusColor}};">{{j.statusText}}</span></span>
                <span style="color: ${T.ink3};">{{j.meta}}</span>
              </div>
              <sc-if value="{{j.isRunning}}" hint-placeholder-val="{{ false }}">
                <div style="height: 6px; border-radius: 3px; background: ${T.panel3}; overflow: hidden;"><div style="width: {{j.progressPct}}; height: 100%; background: {{accent}}; transition: width .3s;"></div></div>
                <div style="display: flex; gap: 22px; flex-wrap: wrap;">
                  <sc-for list="{{j.steps}}" as="st" hint-placeholder-count="4">
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: {{st.color}};"><span style="width: 8px; height: 8px; border-radius: 50%; background: {{st.dot}};"></span>{{st.label}}</div>
                  </sc-for>
                </div>
                <div style="font-size: 11.5px; color: ${T.ink3};">음성 인식은 OpenAI Whisper API, 번역은 gpt-4o-mini로 처리 예정 (목업에서는 샘플 문장)</div>
              </sc-if>
              <sc-if value="{{j.isFailed}}" hint-placeholder-val="{{ false }}">
                <div style="height: 100px; border-radius: 14px; background: ${T.panel2}; border: 1px solid #5A2A33; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;">
                  <span style="font-size: 13px; color: #F26D7D; font-weight: 600;">영상을 가져오지 못했어요</span>
                  <span style="font-size: 12px; color: ${T.ink3};">비공개 계정이거나 삭제된 링크일 수 있어요</span>
                </div>
              </sc-if>
              <sc-if value="{{j.isDone}}" hint-placeholder-val="{{ false }}">
                <div style="display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 14px;">
                  <div style="position: relative; height: 444px; border-radius: 14px; overflow: hidden; background: linear-gradient(160deg, {{j.tone}} 0%, #0E1116 100%); display: flex; align-items: center; justify-content: center;">
                    <span style="position: absolute; left: 12px; top: 12px; font-size: 11px; color: ${T.ink3};">미리보기 없음 — 자막만 순서대로 재생</span>
                    <sc-if value="{{j.hasCue}}" hint-placeholder-val="{{ false }}">
                      <div style="position: absolute; left: 12px; right: 12px; bottom: 48px; display: flex; justify-content: center; pointer-events: none;">
                        <span style="text-align: center; background: rgba(0,0,0,0.72); color: #FFFFFF; padding: 7px 12px; border-radius: 8px; font-size: 13.5px; font-weight: 600; line-height: 1.45; display: flex; flex-direction: column; gap: 2px;"><span>{{j.cue}}</span><sc-if value="{{j.hasCueTr}}" hint-placeholder-val="{{ false }}"><span style="font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.8);">{{j.cueTr}}</span></sc-if></span>
                      </div>
                    </sc-if>
                    <div style="position: absolute; left: 0; right: 0; bottom: 0; height: 34px; background: rgba(0,0,0,0.5); display: flex; align-items: center; gap: 10px; padding: 0 12px; font-size: 11px; color: ${T.ink2};">${I.play}<span style="flex: 1 1 auto; height: 3px; background: rgba(255,255,255,0.2); border-radius: 2px; overflow: hidden;"><span style="display: block; width: {{j.playPct}}; height: 100%; background: #FFFFFF;"></span></span><span style="font-variant-numeric: tabular-nums;">{{j.clock}}</span></div>
                  </div>
                  <div style="border-radius: 12px; background: ${T.panel2}; border: 1px solid ${T.line}; padding: 8px 12px 10px; display: flex; flex-direction: column; gap: 1px; min-width: 0; max-height: 444px; overflow-y: auto;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 2px 6px 6px;"><span style="font-size: 11px; color: {{accent}}; font-weight: 600;">목업 예시 — 고정 문장 (실제 대본은 Whisper API 연결 후)</span><span style="font-size: 11px; color: ${T.ink3}; white-space: nowrap;">문장 클릭 = 그 구간으로</span></div>
                    <sc-for list="{{j.cues}}" as="q" hint-placeholder-count="3">
                      <div class="clk" onClick="{{q.seek}}" style="display: grid; grid-template-columns: {{q.cols}}; gap: 10px; padding: 5px 6px; border-radius: 6px; font-size: 13px; line-height: 1.45; {{q.style}}">
                        <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; color: ${T.ink3}; padding-top: 2px; font-variant-numeric: tabular-nums;">{{q.time}}</span>
                        <sc-if value="{{q.hasSpk}}" hint-placeholder-val="{{ false }}"><span style="font-size: 11.5px; color: ${T.blue}; font-weight: 600; padding-top: 2px;">{{q.spk}}</span></sc-if>
                        <span style="display: flex; flex-direction: column; gap: 1px;"><span>{{q.line}}</span><sc-if value="{{q.hasTr}}" hint-placeholder-val="{{ false }}"><span style="font-size: 12px; opacity: 0.85;">{{q.tr}}</span></sc-if></span>
                      </div>
                    </sc-for>
                  </div>
                </div>
              </sc-if>
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                <div style="font-size: 12.5px; color: ${T.ink3}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;">{{j.hint}}</div>
                <div style="display: flex; gap: 8px; flex: 0 0 auto;">
                  <sc-if value="{{j.isDone}}" hint-placeholder-val="{{ false }}"><span class="clk" onClick="{{j.copy}}" style="display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: 8px; background: ${T.panel3}; border: 1px solid ${T.line2}; font-size: 12.5px; color: ${T.ink}; white-space: nowrap;">${I.clip}복사 (글만)</span></sc-if>
                  <sc-if value="{{j.isDone}}" hint-placeholder-val="{{ false }}"><span class="clk" onClick="{{j.download}}" style="display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: 8px; background: ${T.panel3}; border: 1px solid ${T.line2}; font-size: 12.5px; color: ${T.ink}; white-space: nowrap;">${I.download}SRT 저장</span></sc-if>
                  <sc-if value="{{j.isDone}}" hint-placeholder-val="{{ false }}"><span class="clk" onClick="{{j.toConvert}}" style="display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: 8px; background: ${T.panel3}; border: 1px solid ${T.line2}; font-size: 12.5px; color: ${T.ink}; white-space: nowrap;">${I.convert}변환으로 보내기</span></sc-if>
                  <sc-if value="{{j.canRetry}}" hint-placeholder-val="{{ false }}"><span class="clk" onClick="{{j.retry}}" style="display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: 8px; background: ${T.panel3}; border: 1px solid ${T.line2}; font-size: 12.5px; color: ${T.ink}; white-space: nowrap;">${I.refresh}다시 가져오기</span></sc-if>
                  <span class="clk" onClick="{{j.remove}}" style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 8px; background: ${T.panel3}; border: 1px solid ${T.line2}; color: ${T.ink3};">${I.x}</span>
                </div>
              </div>
            </div>
          </sc-for>
        </div>
      </main>
      </sc-if>
    </sc-if>
  </div>

  <div class="clk" onClick="{{chat}}" style="position: absolute; right: 28px; bottom: 28px; width: 52px; height: 52px; border-radius: 50%; background: {{accent}}; color: #0E1116; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(0,0,0,0.35);">${I.chat}</div>

  <!-- 토스트 -->
  <sc-if value="{{toastOpen}}" hint-placeholder-val="{{ false }}">
    <div style="position: absolute; left: 50%; bottom: 32px; transform: translateX(-50%); padding: 10px 16px; border-radius: 10px; background: ${T.panel3}; border: 1px solid {{toastBorder}}; color: ${T.ink}; font-size: 13px; box-shadow: 0 12px 32px rgba(0,0,0,0.45); z-index: 9; white-space: nowrap;">{{toastText}}</div>
  </sc-if>
</div>
</x-dc>
<script data-dc-script data-props='{"accent":{"editor":"color","default":"#E9B25B","options":["#E9B25B","#5EE0B8","#7FA7FF","#F26D7D"],"section":"브랜드"},"$preview":{"width":1440,"height":900}}'>
var T_PANEL3 = "${T.panel3}", T_LINE = "${T.line}", T_LINE2 = "${T.line2}", T_INK = "${T.ink}", T_INK2 = "${T.ink2}", T_INK3 = "${T.ink3}", T_PANEL2 = "${T.panel2}", OK = "${OK}";
var LANGS = [
  { id: "auto", name: "자동 감지", desc: "음성에서 언어를 알아냅니다 (기본)" },
  { id: "ko", name: "한국어", desc: "한국어 릴스·쇼츠" },
  { id: "en", name: "English", desc: "영어 콘텐츠" },
  { id: "ja", name: "日本語", desc: "일본어 콘텐츠" }
];
var STAGES = ["영상 내려받기", "음성 인식", "문장 나누기 · 타임코드", "한국어 번역"];
var SAMPLES = [
  { label: "요리 릴스", tone: "#3A3324", cue: "자, 이 장면 잘 보세요. 여기서 딱 3초만 멈춰볼게요." },
  { label: "운동 루틴", tone: "#22303C", cue: "첫 번째, 첫 문장에서 결론을 먼저 말하기." },
  { label: "인터뷰 클립", tone: "#2B2F3F", cue: "처음엔 아무도 안 믿었어요. 근데 결과가 나왔죠." },
  { label: "제품 리뷰", tone: "#3A2630", cue: "이 가격에 이 성능이면 솔직히 말이 안 돼요." },
  { label: "브이로그", tone: "#26343A", cue: "더 궁금하면 저장하고 다음 편에서 만나요." }
];
var LIBRARY = [
  { name: "reel_cooking.mp4", kind: "video", dur: 23, tone: "#3A3324" },
  { name: "reel_workout.mp4", kind: "video", dur: 41, tone: "#22303C" },
  { name: "interview_cut.mov", kind: "video", dur: 58, tone: "#2B2F3F" },
  { name: "voice_memo.m4a", kind: "audio", dur: 19, tone: "#26343A" }
];
var KIND_LABEL = { video: "VID", audio: "AUD" };
var TONES = ["#22303C", "#3A3324", "#2B2F3F", "#3A2630", "#26343A"];
var POOL_KO = [
  "자, 이 장면 잘 보세요.", "여기서 딱 3초만 멈춰볼게요.", "이게 핵심인데요, 처음엔 아무도 안 믿었어요.",
  "비결은 생각보다 단순합니다.", "첫 번째, 화면 전환은 두 컷 이상 넘기지 않기.", "두 번째, 첫 문장에서 결론을 먼저 말하기.",
  "실제로 이렇게 바꿨더니 반응이 완전히 달라졌어요.", "여러분도 오늘 한 번만 시도해보세요.", "더 궁금하면 저장하고 다음 편에서 만나요.",
  "근데 여기서 대부분이 실수하는 게 있어요.", "이 부분은 자막으로 한 번 더 강조할게요.", "마지막으로, 이건 꼭 기억하세요."
];
var POOL_EN = [
  ["Can you build a good app with zero money?", "돈 한 푼 없이도 좋은 앱을 만들 수 있을까요?"],
  ["Everyone told me I needed a developer first.", "다들 개발자부터 구해야 한다고 했어요."],
  ["I had no budget, no team, just an idea.", "예산도 팀도 없이 아이디어 하나뿐이었죠."],
  ["So I opened Claude Cowork and typed one sentence.", "그래서 클로드 코워크를 열고 한 문장을 입력했어요."],
  ["Describe the app like you're texting a friend.", "친구한테 문자 보내듯 앱을 설명하세요."],
  ["Twenty minutes later it was running on my phone.", "20분 뒤엔 제 폰에서 돌아가고 있었어요."],
  ["Here's the part nobody shows you.", "아무도 안 보여주는 부분이 여기예요."],
  ["The first version was ugly and broken.", "첫 버전은 못생기고 자꾸 멈췄어요."],
  ["I fixed it by asking one question at a time.", "한 번에 질문 하나씩 던지면서 고쳤어요."],
  ["Not 'make it better' — 'why does this button do nothing?'", "'더 좋게'가 아니라 '이 버튼은 왜 안 눌려?'처럼요."],
  ["Three days in, a friend actually used it.", "사흘째엔 친구가 진짜로 써봤어요."],
  ["That's the whole trick: ship, then ask.", "비결은 이게 전부예요. 먼저 내놓고, 그다음 물어보기."],
  ["You don't need money, you need a clear sentence.", "돈이 아니라 또렷한 문장 하나가 필요해요."],
  ["Save this if you've been waiting for a developer.", "개발자 기다리는 중이었다면 저장해두세요."],
  ["Tomorrow, open it and type your idea.", "내일 열어서 아이디어를 입력해보세요."],
  ["I'll show what happened next in part two.", "다음 편에서 그 뒤 이야기를 보여드릴게요."]
];

function parseLink(u) {
  var m = u.match(/^(?:https?:\\/\\/)?(?:www\\.|m\\.)?([^\\/?#]+)([^?#]*)/i);
  if (!m) return null;
  var host = m[1].toLowerCase(), path = m[2] || "";
  var platform = /instagram/.test(host) ? "Instagram Reel" : /youtu/.test(host) ? "YouTube Shorts" : /tiktok/.test(host) ? "TikTok" : null;
  if (!platform) return null;
  var idm = path.match(/\\/(?:reel|reels|p|shorts|video)\\/([A-Za-z0-9_-]+)/) || path.match(/\\/([A-Za-z0-9_-]{6,})\\/?$/);
  var id = idm ? idm[1].slice(0, 11) : "";
  var label = host.replace(/^www\\./, "") + (id ? "/" + (platform === "Instagram Reel" ? "reel/" : platform === "YouTube Shorts" ? "shorts/" : "video/") + id : path);
  return { platform: platform, label: label, key: host + "|" + (id || path), ko: /\\.kr\\b|\\/ko\\//.test(u) };
}

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = {
      url: "", langId: "auto", speakers: false, translate: true, langOpen: false, view: "search", jobs: [], toast: null, seq: 1, cueIdx: {},
      // 레퍼런스 대본 확보 (파일 업로드)
      chips: [], note: "", mentionOpen: false, dragging: false, videoErr: {}, xLangId: "auto", xSpeakers: false, xLangOpen: false,
      tab: "sample", sampleIdx: 0, playing: false, muted: true
    };
    this._timers = {};
  }
  componentDidMount() { var self = this; this._timers.sample = setInterval(function () { if (self.state.playing) self.setState({ sampleIdx: (self.state.sampleIdx + 1) % SAMPLES.length }); }, 2600); }
  closeAll(extra) { this.setState(Object.assign({ langOpen: false, xLangOpen: false, mentionOpen: false }, extra || {})); }
  componentWillUnmount() { var self = this; clearTimeout(this._toastT); Object.keys(this._timers).forEach(function (k) { clearInterval(self._timers[k]); }); }
  toast(text, kind) {
    var self = this;
    clearTimeout(this._toastT);
    this.setState({ toast: { text: text, kind: kind || "info" } });
    this._toastT = setTimeout(function () { self.setState({ toast: null }); }, 2800);
  }

  // ---------- 레퍼런스 대본 확보: 파일 ----------
  addFile(f) {
    var chips = this.state.chips;
    if (chips.length >= 5) { this.toast("한 번에 최대 5개까지 올릴 수 있어요", "error"); return false; }
    if (chips.some(function (c) { return c.name === f.name; })) { this.toast("이미 추가된 파일이에요", "error"); return false; }
    if (f.size && f.size > 25 * 1024 * 1024) { this.toast(f.name + ": 25MB를 넘어요 — 잘라서 올려주세요", "error"); return false; }
    this.setState({ chips: chips.concat([f]) });
    this.toast(f.name + (f.pending ? " 추가됨 · 길이 확인 중" : " 추가됨"));
    return true;
  }
  ingestFiles(fileList) {
    var self = this;
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    files.forEach(function (file) {
      var type = file.type || "";
      var kind = type.indexOf("video/") === 0 ? "video" : type.indexOf("audio/") === 0 ? "audio" : null;
      if (!kind) {
        var ext = (file.name.split(".").pop() || "").toLowerCase();
        if (/^(mp4|mov|webm|m4v|mkv)$/.test(ext)) kind = "video";
        else if (/^(mp3|m4a|wav|aac|ogg)$/.test(ext)) kind = "audio";
      }
      if (!kind) return self.toast(file.name + ": 동영상 또는 오디오 파일만 올릴 수 있어요", "error");
      self.measureDuration(file, kind);
    });
  }
  measureDuration(file, kind) {
    var self = this;
    var url = "";
    try { url = URL.createObjectURL(file); } catch (e) { url = ""; }
    var added = this.addFile({ name: file.name, kind: kind, dur: 0, size: file.size, real: true, pending: true, src: url, fileRef: file });
    if (!added) return;
    var done = false;
    var finish = function (dur, unknown) {
      if (done) return; done = true;
      self.setState({ chips: self.state.chips.map(function (c) { return c.name === file.name ? Object.assign({}, c, { dur: dur, pending: false, unknown: unknown }) : c; }) });
      if (unknown) self.toast(file.name + ": 길이를 읽지 못했어요 — 대본은 추출할 수 있어요", "error");
    };
    if (!url) return finish(0, true);
    var el = document.createElement(kind === "video" ? "video" : "audio");
    el.preload = "metadata";
    el.onloadedmetadata = function () { finish(Math.round((el.duration || 0) * 10) / 10, !isFinite(el.duration)); };
    el.onerror = function () { finish(0, true); };
    setTimeout(function () { finish(0, true); }, 2500);
    el.src = url;
  }
  removeChip(name) { this.setState({ chips: this.state.chips.filter(function (c) { return c.name !== name; }) }); }
  insertMention(name) {
    var p = this.state.note;
    var sep = p.length && !/\\s$/.test(p) ? " " : "";
    this.setState({ note: (p + sep + "@" + name + " ").slice(0, 1000), mentionOpen: false });
  }

  mediaChips() { return this.state.chips.filter(function (c) { return c.kind === "video" || c.kind === "audio"; }); }
  generate() {
    var media = this.mediaChips();
    if (!media.length) return this.toast("대본을 뽑을 동영상 또는 오디오 파일을 먼저 올려주세요", "error");
    var self = this, seq = this.state.seq, newJobs = [];
    media.forEach(function (c, i) {
      newJobs.push({
        id: "job_" + (1000 + seq + i).toString(16), kind: "file", status: "running", progress: 3, url: "",
        file: c.name, label: c.name, dur: c.dur || 20, videoSrc: c.kind === "video" && c.src ? c.src : "", isAudio: c.kind === "audio", fileRef: c.fileRef || null, triedDataUrl: false,
        lang: self.state.xLangId, speakers: self.state.xSpeakers, translate: true, note: self.state.note.trim(),
        tone: SAMPLES[(seq + i) % SAMPLES.length].tone
      });
    });
    this.closeAll({ jobs: newJobs.concat(this.state.jobs), seq: seq + media.length, tab: "results" });
    newJobs.forEach(function (j) { self.startJob(j); });
  }

  // ---------- 링크 → 작업 ----------
  fetchUrl() {
    var u = (this.state.url || "").trim();
    if (!u) return this.toast("영상 링크를 먼저 붙여넣어 주세요", "error");
    var info = parseLink(u);
    if (!info) return this.toast("인스타그램 · 유튜브 · 틱톡 링크만 지원해요 — https://로 시작하는 주소를 넣어주세요", "error");
    if (this.state.jobs.filter(function (j) { return j.kind === "link"; }).length >= 5) return this.toast("한 번에 최대 5개까지 가져올 수 있어요", "error");
    if (this.state.jobs.some(function (j) { return j.key === info.key; })) return this.toast("이미 가져온 링크예요", "error");
    var seq = this.state.seq;
    var job = { id: "job_" + (1000 + seq).toString(16), kind: "link", key: info.key, label: info.label, platform: info.platform, url: u, status: "running", progress: 3,
      dur: info.platform === "YouTube Shorts" ? 58 : 82, lang: this.state.langId, speakers: this.state.speakers, translate: this.state.translate, isKo: info.ko, tone: TONES[seq % TONES.length] };
    this.setState({ jobs: [job].concat(this.state.jobs), seq: seq + 1, url: "", langOpen: false });
    this.startJob(job);
  }
  makeTranscript(job) {
    var en = job.kind === "file" ? job.lang === "en" : (job.lang === "en" || job.lang === "ja" || (job.lang === "auto" && !job.isKo));
    var pool = en ? POOL_EN : POOL_KO;
    var n = Math.max(3, Math.min(pool.length, Math.round(job.dur / (en ? 5.1 : 2.4))));
    var seg = job.dur / n, cues = [];
    for (var i = 0; i < n; i++) {
      var item = pool[i % pool.length];
      cues.push({ s: Math.round(i * seg * 10) / 10, e: Math.round((i + 1) * seg * 10) / 10, line: en ? item[0] : item, tr: en && job.translate ? item[1] : "", spk: job.speakers ? "화자 " + ((i % 2) + 1) : "" });
    }
    return cues;
  }
  startJob(job) {
    var self = this, id = job.id;
    this._timers[id] = setInterval(function () {
      var jobs = self.state.jobs.map(function (j) {
        if (j.id !== id || j.status !== "running") return j;
        return Object.assign({}, j, { progress: Math.min(100, j.progress + 5 + Math.round(Math.random() * 7)) });
      });
      var cur = jobs.find(function (j) { return j.id === id; });
      if (!cur) { clearInterval(self._timers[id]); delete self._timers[id]; return; }
      if (cur.progress >= 100) {
        clearInterval(self._timers[id]); delete self._timers[id];
        var fail = cur.kind === "file" ? /실패|silent/i.test(cur.file || "") : /private|deleted|fail/i.test(cur.url || "");
        var cues = fail ? [] : self.makeTranscript(cur);
        jobs = jobs.map(function (j) { return j.id === id ? Object.assign({}, j, { status: fail ? "failed" : "done", progress: 100, cues: cues }) : j; });
        self.setState({ jobs: jobs });
        self.toast(fail ? cur.label + (cur.kind === "file" ? ": 음성을 인식하지 못했어요" : ": 가져오지 못했어요") : cur.label + " 대본 완료", fail ? "error" : "ok");
        if (!fail && !cur.videoSrc) self.startFakePlayhead(id, cur.dur);
      } else {
        self.setState({ jobs: jobs });
      }
    }, 420);
  }
  startFakePlayhead(id, dur) {
    var self = this, t = 0;
    if (this._timers["cue_" + id]) return;
    this._timers["cue_" + id] = setInterval(function () { t = (t + 0.25) % dur; self.setCueTime(id, t); }, 250);
  }
  setCueTime(id, t) {
    var job = this.state.jobs.find(function (j) { return j.id === id; });
    if (!job || !job.cues) return;
    var idx = -1;
    for (var i = 0; i < job.cues.length; i++) { if (t >= job.cues[i].s && t < job.cues[i].e) { idx = i; break; } }
    var cur = this.state.cueIdx || {};
    if (cur[id] === idx && cur[id + "_t"] === t) return;
    var next = Object.assign({}, cur); next[id] = idx; next[id + "_t"] = t;
    this.setState({ cueIdx: next });
  }
  retry(j) {
    var job = Object.assign({}, j, { id: "job_" + (1000 + this.state.seq).toString(16), status: "running", progress: 3, cues: null });
    this.setState({ jobs: this.state.jobs.map(function (x) { return x.id === j.id ? job : x; }), seq: this.state.seq + 1 });
    this.startJob(job);
  }
  remove(id) {
    if (this._timers[id]) { clearInterval(this._timers[id]); delete this._timers[id]; }
    if (this._timers["cue_" + id]) { clearInterval(this._timers["cue_" + id]); delete this._timers["cue_" + id]; }
    this.setState({ jobs: this.state.jobs.filter(function (j) { return j.id !== id; }) });
  }

  renderVals() {
    var self = this, s = this.state, accent = this.props.accent ?? "#E9B25B";
    var fmt = function (x) { var m = Math.floor(x / 60), sec = x - m * 60; return m + ":" + (sec < 10 ? "0" : "") + sec.toFixed(1); };
    var clock = function (x) { var m = Math.floor(x / 60), sec = Math.floor(x - m * 60); return m + ":" + (sec < 10 ? "0" : "") + sec; };
    var info = parseLink((s.url || "").trim());
    var lang = LANGS.find(function (m) { return m.id === s.langId; }) || LANGS[0];
    var langs = LANGS.map(function (m) {
      return { name: m.name, desc: m.desc, style: s.langId === m.id ? "background: " + T_PANEL3 + ";" : "", pick: function () { self.setState({ langId: m.id, langOpen: false }); } };
    });
    var linkJobs = s.jobs.filter(function (j) { return j.kind === "link"; });
    var jobs = linkJobs.map(function (j) {
      var cueIdx = (s.cueIdx || {})[j.id]; if (cueIdx === undefined) cueIdx = -1;
      var t = (s.cueIdx || {})[j.id + "_t"] || 0;
      var cueObj = j.cues && cueIdx >= 0 ? j.cues[cueIdx] : null;
      var hasTr = !!(j.cues && j.cues.length && j.cues[0].tr);
      var isEn = !!(j.cues && j.cues.length && /[A-Za-z]/.test(j.cues[0].line));
      var color = j.status === "running" ? accent : (j.status === "done" ? OK : "#F26D7D");
      var text = j.status === "running" ? "가져오는 중 " + j.progress + "%" : (j.status === "done" ? "완료" : "실패");
      var stageIdx = j.progress < 20 ? 0 : (j.progress < 65 ? 1 : (j.progress < 88 ? 2 : 3));
      var steps = STAGES.map(function (label, i) {
        var st = i < stageIdx ? "done" : (i === stageIdx ? "now" : "");
        if (i === 3 && !j.translate) return { label: label + " (끔)", color: T_INK3, dot: T_LINE2 };
        return { label: label, color: st === "done" ? OK : (st === "now" ? T_INK : T_INK3), dot: st === "done" ? OK : (st === "now" ? accent : T_LINE2) };
      });
      var lines = (j.cues || []).map(function (q) { return (q.spk ? q.spk + ": " : "") + q.line + (q.tr ? "\\n" + q.tr : ""); });
      return {
        id: j.id, label: j.label, statusColor: color, statusText: text, progressPct: j.progress + "%", steps: steps,
        meta: j.dur + "s" + (j.cues ? " · " + j.cues.length + "문장" : "") + " · " + (j.status === "done" ? (isEn ? "English" : "한국어") + (hasTr ? " → 한국어 번역" : "") : (j.translate ? "번역 켬" : "번역 끔")) + (j.speakers ? " · 화자 구분" : ""),
        isDone: j.status === "done", isRunning: j.status === "running", isFailed: j.status === "failed", canRetry: j.status !== "running",
        tone: j.tone, hasCue: !!cueObj, cue: cueObj ? (cueObj.spk ? cueObj.spk + " · " : "") + cueObj.line : "", hasCueTr: !!(cueObj && cueObj.tr), cueTr: cueObj && cueObj.tr ? cueObj.tr : "",
        playPct: Math.round((t / j.dur) * 100) + "%", clock: clock(t) + " / " + clock(j.dur),
        hint: j.status === "done" ? "이 대본으로 바로 「레퍼런스 대본 변환」에 넘길 수 있어요" : (j.status === "running" ? j.platform + " · " + j.url : "링크를 확인하고 다시 가져와 보세요"),
        cues: (j.cues || []).map(function (q, qi) {
          return { time: fmt(q.s), line: q.line, tr: q.tr || "", hasTr: !!q.tr, spk: q.spk, hasSpk: !!q.spk, cols: q.spk ? "52px 44px 1fr" : "52px 1fr",
            style: qi === cueIdx ? "background: " + T_PANEL3 + "; color: " + T_INK + ";" : "color: " + T_INK3 + ";",
            seek: function () { self.setCueTime(j.id, q.s); } };
        }),
        copy: function () {
          var txt = lines.join("\\n"), ok = function () { self.toast("대본을 복사했어요", "ok"); }, fail = function () { self.toast("복사가 막혔어요 — 텍스트를 드래그해서 복사해 주세요", "error"); };
          try { navigator.clipboard.writeText(txt).then(ok, fail); } catch (e) { fail(); }
        },
        download: function () { self.toast("목업: SRT 파일 저장은 구현 단계에서 연결됩니다"); },
        toConvert: function () { self.setState({ view: "convert", langOpen: false }); self.toast(j.label + " 대본을 변환 화면의 원본으로 넣었어요 (목업)"); },
        retry: function () { self.retry(j); },
        remove: function () { self.remove(j.id); }
      };
    });
    // ---- 레퍼런스 대본 확보 ----
    var media = this.mediaChips(), can = media.length > 0;
    var xRunning = s.jobs.find(function (j) { return j.kind === "file" && j.status === "running"; });
    var chips = s.chips.map(function (c) {
      return { name: c.name, kindLabel: KIND_LABEL[c.kind], meta: c.pending ? "측정 중…" : (c.unknown ? "길이 ?" : (c.dur ? c.dur + "s" : "")),
        remove: function () { self.removeChip(c.name); }, mention: function () { self.insertMention(c.name); } };
    });
    var xLangs = LANGS.map(function (m) {
      return { name: m.name, desc: m.desc, style: s.xLangId === m.id ? "background: " + T_PANEL3 + ";" : "", pick: function () { self.setState({ xLangId: m.id, xLangOpen: false }); } };
    });
    var xLang = LANGS.find(function (m) { return m.id === s.xLangId; }) || LANGS[0];
    var samples = SAMPLES.map(function (sm, i) {
      return { label: sm.label, tone: sm.tone, ring: i === s.sampleIdx ? "outline: 2px solid " + accent + "; outline-offset: 2px;" : "", pick: function () { self.setState({ sampleIdx: i }); } };
    });
    var cur = SAMPLES[s.sampleIdx];
    var xJobs = s.jobs.filter(function (j) { return j.kind === "file"; }).map(function (j) {
      var cueIdx = (s.cueIdx || {})[j.id]; if (cueIdx === undefined) cueIdx = -1;
      var cueObj = j.cues && cueIdx >= 0 ? j.cues[cueIdx] : null;
      var cueText = cueObj ? (cueObj.spk ? cueObj.spk + " · " : "") + cueObj.line : "";
      var cueTr = cueObj && cueObj.tr ? cueObj.tr : "";
      var hasTr = !!(j.cues && j.cues.length && j.cues[0].tr);
      var color = j.status === "running" ? accent : (j.status === "done" ? "#6CCB9A" : "#F26D7D");
      var text = j.status === "running" ? "추출 중 " + j.progress + "%" : (j.status === "done" ? "완료" : "실패");
      var stage = j.progress < 25 ? "오디오 분리 중" : (j.progress < 65 ? "음성 인식 중 (" + (LANGS.find(function (m) { return m.id === j.lang; }) || LANGS[0]).name + ")" : (j.progress < 90 ? "문장 나누기 · 타임코드 정렬" : "다듬기 지시 적용 중"));
      var videoErr = !!(s.videoErr || {})[j.id];
      var lines = (j.cues || []).map(function (q) { return (q.spk ? q.spk + ": " : "") + q.line; });
      return {
        id: j.id, file: j.file, statusColor: color, statusText: text, progressPct: j.progress + "%", stage: stage,
        meta: (j.dur ? j.dur + "s · " : "") + (hasTr ? "English → 한국어 번역" : (LANGS.find(function (m) { return m.id === j.lang; }) || LANGS[0]).name) + (j.speakers ? " · 화자 구분" : "") + (j.fromUrl ? " · 링크" : ""),
        cueHint: hasTr ? "문장 클릭 = 그 구간으로 · 원문 + 번역 함께" : "문장 클릭 = 그 구간으로",
        isDone: j.status === "done", isRunning: j.status === "running", isFailed: j.status === "failed", canRetry: j.status !== "running",
        hasVideo: !!j.videoSrc && !videoErr, noVideo: !j.videoSrc || videoErr, tone: j.tone,
        posterNote: videoErr ? "영상 재생이 막혀 포스터로 대체 (자막은 순서대로 재생)" : (j.isAudio ? "오디오 파일 — 자막만 순서대로 재생" : "미리보기 없음 — 자막만 순서대로 재생"),
        hasCue: !!cueText, cue: cueText, hasCueTr: !!cueTr, cueTr: cueTr,
        noteLine: j.note ? "다듬기: " + j.note : "",
        cues: (j.cues || []).map(function (q, qi) {
          return { time: fmt(q.s) + "–" + fmt(q.e), line: q.line, tr: q.tr || "", hasTr: !!q.tr, spk: q.spk, hasSpk: !!q.spk, cols: q.spk ? "92px 44px 1fr" : "92px 1fr",
            style: qi === cueIdx ? "background: " + T_PANEL3 + "; color: " + T_INK + ";" : "color: " + T_INK3 + ";",
            seek: function () { self.setCueTime(j.id, q.s); } };
        }),
        onTime: function (e) { var el = e.target; var total = el.duration && isFinite(el.duration) ? el.duration : (j.dur || 20); self.setCueTime(j.id, (el.currentTime / total) * (j.dur || 20)); },
        onVideoError: function () {
          // 1차: blob URL 재생 실패 → data URL로 한 번 더 시도, 2차 실패 → 포스터
          if (j.fileRef && !j.triedDataUrl && typeof FileReader !== "undefined") {
            var r = new FileReader();
            r.onload = function () { self.setState({ jobs: self.state.jobs.map(function (x) { return x.id === j.id ? Object.assign({}, x, { videoSrc: r.result, triedDataUrl: true }) : x; }) }); };
            r.onerror = function () { var ve = Object.assign({}, self.state.videoErr || {}); ve[j.id] = true; self.setState({ videoErr: ve }); self.startFakePlayhead(j.id, j.dur || 20); };
            self.setState({ jobs: self.state.jobs.map(function (x) { return x.id === j.id ? Object.assign({}, x, { triedDataUrl: true }) : x; }) });
            r.readAsDataURL(j.fileRef);
            return;
          }
          var ve = Object.assign({}, s.videoErr || {}); ve[j.id] = true; self.setState({ videoErr: ve }); self.startFakePlayhead(j.id, j.dur || 20);
        },
        copy: function () {
          var txt = lines.join("\\n"), ok = function () { self.toast("대본을 복사했어요", "ok"); }, fail = function () { self.toast("복사가 막혔어요 — 텍스트를 드래그해서 복사해 주세요", "error"); };
          try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, fail); else fail(); } catch (e) { fail(); }
        },
        download: function () { self.toast("목업: SRT 파일 저장은 구현 단계에서 연결됩니다"); },
        retry: function () { self.retry(j); }
      };
    });
    var tabActive = "font-weight: 600; color: " + T_INK + "; border-bottom: 2px solid " + accent + ";";
    var tabIdle = "color: " + T_INK3 + ";";
    var xJobCount = s.jobs.filter(function (j) { return j.kind === "file"; }).length;
    var running = s.jobs.some(function (j) { return j.status === "running"; });
    var navOn = "background: " + T_PANEL2 + "; color: " + T_INK + "; font-weight: 600; box-shadow: inset 0 0 0 1px " + T_LINE2 + ";";
    var navOff = "color: " + T_INK2 + ";";
    var canFetch = !!info;
    return {
      accent: accent,
      viewSearch: s.view === "search", viewConvert: s.view === "convert", viewExtract: s.view === "extract",
      navExtractStyle: s.view === "extract" ? navOn : navOff, navExtractIcon: s.view === "extract" ? accent : T_INK3,
      goExtract: function () { self.closeAll({ view: "extract" }); },
      viewLinkVideos: s.view === "linkvideos",
      navLinkVideosStyle: s.view === "linkvideos" ? navOn : navOff, navLinkVideosIcon: s.view === "linkvideos" ? accent : T_INK3,
      goLinkVideos: function () { self.closeAll({ view: "linkvideos" }); },
      // ---- 레퍼런스 대본 확보 ----
      chips: chips, chipCount: s.chips.length, hasChips: s.chips.length > 0, noChips: s.chips.length === 0, zonePad: s.chips.length ? "16px" : "26px",
      zoneBorder: s.dragging ? accent : T_LINE2, zoneHint: s.dragging ? "여기에 놓으면 추가돼요" : "클릭하거나 파일을 끌어다 업로드",
      onDragOver: function (e) { e.preventDefault(); if (!s.dragging) self.setState({ dragging: true }); },
      onDrop: function (e) { e.preventDefault(); self.setState({ dragging: false }); self.ingestFiles(e.dataTransfer && e.dataTransfer.files); },
      onFiles: function (e) { self.ingestFiles(e.target.files); try { e.target.value = ""; } catch (err) {} },
      note: s.note, noteLen: s.note.length,
      onNote: function (e) { self.setState({ note: e.target.value.slice(0, 1000), mentionOpen: /@$/.test(e.target.value) ? true : s.mentionOpen }); },
      toggleMention: function () { self.closeAll({ mentionOpen: !s.mentionOpen }); }, mentionOpen: s.mentionOpen,
      xLangOpen: s.xLangOpen, xLangName: xLang.name, xLangs: xLangs, xLangBorder: s.xLangOpen ? accent : T_LINE,
      xToggleLang: function () { self.closeAll({ xLangOpen: !s.xLangOpen }); },
      xSpeakersLabel: s.xSpeakers ? "켜기" : "끄기", xToggleBg: s.xSpeakers ? accent : T_LINE2, xToggleKnob: s.xSpeakers ? "16px" : "2px",
      xToggleSpeakers: function () { self.setState({ xSpeakers: !s.xSpeakers }); },
      genStyle: can ? "background: " + accent + "; color: #0E1116;" : "background: " + T_PANEL2 + "; color: " + T_INK3 + "; cursor: not-allowed;",
      genLabel: xRunning ? "대본 추출 중… " + xRunning.progress + "%" : (can ? "대본 생성" + (media.length > 1 ? " (" + media.length + "개)" : "") : "대본 생성"),
      genHint: can ? "파일마다 대본 1개가 만들어져요 · 음성 인식은 OpenAI Whisper API로 처리 예정" : "동영상 또는 오디오를 올리면 버튼이 활성화돼요 · 링크는 「링크로 찾기」에서",
      generate: function () { self.generate(); },
      showSample: s.tab === "sample", showResults: s.tab === "results",
      tabResultsStyle: s.tab === "results" ? tabActive : tabIdle, tabSampleStyle: s.tab === "sample" ? tabActive : tabIdle,
      tabResults: function () { self.setState({ tab: "results" }); }, tabSample: function () { self.setState({ tab: "sample" }); },
      xJobs: xJobs, xJobCount: xJobCount, xNoJobs: xJobCount === 0,
      samples: samples, sampleTone: cur.tone, sampleLabel: cur.label + (s.playing ? " · 재생 중" : "") + (s.muted ? " · 음소거" : ""), sampleCue: cur.cue,
      playGlyph: s.playing ? "❚❚" : "▶",
      togglePlay: function () { self.setState({ playing: !s.playing }); }, toggleMute: function () { self.setState({ muted: !s.muted }); },
      prevSample: function () { self.setState({ sampleIdx: (s.sampleIdx + SAMPLES.length - 1) % SAMPLES.length }); },
      nextSample: function () { self.setState({ sampleIdx: (s.sampleIdx + 1) % SAMPLES.length }); },
      navSearchStyle: s.view === "search" ? navOn : navOff, navConvertStyle: s.view === "convert" ? navOn : navOff,
      navSearchIcon: s.view === "search" ? accent : T_INK3, navConvertIcon: s.view === "convert" ? accent : T_INK3,
      goSearch: function () { self.closeAll({ view: "search" }); }, goConvert: function () { self.closeAll({ view: "convert" }); },
      goSteps: function () { self.toast("「순서」 페이지는 실제 앱(localhost:3000/steps)에 있어요"); },
      url: s.url, barBorder: s.url ? accent : T_LINE2, barIcon: s.url ? accent : T_INK3,
      fetchStyle: canFetch ? "background: " + accent + "; color: #0E1116;" : "background: " + T_PANEL3 + "; color: " + T_INK3 + ";",
      onUrl: function (e) { self.setState({ url: e.target.value.slice(0, 500) }); },
      fetchUrl: function () { self.fetchUrl(); },
      hasPlatform: !!info, platform: info ? info.platform : "",
      langOpen: s.langOpen, langName: lang.name, langs: langs, langBorder: s.langOpen ? accent : T_LINE,
      toggleLang: function () { self.setState({ langOpen: !s.langOpen }); },
      speakersLabel: s.speakers ? "켜기" : "끄기", spkBg: s.speakers ? accent : T_LINE2, spkKnob: s.speakers ? "16px" : "2px",
      toggleSpeakers: function () { self.setState({ speakers: !s.speakers, langOpen: false }); },
      translateLabel: s.translate ? "켜기" : "끄기", trBg: s.translate ? accent : T_LINE2, trKnob: s.translate ? "16px" : "2px",
      toggleTranslate: function () { self.setState({ translate: !s.translate, langOpen: false }); },
      jobs: jobs, jobCount: linkJobs.length, noJobs: linkJobs.length === 0, hasJobs: linkJobs.length > 0,
      toastOpen: !!s.toast, toastText: s.toast ? s.toast.text : "", toastBorder: s.toast ? (s.toast.kind === "error" ? "#F26D7D" : (s.toast.kind === "ok" ? OK : T_LINE2)) : T_LINE2,
      bell: function () { self.toast(running ? "대본을 가져오는 중이에요" : "새 알림이 없어요"); }, lang: function () { self.toast("언어: 한국어 (목업)"); }, chat: function () { self.toast("지원 채팅은 구현 단계에서 연결됩니다"); }
    };
  }
}
</script>
</body>
</html>`;
}
