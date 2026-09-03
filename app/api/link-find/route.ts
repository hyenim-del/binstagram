import { NextResponse } from "next/server";
import sharp from "sharp";
import { COMMENT_RANGES, DAY_RANGES, DEFAULT_CRITERIA, VIEW_RANGES, parseLink, pickVideos, type Criteria, type FoundProfile, type FoundVideo, type LinkTarget, type PickResult } from "@/lib/linkFind";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST { url }  →  { target, provider, result, warning?, direct?, profile? }
 *
 * 계정·게시물 링크는 계정 프로필(사진·팔로워·소개)도 함께 받는다. 프로필 사진과 상위 영상 썸네일은
 * 인스타 CDN 주소가 며칠 뒤 만료되므로 검색 시점에 내려받아 작게 줄인 data URI 로 담는다(브라우저 저장 크기 고려).
 *
 * 데이터 공급자(provider)
 *  - apify : Apify 액터. .env.local 에 APIFY_TOKEN 필요. 우리 인스타 계정을 쓰지 않아 정지 위험이 없음.
 *  - mock  : 화면 확인용 예시 데이터 (LINK_FIND_PROVIDER=mock)
 *
 * 링크 종류별 동작 (2026-09-02 실측)
 *  - 계정   : 최근 영상 60개를 훑어 조회수·댓글·좋아요를 받고 기준대로 고른다. 잘 동작한다.
 *  - 게시물 : 사용자가 직접 고른 영상이므로 기준을 적용하지 않고 그대로 담는다.
 *  - 해시태그: 인스타가 최근 게시물만 내주고 조회수를 주지 않는다. 가져오되 경고를 함께 보낸다.
 *
 * 로그인 세션 쿠키로 인스타그램 내부 API를 직접 부르는 방식은 넣지 않았다.
 * 같은 세션으로 429(요청 제한)가 확인됐고, 반복하면 계정 제한으로 이어진다.
 */
const SCAN_LIMIT = 60; // 계정 링크 하나당 훑는 최대 영상 수
const HASHTAG_LIMIT = 40;
const EMBED_TOP = 5; // 썸네일을 data URI 로 담는 상위 영상 수(화면의 인스타 카드 수와 같게)
const THUMB_W = 480;
const AVATAR_W = 160;

export async function POST(req: Request) {
  let body: { url?: string; criteria?: Partial<Criteria> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 잘못됐어요" }, { status: 400 });
  }
  const target = parseLink(body.url || "");
  const criteria: Criteria = {
    views: VIEW_RANGES.some((r) => r.id === body.criteria?.views) ? (body.criteria!.views as string) : DEFAULT_CRITERIA.views,
    comments: COMMENT_RANGES.some((r) => r.id === body.criteria?.comments) ? (body.criteria!.comments as string) : DEFAULT_CRITERIA.comments,
    days: DAY_RANGES.some((r) => r.id === body.criteria?.days) ? (body.criteria!.days as string) : DEFAULT_CRITERIA.days,
  };
  if (!target) return NextResponse.json({ error: "인스타그램 계정·해시태그·게시물 링크만 읽을 수 있어요" }, { status: 400 });

  const provider = (process.env.LINK_FIND_PROVIDER || (process.env.APIFY_TOKEN ? "apify" : "")).toLowerCase();
  if (provider !== "mock" && provider !== "apify") {
    return NextResponse.json(
      { error: "데이터 공급자가 설정되지 않았어요. .env.local 에 APIFY_TOKEN 을 넣거나(권장), 화면 확인용으로 LINK_FIND_PROVIDER=mock 을 넣고 서버를 다시 시작하세요." },
      { status: 503 },
    );
  }

  try {
    const token = process.env.APIFY_TOKEN as string;
    let videos: FoundVideo[];
    let warning: string | undefined;

    if (provider === "mock") {
      videos = mockVideos(target);
    } else if (target.kind === "hashtag") {
      videos = await apifyHashtag(target, token);
      warning =
        "해시태그 링크는 인스타그램이 방금 올라온 게시물만 내주고 조회수를 주지 않아요. 그래서 인기 영상이 잡히지 않습니다. 계정 링크를 쓰거나, 「해외 레퍼런스 찾기」에 정리해 둔 해시태그 상위 게시물을 보세요.";
    } else {
      videos = await apifyScraper(target, token);
    }

    // 게시물 링크는 사용자가 그 영상을 직접 고른 것이므로 기준을 적용하지 않는다
    const result: PickResult =
      target.kind === "post" ? { qualified: videos, fallback: [], excludedTooBig: 0, scanned: videos.length } : pickVideos(videos, criteria);

    // 계정 프로필: 계정 링크는 그 계정, 게시물 링크는 영상 주인
    const username = target.kind === "profile" ? target.id : target.kind === "post" ? videos[0]?.owner : "";
    const profile = provider === "mock" ? mockProfile(username) : username ? await apifyProfile(username, token) : null;

    // 상위 영상 썸네일 캡처
    const shown = result.qualified.length ? result.qualified.slice(0, EMBED_TOP) : result.fallback;
    await Promise.all(shown.map(async (v) => { v.thumb = (await embedImage(v.thumb, THUMB_W, 70)) ?? v.thumb; }));

    return NextResponse.json({ target, provider, result, warning, direct: target.kind === "post" || undefined, profile, criteria });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `영상 목록을 가져오지 못했어요: ${msg}` }, { status: 502 });
  }
}

