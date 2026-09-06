# BinStaGram — 레퍼런스 대본 확보

> 처음 오셨다면 **[사용 설명서(GUIDE.md)](GUIDE.md)** 를 먼저 읽어 주세요. 앱 안의 「사용 설명서」 메뉴와 같은 내용입니다.

레퍼런스 영상(릴스·쇼츠)의 **음성을 글로 변환**해 타임코드가 붙은 대본을 만들고, 영상 위에 자막으로 확인·SRT로 저장하는 도구.
음성 인식은 OpenAI Whisper(`whisper-1`), 선택 입력 "다듬기 지시"는 `gpt-4o-mini`가 적용합니다.

## 실행

```bash
npm install          # 처음 한 번
npm run dev          # http://localhost:3000  (자동으로 /reference-script 로 이동)
```

> `npm run dev` 가 켜진 상태에서 `npm run build` 를 돌리면 같은 `.next` 폴더를 덮어써 "Cannot find module './NNN.js'" 오류가 납니다. 빌드가 필요하면 dev 서버를 먼저 끄고, 오류가 났다면 `rm -rf .next` 후 다시 `npm run dev`.

`.env.local` 에 `OPENAI_API_KEY=sk-...` 가 있어야 합니다. 키를 바꾸면 서버를 다시 시작하세요.
OpenAI 계정에 **결제 크레딧**이 있어야 대본이 나옵니다 (없으면 화면에 안내가 뜹니다).

## 구조

```
app/
  layout.tsx                  상단바 + 사이드바 셸, 토스트
  page.tsx                    → /reference-script 리다이렉트
  overseas-reference/page.tsx 해외 레퍼런스 찾기 (상단 링크로 찾기 입력 + 키워드별 해외 계정·해시태그 상위 게시물; 그룹 탭은 data/references/ 폴더에서 자동 생성)
  reference-script/page.tsx   대본 추출 화면
  steps/page.tsx              「사용 설명서」(처음 온 사람용 안내 · 홈 / 이 페이지로 이동)
  api/transcribe/route.ts     서버: 파일 → Whisper(verbose_json, segment 타임스탬프) → 화자 추정 → 다듬기 → JSON
components/
  shell/  TopBar · Sidebar
  tool/   ReferenceScriptTool(상태·업로드·추출) · UploadZone · NoteBox(@참조) · JobCard(영상+동기 자막+대본) · SamplePanel
          OverseasReferenceTool(키워드 목록+상세) · LinkFind(링크 입력 블록, 서버 연동은 아직 없음)
  ui/     Toast · icons
lib/
  types.ts · srt.ts(SRT/표시용 시간 변환) · nav.ts
  references.json · references.ts   해외 레퍼런스 데이터(2026-09-02 조사, 키워드 30·계정 166·게시물 99) — data/references/ 폴더를 `npm run refs:merge` 로 합친 생성물(직접 고치지 말 것)
data/references/              해외 레퍼런스 데이터 원본 — <그룹>/<번호>-<키워드>/{meta,hashtag,creators}.json (자세한 건 data/references/README.md)
scripts/refs.mjs              data/references ↔ lib/references.json 변환(split · merge · check · import); dev/build 앞에서 merge 자동 실행. `npm run refs:import` 는 ~/Documents/Hun/mecro 매크로의 .csv 를 키워드별 creators.json 에 넣음
research/                     조사 원자료(websearch_kw*.md, ig_grid_raw.txt), REPORT.md, build_report.py · build_data.py(원자료→references.json 최초 생성용) · build_mockup.py
design/mockup/                1단계 목업 소스 (node build-mockup.mjs 로 재생성)
```

## 제한

- 파일 최대 5개, 파일당 25MB (Whisper 한도). 형식: mp4 · m4a · mp3 · wav · webm 등 (`.mov`는 Whisper 미지원 → mp4로 변환)
- 화자 구분은 Whisper가 제공하지 않아 **침묵 간격 기반 추정**입니다
- 미리보기 영상은 브라우저 세션 동안만 유지되고, 대본 텍스트는 로컬 저장(localStorage)에 남습니다

