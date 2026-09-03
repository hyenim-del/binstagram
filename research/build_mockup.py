# -*- coding: utf-8 -*-
"""Mockup of the BinStaGram「해외 레퍼런스 찾기」page, using real data from lib/references.json."""
import json, pathlib
ROOT = pathlib.Path(__file__).parent
data = json.loads((ROOT.parent / 'lib' / 'references.json').read_text(encoding='utf-8'))
for k in data['keywords']: k.pop('webMarkdown', None)
OUT = pathlib.Path('/private/tmp/claude-501/-Users-anhyebeen-Documents-Hun-instagram/a4fa9fec-fb70-429a-9b71-7b61481d2c3b/scratchpad/binstagram-reference-finder.html')
n_creators = sum(len(k['creators']) for k in data['keywords'])
n_posts = sum(len(k['hashtag']['posts']) for k in data['keywords'])

page = r'''<title>BinStaGram 해외 레퍼런스 찾기</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{--bg:#0E1116;--side:#12161D;--panel:#171C25;--panel-2:#1E2430;--panel-3:#252C3A;--line:#2A3140;--line-2:#343C4D;--ink:#E8ECF2;--ink-2:#9AA5B5;--ink-3:#66718A;--blue:#7FA7FF;--blue-soft:#1B2740;--accent:#E9B25B;--accent-ink:#0E1116;--ok:#6CCB9A;--err:#F26D7D;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.6 "IBM Plex Sans KR","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}button{font:inherit;color:inherit;background:none;border:none;padding:0;cursor:pointer}
button:focus-visible,a:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.mono{font-family:"IBM Plex Mono",Menlo,monospace;font-variant-numeric:tabular-nums}
.mock{position:fixed;top:10px;right:14px;z-index:30;font-size:11px;color:var(--accent);background:#3E2C0E;padding:4px 10px;border-radius:999px}
.topbar{height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;border-bottom:1px solid var(--line);background:var(--bg);position:sticky;top:0;z-index:20}
.brand{display:flex;align-items:center;gap:10px}.brand-mark{width:30px;height:30px;border-radius:8px;background:var(--accent);display:grid;place-items:center}
.brand-name{font-size:18px;font-weight:700;letter-spacing:-.01em}
.avatar{width:36px;height:36px;border-radius:50%;background:var(--blue-soft);color:var(--blue);font-weight:700;display:grid;place-items:center}
.body{display:flex;min-height:calc(100vh - 64px)}
.sidebar{width:232px;flex:0 0 auto;background:var(--side);border-right:1px solid var(--line);padding:16px 12px;display:flex;flex-direction:column;gap:2px;position:sticky;top:64px;height:calc(100vh - 64px)}
.nav-group{font-size:11.5px;color:var(--ink-3);padding:0 12px;margin:18px 0 6px}
.nav-item{display:flex;align-items:center;gap:10px;height:40px;padding:0 12px;border-radius:10px;color:var(--ink-2)}
.nav-item svg{color:var(--ink-3)}.nav-item.active{background:var(--panel-2);color:var(--ink);font-weight:600;box-shadow:inset 0 0 0 1px var(--line-2)}.nav-item.active svg{color:var(--accent)}
main.workspace{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:20px;padding:24px}
.cols{display:flex;gap:20px;align-items:flex-start}
.linkfind{display:flex;flex-direction:column;gap:12px}
.linkfind .lf-head{display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap}
.linkfind h2{margin:0;font-size:20px;font-weight:700;letter-spacing:-.01em}
.linkfind .lf-sub{font-size:13.5px;color:var(--ink-2)}.linkfind .lf-sub b{color:var(--ink)}
.linkrow{display:flex;align-items:center;gap:10px;height:60px;padding:0 8px 0 18px;border-radius:16px;background:var(--panel);border:1.5px solid var(--line-2);box-shadow:0 10px 30px rgba(0,0,0,.25)}
.linkrow:focus-within{border-color:var(--accent)}
.linkrow .ic{display:flex;color:var(--ink-3)}
.linkrow input{flex:1 1 auto;min-width:0;background:transparent;border:none;font:inherit;font-size:15px;color:var(--ink)}
.linkrow input::placeholder{color:var(--ink-3)}.linkrow input:focus{outline:none}
.linkrow .go{display:flex;align-items:center;gap:6px;height:44px;padding:0 16px;border-radius:11px;font-size:14px;font-weight:700;white-space:nowrap;background:var(--panel-3);color:var(--ink-3)}
.linkrow.ready .go{background:var(--accent);color:var(--accent-ink)}
.opts{display:flex;gap:10px;flex-wrap:wrap}
.opt{display:flex;align-items:center;gap:10px;height:40px;padding:0 14px;border-radius:10px;background:var(--panel);border:1px solid var(--line);font-size:13.5px;color:var(--ink)}
.opt .lbl{color:var(--ink-3);font-size:12.5px}.opt .val{font-weight:500}.opt .chev{display:flex;color:var(--ink-3)}
.toggle{width:34px;height:20px;border-radius:10px;background:var(--line-2);position:relative;flex:0 0 auto}
.toggle::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff}
.toggle.on{background:var(--accent)}.toggle.on::after{left:16px}
.lf-hint{font-size:12.5px;color:var(--ink-3)}
.panel{border-radius:16px;background:var(--side);border:1px solid var(--line);padding:20px}
.left{width:300px;flex:0 0 auto;position:sticky;top:88px;max-height:calc(100vh - 112px);display:flex;flex-direction:column;gap:10px}
.right{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:16px}
h1.tool-title{margin:0;font-size:20px;font-weight:700;letter-spacing:-.01em}.tool-sub{font-size:12.5px;color:var(--ink-2);margin-top:4px}.tool-sub b{color:var(--ink);font-weight:600}
.search{display:flex;align-items:center;gap:8px;height:40px;padding:0 12px;border-radius:10px;background:var(--panel);border:1px solid var(--line);margin-top:8px}
.search input{flex:1;background:transparent;border:none;color:var(--ink);font:inherit;font-size:13.5px}.search input::placeholder{color:var(--ink-3)}.search input:focus{outline:none}
.kwlist{overflow-y:auto;display:flex;flex-direction:column;gap:2px;padding-right:4px}
.kwgroup{font-size:11px;color:var(--ink-3);padding:12px 10px 4px;letter-spacing:.02em;display:flex;justify-content:space-between}
.kw{display:grid;grid-template-columns:24px 1fr auto;align-items:center;gap:8px;height:38px;padding:0 10px;border-radius:9px;color:var(--ink-2);text-align:left;width:100%}
.kw:hover{background:var(--panel-2);color:var(--ink)}.kw.active{background:var(--panel-2);color:var(--ink);font-weight:600;box-shadow:inset 0 0 0 1px var(--line-2)}
.kw .n{font-family:"IBM Plex Mono",monospace;font-size:11.5px;color:var(--ink-3)}.kw .cnt{font-size:11px;color:var(--ink-3);font-family:"IBM Plex Mono",monospace}
.dot{width:7px;height:7px;border-radius:50%;background:var(--ink-3);display:inline-block;flex:0 0 auto}
.s-strong{background:var(--ok)}.s-mid{background:var(--accent)}.s-weak{background:var(--ink-3)}.s-spam{background:var(--err)}.s-none{background:transparent;box-shadow:inset 0 0 0 1.5px var(--ink-3)}
.head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.head .kn{font-family:"IBM Plex Mono",monospace;font-size:12px;color:var(--accent);letter-spacing:.06em}
.head h2{margin:2px 0 6px;font-size:22px;font-weight:700;letter-spacing:-.01em}
.tagrow{display:flex;gap:6px;flex-wrap:wrap}.tagchip{height:26px;display:inline-flex;align-items:center;padding:0 10px;border-radius:999px;background:var(--panel-3);color:var(--ink-2);font-family:"IBM Plex Mono",monospace;font-size:11.5px}
.verdict{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex:0 0 auto}
.badge{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:999px;background:var(--panel-3);color:var(--ink-2);font-size:11.5px;font-weight:600}
.badge.ok{background:#123424;color:var(--ok)}.badge.warn{background:#3E2C0E;color:var(--accent)}.badge.bad{background:#3A1A20;color:var(--err)}
.note{margin:12px 0 0;font-size:13px;color:var(--ink-2);max-width:72ch;padding:10px 12px;border-radius:10px;background:var(--panel-2);border-left:3px solid var(--line-2)}
.sec{display:flex;align-items:baseline;justify-content:space-between;margin:4px 0 10px}.sec h3{margin:0;font-size:13px;font-weight:600;color:var(--ink)}.sec span{font-size:11.5px;color:var(--ink-3)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}
.card{border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:12px 14px;display:flex;flex-direction:column;gap:6px;min-height:150px}
.card .h{display:flex;align-items:center;justify-content:space-between;gap:8px}
.card .handle{font-weight:600;font-size:14px;color:var(--ink)}.card .handle small{font-weight:400;color:var(--ink-3);margin-left:6px;font-size:12px}
.card .meta{display:flex;gap:8px;font-size:11.5px;color:var(--ink-3);flex-wrap:wrap}.card .meta b{color:var(--ink-2);font-weight:500;font-family:"IBM Plex Mono",monospace}
.card p{margin:0;font-size:12.5px;color:var(--ink-2);line-height:1.55;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.card .foot{margin-top:auto;display:flex;gap:6px;padding-top:6px}
.btn{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 10px;border-radius:8px;background:var(--panel-3);border:1px solid var(--line-2);font-size:12px;color:var(--ink)}
.btn:hover{filter:brightness(1.12)}.btn.primary{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);font-weight:600}
.btn.ghost{background:transparent;border-color:var(--line);color:var(--ink-2)}
.tw{overflow-x:auto;border:1px solid var(--line);border-radius:12px;background:var(--panel)}
table{border-collapse:collapse;width:100%;font-size:12.5px}
th{font-size:11px;font-weight:600;color:var(--ink-3);text-align:left;padding:9px 12px;border-bottom:1px solid var(--line);white-space:nowrap;letter-spacing:.02em}
td{padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}tr:last-child td{border-bottom:none}
td.num{font-family:"IBM Plex Mono",monospace;font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--ink)}
td .owner{color:var(--ink);font-weight:500}td .sc{font-family:"IBM Plex Mono",monospace;font-size:11.5px;color:var(--ink-3)}
td .acts{display:flex;gap:6px;white-space:nowrap}
.empty{padding:22px;border:1px dashed var(--line-2);border-radius:12px;color:var(--ink-3);font-size:13px;text-align:center}
.toast{position:fixed;left:50%;bottom:32px;transform:translateX(-50%);padding:10px 16px;border-radius:10px;background:var(--panel-3);border:1px solid var(--ok);font-size:13px;box-shadow:0 12px 32px rgba(0,0,0,.45);opacity:0;transition:opacity .15s;pointer-events:none}
.toast.show{opacity:1}
@media (max-width:1100px){.cols{flex-direction:column}.left{width:100%;position:static;max-height:none}.sidebar{display:none}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
<span class="mock">목업 · 실제 데이터 2026-09-02</span>
<div class="topbar"><div class="brand"><div class="brand-mark"><svg width="16" height="16" viewBox="0 0 24 24"><path d="M7 5v14l11-7z" fill="#0E1116"/></svg></div><span class="brand-name">BinStaGram</span></div><div class="avatar">h</div></div>
<div class="body">
<nav class="sidebar">
 <a class="nav-item" href="#"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M4 6h16M4 12h16M4 18h10"/></svg><span>순서</span></a>
 <div class="nav-group">제작 도구</div>
 <a class="nav-item active" href="#"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg><span>해외 레퍼런스 찾기</span></a>
 <a class="nav-item" href="#"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 10h8M8 14h5"/></svg><span>레퍼런스 대본 확보</span></a>
 <a class="nav-item" href="#"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M4 7h11l-3-3M20 17H9l3 3"/></svg><span>레퍼런스 대본 변환</span></a>
</nav>
<main class="workspace">
 <section class="panel linkfind">
  <div class="lf-head"><h2>링크로 찾기</h2><div class="lf-sub">영상 링크를 붙여넣으면 <b>타임코드가 붙은 대본</b>을 가져옵니다. 해외 영상은 <b>한국어 번역</b>까지 같이 나와요.</div></div>
  <label class="linkrow" id="linkrow"><span class="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5"/></svg></span>
   <input id="link" type="url" placeholder="https:// 영상 링크를 붙여넣으세요 — 인스타그램 · 유튜브 · 틱톡">
   <button class="go" type="button"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg>대본 가져오기</button></label>
  <div class="opts">
   <div class="opt"><span class="lbl">언어</span><span class="val">자동 감지</span><span class="chev"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></span></div>
   <div class="opt"><span class="lbl">화자 구분</span><span class="val">끄기</span><span class="toggle"></span></div>
   <div class="opt"><span class="lbl">한국어 번역</span><span class="val">켜기</span><span class="toggle on"></span></div>
  </div>
  <div class="lf-hint">파일 업로드 없이 링크만 · 한 번에 최대 5개 · 문장을 클릭하면 영상이 그 구간으로 이동 · 아래 표의 「링크 넣기」를 누르면 이 칸에 채워져요</div>
 </section>
 <div class="cols">
 <section class="panel left">
  <div><h1 class="tool-title">해외 레퍼런스 찾기</h1><div class="tool-sub">키워드 30개 · 해외 계정 <b>__NC__</b> · 확인한 게시물 <b>__NP__</b></div></div>
  <label class="search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#66718A" stroke-width="2"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg><input id="q" type="search" placeholder="키워드·해시태그·계정 검색"></label>
  <div class="kwlist" id="kwlist"></div>
 </section>
 <section class="right" id="detail"></section>
</div>
</main></div>
<div class="toast" id="toast">링크를 복사했어요</div>
<script>
const DATA = __DATA__;
const LABEL = {strong:'해시태그 강함',mid:'해시태그 보통',weak:'해시태그 약함',spam:'스팸 위주',none:'미확인'};
const BCLS = {strong:'ok',mid:'warn',weak:'',spam:'bad',none:''};
const esc = s => String(s??'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let cur = 1;
function matches(k, q){ if(!q) return true; q=q.toLowerCase(); return k.ko.includes(q) || k.tags.some(t=>t.toLowerCase().includes(q)) || k.creators.some(c=>c.handle.toLowerCase().includes(q)||c.name.toLowerCase().includes(q)); }
function renderList(){
  const q = document.getElementById('q').value.trim();
  const groups = [['주부 타겟','주부'],['자영업자 타겟','자영업자']];
  let h='';
  for(const [title,g] of groups){
    const ks = DATA.keywords.filter(k=>k.group===g && matches(k,q));
    if(!ks.length) continue;
    h += `<div class="kwgroup"><span>${title}</span><span>${ks.length}</span></div>`;
    for(const k of ks){ h += `<button class="kw${k.id===cur?' active':''}" data-id="${k.id}"><span class="n">${String(k.id).padStart(2,'0')}</span><span>${esc(k.ko)}</span><span style="display:flex;align-items:center;gap:8px"><span class="cnt">${k.creators.length}</span><i class="dot s-${k.hashtag.strength}"></i></span></button>`; }
  }
  document.getElementById('kwlist').innerHTML = h || '<div class="empty">일치하는 키워드가 없어요</div>';
}
function renderDetail(){
  const k = DATA.keywords.find(x=>x.id===cur); const hg=k.hashtag;
  const cards = k.creators.map(c=>`<div class="card"><div class="h"><span class="handle">@${esc(c.handle)}${c.name?`<small>${esc(c.name)}</small>`:''}</span>${c.aux?'<span class="badge">보조</span>':''}</div>
    <div class="meta">${c.country?`<span>${esc(c.country)}</span>`:''}${c.followers?`<span>팔로워 <b>${esc(c.followers)}</b></span>`:''}${c.format?`<span>${esc(c.format)}</span>`:''}</div>
    <p>${esc(c.desc||'설명 없음')}</p>
    <div class="foot"><a class="btn" href="${c.url}" target="_blank" rel="noopener">프로필 열기</a><a class="btn ghost" href="${c.url}reels/" target="_blank" rel="noopener">릴스 탭</a></div></div>`).join('');
  const rows = hg.posts.map(p=>{ const own = p.owner.startsWith('(') ? `<span style="color:var(--ink-3)">${esc(p.owner)}</span>` : `<a class="owner" href="https://www.instagram.com/${esc(p.owner.split(' ')[0])}/" target="_blank" rel="noopener">@${esc(p.owner)}</a>`;
    return `<tr><td>${own}<div class="sc">${esc(p.shortcode)}</div></td><td class="num">${esc(p.metric)}</td><td>${esc(p.desc)}</td><td><div class="acts"><button class="btn primary" data-fill="${p.url}">링크 넣기</button><button class="btn" data-copy="${p.url}">복사</button><a class="btn ghost" href="${p.url}" target="_blank" rel="noopener">열기</a></div></td></tr>`; }).join('');
  document.getElementById('detail').innerHTML = `
  <section class="panel"><div class="head"><div><div class="kn">KEYWORD ${String(k.id).padStart(2,'0')} · ${esc(k.group)} 타겟</div><h2>${esc(k.ko)}</h2><div class="tagrow">${k.tags.map(t=>`<span class="tagchip">#${esc(t)}</span>`).join('')}</div></div>
   <div class="verdict"><span class="badge ${BCLS[hg.strength]}"><i class="dot s-${hg.strength}" style="background:currentColor;box-shadow:none"></i>${LABEL[hg.strength]}</span><span style="font-size:11.5px;color:var(--ink-3)">검색어 ${esc(hg.query)}</span></div></div>
   <p class="note">${esc(hg.note)}</p></section>
  <section><div class="sec"><h3>해외 계정 ${k.creators.length}</h3><span>웹검색 · 프로필 메타 기준 팔로워 · 국내 계정 제외</span></div>${k.creators.length?`<div class="grid">${cards}</div>`:'<div class="empty">계정 자료 없음</div>'}</section>
  <section><div class="sec"><h3>해시태그 상위 게시물 ${hg.posts.length}</h3><span>인스타그램 검색 ${esc(hg.query)} · 2026-09-02</span></div>${rows?`<div class="tw"><table><thead><tr><th>작성자 · 게시물</th><th>반응</th><th>내용</th><th>링크로 찾기에 넣기</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="empty">이 해시태그는 확인할 만한 게시물이 없었어요. 위 계정 목록의 릴스 탭을 보세요.</div>'}</section>`;
}
document.getElementById('kwlist').addEventListener('click', e=>{ const b=e.target.closest('.kw'); if(!b) return; cur=+b.dataset.id; renderList(); renderDetail(); document.getElementById('detail').scrollIntoView({block:'start'}); });
document.getElementById('q').addEventListener('input', renderList);
const linkEl=document.getElementById('link'); const rowEl=document.getElementById('linkrow');
linkEl.addEventListener('input',()=>rowEl.classList.toggle('ready',/^https?:\/\//.test(linkEl.value.trim())));
document.getElementById('detail').addEventListener('click', async e=>{ const f=e.target.closest('[data-fill]'); if(f){ linkEl.value=f.dataset.fill; rowEl.classList.add('ready'); window.scrollTo({top:0,behavior:'smooth'}); linkEl.focus(); const t=document.getElementById('toast'); t.textContent='링크로 찾기 칸에 넣었어요'; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1400); return; }
  const b=e.target.closest('[data-copy]'); if(!b) return; document.getElementById('toast').textContent='링크를 복사했어요'; try{ await navigator.clipboard.writeText(b.dataset.copy);}catch(_){} const t=document.getElementById('toast'); t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1400); });
renderList(); renderDetail();
</script>
'''
page = page.replace('__DATA__', json.dumps(data, ensure_ascii=False)).replace('__NC__', str(n_creators)).replace('__NP__', str(n_posts))
OUT.write_text(page, encoding='utf-8')
print(OUT, len(page))