/* ---------- Apify ---------- */
type ApifyItem = {
  shortCode?: string;
  url?: string;
  ownerUsername?: string;
  caption?: string;
  videoViewCount?: number;
  videoPlayCount?: number;
  commentsCount?: number;
  likesCount?: number;
  timestamp?: string;
  videoDuration?: number;
  type?: string;
  productType?: string;
  displayUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  ownerFullName?: string;
  error?: string;
};

async function runActor(actor: string, input: unknown, token: string): Promise<ApifyItem[]> {
  const res = await fetch(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=110`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Apify ${res.status}`);
  const items = (await res.json()) as ApifyItem[];
  return Array.isArray(items) ? items.filter((it) => !it.error) : [];
}

function toVideo(it: ApifyItem): FoundVideo {
  return {
    shortcode: it.shortCode as string,
    url: it.url || `https://www.instagram.com/p/${it.shortCode}/`,
    owner: it.ownerUsername || "",
    caption: (it.caption || "").slice(0, 200),
    views: it.videoPlayCount ?? it.videoViewCount ?? null,
    comments: it.commentsCount ?? 0,
    likes: it.likesCount ?? null,
    takenAt: it.timestamp ? Math.floor(new Date(it.timestamp).getTime() / 1000) : null,
    duration: it.videoDuration ?? null,
    thumb: it.displayUrl || null,
    ownerName: it.ownerFullName || "",
    videoUrl: it.videoUrl || null,
    audioUrl: it.audioUrl || null,
  };
}

const isVideo = (it: ApifyItem) => !!it.shortCode && (it.type === "Video" || it.productType === "clips" || it.videoPlayCount != null || it.videoViewCount != null);

/** 계정·게시물 링크 — apify/instagram-scraper */
async function apifyScraper(target: LinkTarget, token: string): Promise<FoundVideo[]> {
  const items = await runActor(
    "apify~instagram-scraper",
    {
      directUrls: [target.url],
      resultsType: target.kind === "post" ? "details" : "posts",
      resultsLimit: target.kind === "post" ? 1 : SCAN_LIMIT,
      addParentData: false,
    },
    token,
  );
  return items.filter(isVideo).map(toVideo);
}

/** 해시태그 링크 — 목록은 hashtag-scraper, 수치는 상세 조회로 보강 */
async function apifyHashtag(target: LinkTarget, token: string): Promise<FoundVideo[]> {
  const listed = await runActor("apify~instagram-hashtag-scraper", { hashtags: [target.id], resultsLimit: HASHTAG_LIMIT }, token);
  const urls = listed.filter((it) => it.shortCode).map((it) => it.url || `https://www.instagram.com/p/${it.shortCode}/`);
  if (!urls.length) return [];
  const detailed = await runActor("apify~instagram-scraper", { directUrls: urls, resultsType: "details", resultsLimit: urls.length, addParentData: false }, token);
  const merged = detailed.length ? detailed : listed;
  return merged.filter(isVideo).map(toVideo);
}