## 링크로 찾기 · 링크로 찾은 영상

「해외 레퍼런스 찾기」 상단에 인스타그램 계정·해시태그·게시물 링크를 넣고 「대본 가져오기」를 누르면, 서버(`/api/link-find`)가 그 링크의 영상을 훑어
**조회수 100만 이상 · 댓글 500개 이상**(`lib/linkFind.ts`의 `CRITERIA`)을 조회수순으로 고르고(**600만 이상은 제외**), 없으면 **조회수 1위·댓글 1위**를 대신 담아 「링크로 찾은 영상」에 저장합니다(브라우저 localStorage, 최근 20건). 계정·게시물 링크는 계정 프로필(사진·팔로워·소개)도 함께 받고, 프로필 사진과 상위 3개 썸네일은 CDN 주소가 만료돼도 남도록 검색 시점에 작은 data URI 로 담습니다(`sharp`). 「링크로 찾은 영상」 페이지(사이드바에서 해외 레퍼런스 찾기의 하위 항목)는 인스타그램 프로필 상단 모양의 계정 블록 + 상위 3개를 인스타그램 게시물 카드로, 나머지는 표로 보여 주며 프로필·카드의 사진·계정명을 누르면 인스타그램 새 탭으로 열립니다. 카드의 **「선택」**은 그 영상을 「레퍼런스 대본 확보」로 보내 바로 대본을 뽑습니다 — 서버(`/api/link-video`)가 인스타 CDN 에서 영상(미리보기용)과 소리 트랙(대본용)을 받아 옵니다. 인스타는 릴스를 영상·소리 분리(DASH)로 내주는 경우가 많아 소리 트랙(`audioUrl`)이 있으면 그걸로 Whisper 를 돌립니다. 영상 주소는 며칠 뒤 만료되므로 오래된 기록에서 「선택」이 실패하면 링크를 다시 넣으면 됩니다.
규칙은 `lib/linkFind.ts`의 `CRITERIA`·`pickVideos`에 있습니다.

링크 종류별 동작 (2026-09-02 실측)

| 링크 | 동작 |
|---|---|
| 계정 `instagram.com/<계정>/` | 최근 영상 60개를 훑어 조회수·댓글·좋아요를 받고 기준대로 고름. **주력 경로** |
| 게시물 `instagram.com/p/<코드>/` | 사용자가 직접 고른 영상이므로 고르기 기준을 적용하지 않고 그대로 담음 |
| 해시태그 `instagram.com/explore/tags/<태그>/` | 인스타가 **방금 올라온 게시물만** 내주고 **조회수를 주지 않음**. 가져오되 화면에 경고 표시. 해시태그 상위 게시물은 「해외 레퍼런스 찾기」에 정리해 둔 데이터를 볼 것 |

데이터 공급자는 `.env.local`로 고릅니다.

