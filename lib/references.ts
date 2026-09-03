import data from "./references.json";

/** 해시태그 판정 — 인스타그램 검색 상위 게시물을 직접 보고 매긴 값 */
export type HashtagStrength = "strong" | "mid" | "weak" | "spam" | "none";

export type RefPost = {
  shortcode: string;
  url: string;
  owner: string; // "(미확인)" 처럼 괄호로 시작하면 작성자 미확인
  metric: string; // 좋아요·댓글·조회 (조회수는 확장 프로그램이 동작한 앞쪽 키워드에만 있음)
  desc: string;
};

export type RefCreator = {
  handle: string;
  url: string;
  name: string;
  country: string;
  followers: string;
  format: string;
  desc: string;
  aux: boolean; // 보조 후보(규모 작거나 주제 적합도 낮음)
};

export type RefKeyword = {
  id: number;
  group: "주부" | "자영업자";
  ko: string;
  tags: string[];
  hashtag: {
    query: string;
    strength: HashtagStrength;
    label: string;
    note: string;
    posts: RefPost[];
  };
  creators: RefCreator[];
};

export type ReferenceData = { generatedAt: string; keywords: RefKeyword[] };

export const REFERENCES = data as ReferenceData;

export const STRENGTH_BADGE: Record<HashtagStrength, "ok" | "warn" | "bad" | ""> = {
  strong: "ok",
  mid: "warn",
  weak: "",
  spam: "bad",
  none: "",
};

export function ownerUrl(owner: string): string | null {
  if (!owner || owner.startsWith("(")) return null;
  return `https://www.instagram.com/${owner.split(" ")[0]}/`;
}

export function keywordMatches(k: RefKeyword, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return (
    k.ko.includes(s) ||
    k.tags.some((t) => t.toLowerCase().includes(s)) ||
    k.creators.some((c) => c.handle.toLowerCase().includes(s) || c.name.toLowerCase().includes(s))
  );
}
