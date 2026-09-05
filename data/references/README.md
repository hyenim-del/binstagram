# 해외 레퍼런스 데이터 (「해외 레퍼런스 찾기」 화면의 원본)

앱은 `lib/references.json` 한 파일을 읽지만, **고칠 때는 이 폴더에서** 고칩니다.
`npm run dev` / `npm run build` 를 켤 때 이 폴더가 자동으로 합쳐져 `lib/references.json` 이 다시 만들어집니다.
(바로 합치고 싶으면 `npm run refs:merge`, 잘 맞는지 확인만 하려면 `npm run refs:check`)

## 폴더 구조

```
data/references/
  _meta.json                 조사 날짜(generatedAt)
  주부/                      그룹 = 화면 상단 탭
    01-살림-꿀팁/
      meta.json              id · group · ko(키워드 한글) · tags(영문 검색어)
      hashtag.json           해시태그 판정(query · strength · label · note) + 상위 게시물 posts[]
      creators.json          해외 계정 목록 []
    02-집-정리/
    …
  자영업자/
    16-자영업-꿀팁/
    …
  수익화/                    매크로(config_monetization.yaml) 결과를 받기 위해 추가한 그룹
    31-인스타-수익화/
```

그룹 폴더를 새로 만들면 화면 왼쪽에 「<그룹> 타겟」 묶음이 자동으로 생깁니다.

폴더 이름은 `번호-키워드`(띄어쓰기는 `-`)로 사람이 보기 좋게 붙인 것이고, 실제로 쓰이는 값은 `meta.json` 안의 `id` 와 `ko` 입니다.
그룹 폴더 이름은 `meta.json` 의 `group` 과 같아야 합니다(다르면 merge 가 멈추고 알려 줍니다).

## 자주 하는 수정

- **계정 추가/삭제**: 해당 키워드의 `creators.json` 배열에 항목을 넣거나 뺍니다.
  ```json
  { "handle": "cleanthatup", "url": "https://www.instagram.com/cleanthatup/", "name": "Brandon Pleshek",
    "country": "미국", "followers": "1.5M", "format": "릴스 위주", "desc": "왜 레퍼런스인지 한 줄", "aux": false }
  ```
  `aux: true` 는 보조 후보(규모 작거나 적합도 낮음) 표시.
- **해시태그 게시물 갱신**: `hashtag.json` 의 `posts[]`. `owner` 를 모르면 `"(미확인)"` 처럼 괄호로 시작하게 씁니다.
  `strength` 는 `strong | mid | weak | spam | none`, `label` 은 화면에 보이는 한글 문구.
- **키워드 추가**: 그룹 폴더 안에 새 폴더를 만들고 세 파일을 채웁니다. `id` 는 다른 키워드와 겹치지 않게(현재 1~30).
- **키워드 삭제**: 폴더를 지우면 됩니다.

## 매크로(insta-research) 결과 가져오기

`~/Documents/Hun/mecro` 매크로가 만든 `.csv` 를 읽어 계정을 키워드별 `creators.json` 에 넣고, 바로 `lib/references.json` 까지 합칩니다.

```bash
npm run refs:import                                 # _import.json 의 sources 폴더(../mecro/output, data/inbox)에 있는 .csv 를 모두 읽음
npm run refs:import -- 경로/파일.csv                 # 특정 파일만
npm run refs:import -- 파일.csv --keyword "1인 창업"  # 발견 경로를 무시하고 모든 계정을 이 키워드에 넣기
npm run refs:import -- --dry-run                     # 어디로 들어가는지 확인만
npm run refs:watch                                   # 매크로 돌리는 동안 켜 두기: 결과 .csv 가 바뀌면(기본 30분마다 확인) 자동으로 가져옴
npm run refs:watch -- --every 60                     # 확인 주기를 60초로
```

- 매크로 저장 위치는 바꾸지 않아도 됩니다. `mecro/output/*.csv` 를 그대로 읽습니다(매크로는 xlsx 와 같은 이름의 csv 를 항상 함께 만듭니다).
  다른 곳에 두고 싶으면 `data/inbox/` 에 복사하거나 `_import.json` 의 `sources` 에 폴더를 추가합니다.
- **어느 키워드로 들어가나**: 각 계정의 「발견 경로」(예: `#smallbusinesstips`, `키워드 small business marketing`)를
  ① `_import.json` 의 `map`, ② 키워드 `meta.json` 의 `tags`, ③ `hashtag.json` 의 `query` 와 대조합니다. 여러 키워드에 맞으면 모두에 들어갑니다.
  못 찾은 검색어는 실행 결과 끝에 목록으로 나오니 `map` 에 `"검색어": 키워드id` 로 추가하고 다시 실행하면 됩니다.
- **같은 계정을 다시 가져오면** 팔로워·지표·히트 게시물은 최신으로 갱신되고, 손으로 쓴 `country`·`desc`·`aux` 는 그대로 남습니다
  (설명이 `매크로 수집 …` 으로 시작하는 자동 문구일 때만 새 문구로 바뀝니다). 여러 번 실행해도 안전합니다.
- 가져온 계정에는 `metrics`(참여율·릴스 평균 조회수 등), `hits`(조회 100만+·댓글 300+ 게시물 링크), `sources`, `importedAt` 이 함께 저장됩니다.
  화면 카드에는 아직 `desc` 한 줄만 보이고, 히트 게시물 링크 표시는 다음 작업으로 남겨 두었습니다.
- `_import.json` 의 `skip` 에 적힌 파일(기본: 시험용 `influencers.csv`)은 읽지 않습니다.

## 처음부터 다시 만들 때

`research/build_data.py` 는 조사 원자료(`research/websearch_kw*.md`, `ig_grid_raw.txt`)에서 `lib/references.json` 을 만드는 최초 생성용 스크립트입니다.
그 결과로 이 폴더를 다시 만들려면 `node scripts/refs.mjs split --force` — **이 폴더에서 직접 고친 내용은 모두 사라지니** 주의.
