/** 「링크로 찾기」 — 링크 해석, 영상 고르기 규칙, 결과 타입. 서버·클라이언트 공용(순수 함수만). */

export type LinkKind = "profile" | "hashtag" | "post";

export type LinkTarget = {
  kind: LinkKind;
  /** 계정명, 해시태그(# 없이), 또는 게시물 shortcode */
  id: string;
  /** 정규화한 인스타그램 URL */
  url: string;
};

export type FoundVideo = {
  shortcode: string;
  url: string;
  owner: string;
  caption: string;
  views: number | null; // 조회수(재생수). 못 읽으면 null
  comments: number;
  likes: number | null;
  takenAt: number | null; // unix seconds
  duration: number | null; // seconds
  /** 썸네일 — 상위 영상은 검색 시점에 작은 data URI 로 저장(캡처), 나머지는 인스타 CDN 주소(며칠 뒤 만료). 예전 저장분에는 없음 */
  thumb?: string | null;
  /** 계정 표시 이름 */
  ownerName?: string;
  /** 영상 파일(mp4) 주소 — 「선택」으로 대본 확보에 넘길 때 씀. 인스타 CDN 주소라 며칠 뒤 만료 */
  videoUrl?: string | null;
  /** 오디오 트랙 주소 — 인스타가 영상·소리를 따로 내주는(DASH) 릴스일 때만 있음. 대본 추출은 이걸로 */
  audioUrl?: string | null;
};

/**
 * 고르기 기준 — 사용자가 화면에서 조회수 범위 · 댓글 범위를 고른다(2026-09-03).
 * 처음엔 조회수 100만 이상 · 댓글 500개 이상 · 600만 이상 제외로 고정이었으나 범위 선택으로 바뀜.
 */
export type Range = { id: string; label: string; min: number; max: number | null };
export const VIEW_RANGES: Range[] = [
  { id: "vall", label: "제한 없음", min: 0, max: null },
  { id: "v100k", label: "10만 ~ 50만", min: 100_000, max: 500_000 },
  { id: "v500k", label: "50만 ~ 100만", min: 500_000, max: 1_000_000 },
  { id: "v1m", label: "100만 이상", min: 1_000_000, max: null },
];
export const COMMENT_RANGES: Range[] = [
  { id: "call", label: "제한 없음", min: 0, max: null },
  { id: "c100", label: "100 ~ 500개", min: 100, max: 500 },
  { id: "c500", label: "500 ~ 1,000개", min: 500, max: 1_000 },
  { id: "c1k", label: "1,000개 이상", min: 1_000, max: null },
];
/** 올린 날짜 필터 — days 가 null 이면 기간 제한 없음 */
export type DayRange = { id: string; label: string; days: number | null };
export const DAY_RANGES: DayRange[] = [
  { id: "all", label: "전체 기간", days: null },
  { id: "d7", label: "최근 7일", days: 7 },
  { id: "d30", label: "최근 30일", days: 30 },
  { id: "d60", label: "최근 60일", days: 60 },
];
export type Criteria = { views: string; comments: string; days?: string };
export const DEFAULT_CRITERIA: Criteria = { views: "v1m", comments: "c500", days: "all" };
export const viewRange = (c?: Criteria | null) => VIEW_RANGES.find((r) => r.id === c?.views) ?? VIEW_RANGES.find((r) => r.id === DEFAULT_CRITERIA.views)!;
export const commentRange = (c?: Criteria | null) => COMMENT_RANGES.find((r) => r.id === c?.comments) ?? COMMENT_RANGES.find((r) => r.id === DEFAULT_CRITERIA.comments)!;
/** 범위가 「제한 없음」인지 — min 0 · max null */
export const isUnlimited = (r: Range) => r.min === 0 && r.max === null;
export const dayRange = (c?: Criteria | null) => DAY_RANGES.find((r) => r.id === c?.days) ?? DAY_RANGES[0];
/** 화면 문구용: "조회수 100만 이상 · 댓글 500 ~ 1,000개 · 최근 30일" */
export const criteriaLabel = (c?: Criteria | null) => `조회수 ${viewRange(c).label} · 댓글 ${commentRange(c).label}${dayRange(c).days ? ` · ${dayRange(c).label}` : ""}`;

/** 링크의 계정(인플루언서) 정보 — 계정·게시물 링크일 때 채움 */
export type FoundProfile = {
  username: string;
  url: string;
  fullName: string;
  bio: string;
  category: string;
  verified: boolean;
  followers: number | null;
  follows: number | null;
  posts: number | null;
  externalUrl: string | null;
  /** 프로필 사진 — 검색 시점에 받아 작은 data URI 로 저장(캡처). 못 받으면 null */
  avatar: string | null;
};

export type PickResult = {
  /** 기준을 모두 만족한 영상, 조회수 내림차순 */
  qualified: FoundVideo[];
  /** 기준 충족이 없을 때: 조회수 1위·댓글 1위(같으면 하나) */
  fallback: FoundVideo[];
  /** 조회수 범위 위(예: 50만~100만 범위에서 100만 초과)라 제외된 수 */
  excludedTooBig: number;
  scanned: number;
};