- `APIFY_TOKEN=apify_api_...` — [Apify instagram-scraper](https://apify.com/apify/instagram-scraper) 사용(권장). 우리 인스타 계정을 쓰지 않아 계정 제한 위험이 없고, 조회수·댓글·좋아요가 함께 옵니다. 링크 하나당 최대 60개 영상을 훑습니다(유료, 건당 소액).
- `LINK_FIND_PROVIDER=mock` — 화면 확인용 예시 데이터.

로그인 세션 쿠키로 인스타그램 내부 API를 직접 부르는 방식은 넣지 않았습니다. 같은 세션으로 2026-09-02 확인 중 429(요청 제한)가 떴고, 반복하면 계정 제한으로 이어집니다.

## 레퍼런스 대본 변환 v4 — A안·B안·C안 + 스크립트 에디터 (2026-09-03)

- 「새 대본 3안 생성」 한 번에 **A안 원본형 · B안 대화형 · C안 후킹형**을 동시에 씁니다(`/api/convert` `mode:"generate"` → `variants[]`, 병렬 3회 호출). 결과가 나오면 왼쪽 ①②③ 설정이 64px 레일로 접히고(클릭하면 펼침) 세 안이 나란히 보입니다.
- 각 안은 문장의 role(훅/문제/…/CTA)로 **HOOK · BODY · CTA** 구간을 묶고, 구간마다 시작–끝 초와 길이, 문장마다 시작 초를 표시합니다. 시간초는 모델 값이 아니라 `lib/convert.ts` `retime()`(공백 제외 초당 6.5글자, 최소 1.2초)으로 계산하므로 문장을 고치면 바로 다시 계산됩니다.
- 안 하단 「사용하기」 → 그 안이 '사용 중'이 되고 버튼이 「편집하기」로 바뀜 → 3안 아래에 **스크립트 에디터**가 펼쳐집니다.
  - HOOK·BODY·CTA 칸에서 문장별 수정·삭제·추가 / 「버전 저장」·「저장 내역」(스냅샷 10개, 되돌리기)
  - 총 분량 카드: **시간 압축**(목표 N초 → `mode:"compress"` 문장별 제안, 「바꾸기 / 그대로 / 모두 바꾸기」) · **피드백 받기**(`mode:"feedback"`, 없는 숫자·사실 / 설계도 약속 / 길이·말투 중 고칠 것 최대 3개를 코파일럿 대화로)
  - 「다시 선택하기」 · 「텍스트 복사」 · 「완성 및 내보내기」(SRT 저장 + 복사)
  - 오른쪽 **AI 코파일럿**: 범위(전체 · HOOK · BODY · CTA)를 고르고 수정 요청 → `mode:"edit"` → 왼쪽 문장에 바로 반영. 대화는 결과에 30개까지 저장.
- 저장: `bsg.convert.v1`(결과 20개). 예전 저장분(안 1개)은 `normalizeResult()`로 A안 하나짜리 결과로 읽힙니다.
- 목업: `design/mockup/Convert3.dc.html` (`convert3.mjs`).

## 링크로 찾기 — 조회수 · 댓글 범위 선택 (2026-09-03)

- 「링크로 찾기」 아래 옵션이 언어·화자 구분·한국어 번역(모두 미연결)에서 **조회수 범위**(10만~50만 / 50만~100만 / 100만 이상)와 **댓글 범위**(100~500 / 500~1,000 / 1,000개 이상) 두 개로 바뀜. 기본값 100만 이상 · 500~1,000개, 고른 값은 `binstagram.linkFindCriteria.v1`에 기억.
- `/api/link-find` 가 `criteria: { views, comments }` 를 받아 `pickVideos(videos, criteria)` 로 고르고 응답에 `criteria` 를 돌려줌. 실행 기록(`LinkFindRun.criteria`)에 함께 저장되어 「링크로 찾은 영상」 머리에 그 기준이 표시됨. 범위에 위쪽 한도가 있으면(예: 50만~100만) 그 위는 "N 이상 제외 K" 로 셈. 예전의 600만 이상 고정 제외는 없어짐.
- 상단 바 지구본 아이콘 삭제. 해외 레퍼런스 계정 카드의 「릴스 탭」→ 「프로필 링크 넣기」(계정 링크를 링크로 찾기 칸에 채움).

- 2026-09-03: 링크로 찾기 안내 문구 "인플루언서의 5개 영상" — 인스타 카드와 썸네일 캡처 모두 상위 3 → 5개(`TOP_N`, `EMBED_TOP`). 한 건 저장 용량이 커지므로 20건 한도 전에 용량 부족 시 오래된 기록부터 자동 삭제.
- 2026-09-03: 링크로 찾기 옵션에 **기간**(전체 기간 / 최근 7일 / 최근 30일 / 최근 60일) 추가 — `Criteria.days`, 올린 시각(`takenAt`)을 아는 영상만 거르고 기간 밖 영상은 대신 보여주는 1위 계산에서도 제외. 계정 링크는 최신 60개까지만 훑으므로 그 안에서만 적용됨.