type ApifyProfile = {
  username?: string;
  fullName?: string;
  biography?: string;
  businessCategoryName?: string;
  verified?: boolean;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  externalUrl?: string;
  profilePicUrlHD?: string;
  profilePicUrl?: string;
  error?: string;
};

/** 계정 프로필 — apify/instagram-scraper resultsType=details. 실패해도 영상 결과는 살린다 */
async function apifyProfile(username: string, token: string): Promise<FoundProfile | null> {
  try {
    const res = await fetch(`https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=110`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ directUrls: [`https://www.instagram.com/${username}/`], resultsType: "details", resultsLimit: 1, addParentData: false }),
    });
    if (!res.ok) return null;
    const items = (await res.json()) as ApifyProfile[];
    const p = Array.isArray(items) ? items.find((it) => !it.error && it.username) : undefined;
    if (!p) return null;
    return {
      username: p.username as string,
      url: `https://www.instagram.com/${p.username}/`,
      fullName: p.fullName || "",
      bio: p.biography || "",
      category: p.businessCategoryName || "",
      verified: !!p.verified,
      followers: p.followersCount ?? null,
      follows: p.followsCount ?? null,
      posts: p.postsCount ?? null,
      externalUrl: p.externalUrl || null,
      avatar: await embedImage(p.profilePicUrlHD || p.profilePicUrl || null, AVATAR_W, 80),
    };
  } catch {
    return null;
  }
}

/** 인스타 CDN 이미지를 받아 줄인 뒤 data URI 로. 실패하면 null */
async function embedImage(url: string | null | undefined, width: number, quality: number): Promise<string | null> {
  if (!url || url.startsWith("data:")) return url ?? null;
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const out = await sharp(buf).resize({ width, withoutEnlargement: true }).jpeg({ quality, mozjpeg: true }).toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return null;
  }
}

/* ---------- mock: 화면 확인용 ---------- */
function mockProfile(username: string): FoundProfile | null {
  if (!username) return null;
  return {
    username,
    url: `https://www.instagram.com/${username}/`,
    fullName: "Example Creator",
    bio: "Mom life · cleaning hacks (예시 데이터)\n📩 hello@example.com",
    category: "Reel creator",
    verified: true,
    followers: 1_969_916,
    follows: 60,
    posts: 1_455,
    externalUrl: "https://example.com/links",
    avatar: null,
  };
}
function mockVideos(target: LinkTarget): FoundVideo[] {
  const owner = target.kind === "profile" ? target.id : "example_creator";
  const base = 1_756_000_000;
  const rows: [string, number, number, number, string][] = [
    ["DVB_xgyDVo5", 4_120_000, 2_930, 348_000, "this is how I reset my brain — 3 hour sunday reset"],
    ["Da_NTT2t8AE", 2_480_000, 1_240, 91_000, "whole workout, my dogs are barking"],
    ["DY995K_SQck", 1_310_000, 1_105, 50_200, "my mom is a professional cleaner and she says clean these 5 things"],
    ["DOYqcFxiF95", 980_000, 640, 13_500, "10 tiny cleaning habits that make SUCH a difference"],
    ["DNF3qB-vQZ_", 7_900_000, 4_100, 612_000, "ultimate home cleaning schedule (600만 이상 → 제외 예시)"],
    ["DXC10Yrga3a", 410_000, 2_200, 6_200, "spotless home with a newborn — comment heavy"],
  ];
  return rows.map(([sc, views, comments, likes, cap], i) => ({
    shortcode: sc,
    url: `https://www.instagram.com/p/${sc}/`,
    owner,
    caption: `${cap} (예시 데이터)`,
    views,
    comments,
    likes,
    takenAt: base - i * 86400 * 6,
    duration: 12 + i * 5,
    thumb: null,
    ownerName: "Example Creator",
    videoUrl: null,
    audioUrl: null,
  }));
}