export type LinkFindRun = {
  id: string;
  createdAt: number;
  input: string;
  target: LinkTarget;
  provider: string;
  result: PickResult;
  /** 결과를 그대로 믿기 어려운 경우의 설명 (해시태그 링크 등) */
  warning?: string;
  /** 게시물 링크처럼 사용자가 영상을 직접 지정한 경우 — 고르기 기준을 적용하지 않음 */
  direct?: boolean;
  /** 계정 프로필(계정·게시물 링크). 예전 저장분에는 없음 */
  profile?: FoundProfile | null;
  /** 이 실행에 쓴 고르기 기준. 예전 저장분에는 없음(= 100만 이상 · 500개 이상) */
  criteria?: Criteria;
};

/** 인스타그램식 숫자 표기 (1.9K · 113K · 4.8M). 인스타처럼 반올림하지 않고 버린다 */
export function fmtIg(n: number | null): string {
  if (n === null || n === undefined) return "—";
  const trunc1 = (x: number) => (Math.floor(x * 10) / 10).toFixed(1).replace(/\.0$/, "");
  if (n >= 1_000_000) return `${trunc1(n / 1_000_000)}M`;
  if (n >= 100_000) return `${Math.floor(n / 1_000)}K`;
  if (n >= 1_000) return `${trunc1(n / 1_000)}K`;
  return n.toLocaleString("en-US");
}

const IG_HOST = /^(?:www\.)?instagram\.com$/i;
const RESERVED = new Set(["p", "reel", "reels", "explore", "stories", "accounts", "direct", "tv", "share"]);

/** 붙여넣은 링크를 계정 / 해시태그 / 게시물로 해석. 인스타그램이 아니면 null */
export function parseLink(raw: string): LinkTarget | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (!IG_HOST.test(u.hostname)) return null;
  const parts = u.pathname.split("/").filter(Boolean);

  // 해시태그: /explore/tags/<tag>/  또는  /explore/search/keyword/?q=%23tag
  if (parts[0] === "explore") {
    if (parts[1] === "tags" && parts[2]) return { kind: "hashtag", id: parts[2].toLowerCase(), url: `https://www.instagram.com/explore/tags/${parts[2].toLowerCase()}/` };
    const q = (u.searchParams.get("q") || "").replace(/^#/, "").trim();
    if (q) return { kind: "hashtag", id: q.toLowerCase(), url: `https://www.instagram.com/explore/tags/${encodeURIComponent(q.toLowerCase())}/` };
    return null;
  }
  // 게시물: /p/<code>/  /reel/<code>/  /<user>/reel/<code>/
  const pi = parts.findIndex((x) => x === "p" || x === "reel" || x === "reels");
  if (pi >= 0 && parts[pi + 1] && !(pi === 1 && parts[0] && !RESERVED.has(parts[0]) && parts[pi] === "reels" && !parts[pi + 1])) {
    const code = parts[pi + 1];
    if (/^[A-Za-z0-9_-]{5,}$/.test(code)) return { kind: "post", id: code, url: `https://www.instagram.com/p/${code}/` };
  }
  // 계정: /<user>/  또는 /<user>/reels/
  if (parts[0] && !RESERVED.has(parts[0]) && /^[A-Za-z0-9_.]{1,30}$/.test(parts[0])) {
    return { kind: "profile", id: parts[0].toLowerCase(), url: `https://www.instagram.com/${parts[0].toLowerCase()}/` };
  }
  return null;
}

/** 고른 조회수·댓글 범위 안의 영상을 조회수 내림차순으로. 없으면 최고 조회수·최고 댓글 영상. */
export function pickVideos(all: FoundVideo[], criteria: Criteria = DEFAULT_CRITERIA, now = Date.now()): PickResult {
  const vr = viewRange(criteria), cr = commentRange(criteria), dr = dayRange(criteria);
  const inRange = (n: number, r: Range) => n >= r.min && (r.max === null || n < r.max);
  // 조회수 「제한 없음」이면 조회수를 못 읽은 영상도 통과
  const viewsOk = (v: FoundVideo) => (isUnlimited(vr) ? v.views === null || inRange(v.views, vr) : v.views !== null && inRange(v.views, vr));
  // 날짜: 올린 시각을 아는 영상만 거른다(모르면 통과). 기간 밖 영상은 아예 빼서 대신 보여주는 1위도 그 기간 안에서 고른다
  const since = dr.days ? now / 1000 - dr.days * 86400 : null;
  const recent = since === null ? all : all.filter((v) => v.takenAt === null || v.takenAt >= since);
  const tooBig = recent.filter((v) => v.views !== null && vr.max !== null && v.views >= vr.max);
  const pool = recent.filter((v) => !tooBig.includes(v));
  const qualified = pool
    .filter((v) => viewsOk(v) && inRange(v.comments, cr))
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0) || b.comments - a.comments);
  let fallback: FoundVideo[] = [];
  if (!qualified.length && pool.length) {
    const byViews = [...pool].filter((v) => v.views !== null).sort((a, b) => (b.views as number) - (a.views as number))[0];
    const byComments = [...pool].sort((a, b) => b.comments - a.comments)[0];
    fallback = [byViews, byComments].filter((v, i, arr): v is FoundVideo => !!v && arr.indexOf(v) === i);
  }
  return { qualified, fallback, excludedTooBig: tooBig.length, scanned: all.length };
}

export function fmtCount(n: number | null): string {
  if (n === null || n === undefined) return "—";
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1).replace(/\.0$/, "")}억`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1).replace(/\.0$/, "")}만`;
  return n.toLocaleString("ko-KR");
}
