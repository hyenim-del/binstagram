// 레퍼런스 대본 변환 v4 — 새 대본을 A안·B안·C안(원본형 · 대화형 · 후킹형)으로 나란히, HOOK·BODY·CTA 구간마다 시간초 표시
// build-mockup.mjs 에서 page({ body: convertThree({ T, I }) }) 로 씀. 왼쪽 ①②③ 설정은 결과가 나오면 세로 레일로 접힌다.
export function convertThree({ T, I }) {
  const WARN = "#E9B25B", OK = "#6CCB9A", OK_BG = "#123424", CTA = T.blue, CTA_BG = T.blueSoft, HOOK_BG = "#2A2418";
  const mono = "font-family: 'IBM Plex Mono', monospace;";
  I = { ...I, edit: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M13.5 6.5l3 3"/></svg>` };

  // [시작, 끝, 문장, 경고?]
  const VARIANTS = [
    {
      key: "A", name: "원본형", desc: "레퍼런스의 흐름·문장 수·길이를 그대로 따라 씀", selected: false,
      hook: [[0, 3.0, "출근 전 커피, 3분 안에 끝내고 싶은 분 있죠?"], [3.0, 5.8, "저도 매일 편의점 갔는데, 이거 하나로 바뀌었어요."]],
      body: [[5.8, 8.6, "드립백은 맛이 없다는 말, 저도 믿었거든요."], [8.6, 11.5, "비결은 물 온도 하나예요."], [11.5, 14.4, "92도로 두 번에 나눠 부으면 끝.", "① 숫자 근거 없음"], [14.4, 17.3, "첫 30초는 그냥 기다리기, 이게 전부예요."], [17.3, 20.1, "이렇게 내리고 나서 사무실에서 다들 물어봤어요.", "③ 후기 근거 없음"]],
      cta: [[20.1, 23.0, "내일 아침에 바로 해보고 싶으면 저장해두세요."]],
    },
    {
      key: "B", name: "대화형", desc: "친구에게 말하듯 묻고 답하는 말투 · 구조는 같음", selected: false,
      hook: [[0, 2.8, "출근 전에 커피 내릴 시간, 솔직히 있으세요?"], [2.8, 5.6, "저도 없었어요. 그래서 맨날 편의점이었죠."]],
      body: [[5.6, 8.9, "근데 드립백이 맛없다는 건요, 반은 맞고 반은 틀려요."], [8.9, 11.6, "차이는 딱 하나, 물 온도예요."], [11.6, 14.5, "[숫자]도 물을 두 번에 나눠 부어보세요."], [14.5, 17.4, "처음 30초는 손대지 말고 기다리기만 하면 돼요."], [17.4, 20.2, "이거 하고부터 옆자리에서 무슨 커피냐고 물어봐요."]],
      cta: [[20.2, 23.0, "내일 아침 해볼 거면 지금 저장이요."]],
    },
    {
      key: "C", name: "후킹형", desc: "첫 문장을 결과 예고로 세게 · 타겟 명시 · CTA에 혜택", selected: true,
      hook: [[0, 2.6, "편의점 커피, 오늘로 끊게 해드릴게요."]],
      body: [[2.6, 5.4, "20대 직장인이면 아침에 3분도 아깝죠."], [5.4, 8.5, "드립백이 맛없는 이유는 커피가 아니라 물이에요."], [8.5, 11.3, "물 온도 하나만 바꾸면 완전히 달라져요."], [11.3, 14.6, "[숫자]도, 두 번 나눠 붓기, 첫 30초는 기다리기."], [14.6, 16.8, "이 세 가지가 전부예요."], [16.8, 19.5, "실제로 해본 [사람]이 다음 날 또 물어봤어요."]],
      cta: [[19.5, 23.0, "프로필 링크 첫 주문 20% — 내일 아침 전에 저장해두세요."]],
    },
  ];

  const tc = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
  const secColor = { HOOK: ["#E9B25B", HOOK_BG], BODY: [T.ink2, T.panel2], CTA: [CTA, CTA_BG] };
  const secLabel = { HOOK: "훅", BODY: "본문", CTA: "CTA" };

  const line = ([s, , text, flag]) => `
      <div style="display: grid; grid-template-columns: 40px 1fr; gap: 8px; padding: 4px 0; font-size: 13px; line-height: 1.5; ${flag ? `background: ${T.panel3}; border-radius: 6px; margin: 0 -6px; padding-left: 6px; padding-right: 6px;` : ""}">
        <span style="${mono} font-size: 11px; color: ${T.ink3}; padding-top: 3px; font-variant-numeric: tabular-nums;">${tc(s)}</span>
        <span style="display: flex; flex-direction: column; gap: 2px; min-width: 0;">
          <span style="color: ${T.ink};">${text}</span>
          ${flag ? `<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; color: ${WARN};">${I.warn}${flag}</span>` : ""}
        </span>
      </div>`;

  const section = (kind, lines) => {
    const [color, bg] = secColor[kind];
    const start = lines[0][0], end = lines[lines.length - 1][1];
    return `
    <div style="border: 1px solid ${T.line}; border-radius: 12px; background: ${bg}; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 2px;">
        <span style="display: flex; align-items: baseline; gap: 6px;"><span style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: ${color};">${kind}</span><span style="font-size: 11px; color: ${T.ink3};">${secLabel[kind]} · ${lines.length}문장</span></span>
        <span style="${mono} font-size: 11px; color: ${color}; font-variant-numeric: tabular-nums; white-space: nowrap;">${tc(start)} – ${tc(end)} <span style="color: ${T.ink3};">· ${(end - start).toFixed(1)}s</span></span>
      </div>
      ${lines.map(line).join("")}
    </div>`;
  };

  const btn = (icon, label, { solid = false } = {}) => `<span style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 8px; font-size: 12.5px; white-space: nowrap; ${
    solid ? `background: #E9B25B; color: #0E1116; font-weight: 600;` : `background: ${T.panel3}; border: 1px solid ${T.line2}; color: ${T.ink};`
  }">${icon}${label}</span>`;

  const column = (v) => {
    const all = [...v.hook, ...v.body, ...v.cta];
    const total = all[all.length - 1][1];
    const flags = all.filter((l) => l[3]).length;
    return `
  <article style="min-width: 0; display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 16px; background: ${T.panel}; border: 1px solid ${v.selected ? "#E9B25B" : T.line}; ${v.selected ? `box-shadow: 0 0 0 1px #E9B25B, 0 12px 32px rgba(0,0,0,0.35);` : ""}">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="display: inline-flex; align-items: center; height: 24px; padding: 0 9px; border-radius: 999px; border: 1px solid ${v.selected ? "#E9B25B" : T.line2}; ${mono} font-size: 11.5px; font-weight: 600; color: ${v.selected ? "#E9B25B" : T.ink2};">${v.key}안</span>
      ${v.selected ? `<span style="display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 9px; border-radius: 999px; background: ${T.blueSoft}; color: ${T.blue}; font-size: 11px; font-weight: 600;">${I.check}사용 중</span>` : ""}
      <span style="margin-left: auto; font-size: 11.5px; color: ${flags ? WARN : OK}; font-weight: 600; white-space: nowrap;">${flags ? `고칠 것 ${flags}` : "검증 통과"}</span>
    </div>
    <div>
      <div style="font-size: 20px; font-weight: 700; color: ${T.ink}; letter-spacing: -0.01em; line-height: 1.2;">${v.name}</div>
      <div style="font-size: 12px; color: ${T.ink2}; margin-top: 4px; line-height: 1.5;">${v.desc}</div>
      <div style="font-size: 11.5px; color: ${T.ink3}; margin-top: 4px; font-variant-numeric: tabular-nums;">${all.length}문장 · ${total.toFixed(1)}s <span style="color: ${OK};">길이 맞춤</span> · 존댓말</div>
    </div>
    ${section("HOOK", v.hook)}
    ${section("BODY", v.body)}
    ${section("CTA", v.cta)}
    <div style="display: flex; flex-direction: column; gap: 6px; margin-top: auto;">
      ${v.selected
        ? `<span style="display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; border-radius: 10px; background: #E9B25B; color: #0E1116; font-size: 14px; font-weight: 700;">${I.edit}편집하기</span>
      <span style="font-size: 11px; color: ${T.ink3}; text-align: center;">사용하기를 눌러 이 안을 쓰는 중 · 편집하기 → 문장별 수정 · 복사 · SRT</span>`
        : `<span style="display: flex; align-items: center; justify-content: center; height: 44px; border-radius: 10px; background: ${T.panel3}; border: 1px solid ${T.line2}; color: ${T.ink}; font-size: 14px; font-weight: 600;">사용하기</span>`}
    </div>
  </article>`;
  };

  const rail = `
<aside style="width: 64px; flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 14px 8px; border-radius: 16px; background: ${T.side}; border: 1px solid ${T.line};">
  <span style="display: flex; color: ${T.ink3};">${I.chevR}</span>
  ${[["1", "원본", "16문장"], ["2", "분석", "13/13"], ["3", "주제", "저장됨"]].map(([n, l, s]) => `
  <div style="display: flex; flex-direction: column; align-items: center; gap: 3px; width: 48px; padding: 8px 0; border-radius: 10px; background: ${T.panel};">
    <span style="display: inline-grid; place-items: center; width: 20px; height: 20px; border-radius: 6px; background: ${T.panel3}; ${mono} font-size: 11px; color: #E9B25B;">${n}</span>
    <span style="font-size: 11px; color: ${T.ink};">${l}</span>
    <span style="font-size: 9.5px; color: ${OK};">${s}</span>
  </div>`).join("")}
  <div style="margin-top: auto; display: flex; flex-direction: column; align-items: center; gap: 4px; color: ${T.ink3};">${I.refresh}<span style="font-size: 9.5px;">3안 다시</span></div>
</aside>`;

  const tab = (label, n, on) => `<span style="display: flex; align-items: center; gap: 6px; padding: 0 2px 10px; font-size: 14px; ${on ? `font-weight: 600; color: ${T.ink}; border-bottom: 2px solid #E9B25B;` : `color: ${T.ink3};`}">${label}${n ? `<span style="font-size: 12px; color: ${T.ink3}; font-weight: 500;">${n}</span>` : ""}</span>`;

  // ---------- 편집하기 → 아래에 펼쳐지는 스크립트 에디터 (사용 중인 안 기준) ----------
  const sel = VARIANTS.find((v) => v.selected);
  const chars = (ls) => ls.reduce((n, l) => n + l[2].length, 0);
  const editBlock = (kind, lines) => {
    const [color, bg] = secColor[kind];
    const start = lines[0][0], end = lines[lines.length - 1][1];
    return `
      <div style="border: 1px solid ${T.line}; border-radius: 14px; background: ${bg}; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <span style="display: flex; align-items: baseline; gap: 8px;"><span style="font-size: 12px; font-weight: 700; letter-spacing: 0.1em; color: ${color};">${kind}</span><span style="font-size: 11.5px; color: ${T.ink3};">${secLabel[kind]}</span></span>
          <span style="font-size: 11.5px; color: ${color}; font-variant-numeric: tabular-nums;">${lines.length}문장 · ${chars(lines)}글자 · <span style="${mono}">${tc(start)} – ${tc(end)}</span> · 약 ${(end - start).toFixed(0)}초</span>
        </div>
        <div style="min-height: ${Math.max(64, lines.length * 30)}px; padding: 10px 12px; border-radius: 10px; background: ${T.panel}; border: 1px solid ${T.line}; font-size: 14px; line-height: 1.75; color: ${T.ink}; position: relative;">
          ${lines.map((l) => `<div style="display: grid; grid-template-columns: 48px 1fr; gap: 6px;"><span style="${mono} font-size: 11px; color: ${T.ink3}; padding-top: 5px; font-variant-numeric: tabular-nums;">${tc(l[0])}</span><span>${l[2]}</span></div>`).join("")}
          <span style="position: absolute; right: 6px; bottom: 4px; color: ${T.ink3}; font-size: 10px;">◢</span>
        </div>
      </div>`;
  };
  const roundBtn = (label, { solid = false, small = false } = {}) => `<span style="display: inline-flex; align-items: center; justify-content: center; height: ${small ? 34 : 44}px; padding: 0 ${small ? 14 : 22}px; border-radius: 999px; font-size: ${small ? 12.5 : 14}px; white-space: nowrap; ${
    solid ? `background: #E9B25B; color: #0E1116; font-weight: 700;` : `background: ${T.panel2}; border: 1px solid ${T.line2}; color: ${T.ink}; font-weight: 500;`
  }">${label}</span>`;
  const scopeChip = (label, on) => `<span style="display: inline-flex; align-items: center; height: 30px; padding: 0 14px; border-radius: 999px; font-size: 13px; ${on ? `background: ${T.ink}; color: ${T.bg}; font-weight: 600;` : `color: ${T.ink2};`}">${label}</span>`;
  const allSel = [...sel.hook, ...sel.body, ...sel.cta];
  const editor = `
    <div style="border-top: 1px solid ${T.line}; margin-top: 6px; padding-top: 18px; display: flex; flex-direction: column; gap: 14px;">
      <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 16px;">
        <div>
          <span style="display: inline-flex; align-items: center; height: 24px; padding: 0 10px; border-radius: 999px; border: 1px solid ${T.line2}; ${mono} font-size: 10.5px; letter-spacing: 0.12em; color: ${T.ink2};">EDITOR</span>
          <div style="font-size: 24px; font-weight: 700; color: ${T.ink}; letter-spacing: -0.01em; margin-top: 8px;">스크립트 에디터 <span style="font-size: 14px; font-weight: 600; color: #E9B25B;">· C안 후킹형</span></div>
          <div style="font-size: 13px; color: ${T.ink2}; margin-top: 4px;">사용 중인 C안을 자유롭게 고치고, 오른쪽 AI 코파일럿에 수정 요청을 보내 반영하세요. 시간초는 고칠 때마다 다시 계산돼요.</div>
        </div>
        <div style="display: flex; gap: 8px;">${roundBtn("저장 내역")}${roundBtn("버전 저장", { solid: true })}</div>
      </div>
      <div style="display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 14px; align-items: stretch;">
        <div style="border: 1px solid ${T.line}; border-radius: 16px; background: ${T.panel}; padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          ${editBlock("HOOK", sel.hook)}
          ${editBlock("BODY", sel.body)}
          ${editBlock("CTA", sel.cta)}
          <div style="border: 1px solid ${T.line}; border-radius: 14px; background: ${T.panel2}; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px;">
            <div style="font-size: 13.5px; color: ${T.ink2};">현재 총 분량 <b style="color: ${T.ink};">${allSel.length}문장 · ${chars(allSel)}글자 · 약 ${allSel[allSel.length - 1][1].toFixed(0)}초</b> <span style="color: ${OK}; font-weight: 600;">목표 23초 안</span></div>
            <div style="display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: stretch;">
              <div style="border: 1px solid ${T.line}; border-radius: 12px; background: ${T.panel}; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; justify-content: space-between; font-size: 12.5px;"><span style="color: ${T.ink}; font-weight: 600;">시간 압축</span><span style="color: ${T.ink3};">최소 10초</span></div>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <span style="display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid ${T.line2}; background: ${T.panel2}; font-size: 13px; color: ${T.ink2};">목표 <span style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 28px; border-radius: 8px; border: 1px solid ${T.line2}; ${mono} font-size: 12px; color: ${T.ink3};">N</span> 초</span>
                  ${roundBtn("압축 제안 받기", { small: true })}
                </div>
                <div style="font-size: 11.5px; color: ${T.ink3};">현재 대본보다 짧은 시간만 입력할 수 있어요. 제안은 문장별로 「바꾸기 / 그대로」를 고를 수 있어요.</div>
              </div>
              <div style="display: flex; align-items: center;">${roundBtn("피드백 받기")}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 4px;">
            ${roundBtn("다시 선택하기")}
            <span style="display: flex; gap: 8px;">${roundBtn("텍스트 복사")}${roundBtn("완성 및 내보내기", { solid: true })}</span>
          </div>
        </div>
        <div style="border: 1px solid ${T.line}; border-radius: 16px; background: ${T.panel}; display: flex; flex-direction: column; min-height: 0;">
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid ${T.line};"><span style="font-size: 14px; font-weight: 700; color: ${T.ink};">AI 코파일럿</span><span style="font-size: 11.5px; color: ${T.ink3};">수정 · 피드백 · 시간 압축</span></div>
          <div style="flex: 1 1 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 24px; text-align: center;">
            <div style="font-size: 22px; font-weight: 700; color: ${T.ink}; line-height: 1.3; letter-spacing: -0.01em;">지금 무엇을 바꾸고 싶으세요?</div>
            <div style="font-size: 12.5px; color: ${T.ink3};">수정 요청을 보내면 대화가 시작돼요. 바뀐 문장은 왼쪽에 바로 반영되고 시간초가 다시 계산돼요.</div>
          </div>
          <div style="border-top: 1px solid ${T.line}; padding: 12px; display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; gap: 2px; padding: 3px; border-radius: 999px; border: 1px solid ${T.line}; background: ${T.panel2};">${scopeChip("전체", true)}${scopeChip("HOOK", false)}${scopeChip("BODY", false)}${scopeChip("CTA", false)}</div>
            <div style="min-height: 72px; padding: 10px 12px; border-radius: 12px; border: 1px solid ${T.line}; background: ${T.panel2}; font-size: 13px; line-height: 1.6; color: ${T.ink3};">예: HOOK을 더 공격적으로 바꿔줘 / CTA를 상담 유도형으로 바꿔줘 / 전체를 18초로 줄여줘</div>
            <div style="display: flex; justify-content: flex-end;">${roundBtn("보내기", { solid: true, small: true })}</div>
          </div>
        </div>
      </div>
    </div>`;
  return `
<main style="flex: 1 1 auto; min-width: 0; display: flex; gap: 16px; padding: 24px;">
  ${rail}
  <section style="flex: 1 1 auto; min-width: 0; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding: 20px; border-radius: 16px; background: ${T.side}; border: 1px solid ${T.line};">
    <div style="display: flex; align-items: center; gap: 20px; border-bottom: 1px solid ${T.line}; flex: 0 0 auto;">
      ${tab("원본 대본", "16", false)}${tab("새 대본 3안", "", true)}${tab("항목 비교", "", false)}
      <span style="margin-left: auto; padding-bottom: 10px; font-size: 12.5px; color: ${T.ink3};"><b style="color: ${T.ink}; font-weight: 600;">홈카페 드립백</b> · reel/coffee_3min 구조 · 목표 23s · 존댓말 · <span style="color: ${OK}; font-weight: 600;">3안 완료</span></span>
    </div>
    <div style="display: flex; align-items: center; gap: 14px; font-size: 12px; color: ${T.ink2}; flex: 0 0 auto;">
      <span>같은 설계도로 쓴 3가지 안. <b style="color: ${T.ink}; font-weight: 600;">「사용하기」</b>를 누른 안에 「편집하기」가 생기고, 그 안이 「고칠 것」·제목 추천의 대상이 돼요.</span>
      <span style="margin-left: auto; display: flex; gap: 12px; white-space: nowrap;">
        ${[["HOOK", "#E9B25B"], ["BODY", T.ink2], ["CTA", CTA]].map(([k, c]) => `<span style="display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: ${c};"><span style="width: 8px; height: 8px; border-radius: 2px; background: ${c};"></span>${k}</span>`).join("")}
        <span style="${mono} font-size: 11px; color: ${T.ink3};">0:00.0 = 말 시작 초</span>
      </span>
    </div>
    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: stretch;">
      ${VARIANTS.map(column).join("")}
    </div>
    ${editor}
  </section>
</main>`;
}
