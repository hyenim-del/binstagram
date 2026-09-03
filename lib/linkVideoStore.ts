import type { LinkFindRun } from "./linkFind";

const KEY = "binstagram.linkFindRuns.v1";
// 한 건에 프로필 사진 + 상위 3개 썸네일(data URI)이 들어가 200KB 안팎. localStorage 5MB 를 넘지 않게 20건까지
const MAX = 20;

export function loadRuns(): LinkFindRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const xs = raw ? (JSON.parse(raw) as LinkFindRun[]) : [];
    return Array.isArray(xs) ? xs : [];
  } catch {
    return [];
  }
}

export function saveRuns(xs: LinkFindRun[]) {
  // 저장 공간이 모자라면 오래된 것부터 떨어뜨리며 다시 시도. 끝내 안 되면 포기(화면에는 이미 반영됨)
  let keep = xs.slice(0, MAX);
  while (keep.length) {
    try {
      localStorage.setItem(KEY, JSON.stringify(keep));
      return;
    } catch {
      keep = keep.slice(0, -1);
    }
  }
}

export function addRun(run: LinkFindRun): LinkFindRun[] {
  const next = [run, ...loadRuns().filter((r) => r.id !== run.id)].slice(0, MAX);
  saveRuns(next);
  return next;
}

export function removeRun(id: string): LinkFindRun[] {
  const next = loadRuns().filter((r) => r.id !== id);
  saveRuns(next);
  return next;
}

/* ---------- 「선택」한 영상 → 레퍼런스 대본 확보로 전달 ---------- */
export type PendingPick = {
  videoUrl: string;
  /** 영상·소리가 분리된 릴스면 소리 트랙 주소 — 이걸로 대본을 뽑는다 */
  audioUrl: string | null;
  name: string;
  shortcode: string;
  owner: string;
  url: string;
  duration: number | null;
};
const PICK_KEY = "binstagram.pendingPick.v1";

/** 대본 확보 페이지로 넘어가기 직전에 저장. 탭이 닫히면 사라진다(sessionStorage) */
export function setPendingPick(p: PendingPick) {
  try {
    sessionStorage.setItem(PICK_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/** 대본 확보 페이지가 한 번 읽고 지운다 */
export function takePendingPick(): PendingPick | null {
  try {
    const raw = sessionStorage.getItem(PICK_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PICK_KEY);
    return JSON.parse(raw) as PendingPick;
  } catch {
    return null;
  }
}

/**
 * 게시물 링크로 영상·소리 주소를 새로 받아온다(/api/link-find, 게시물 1개 조회 ≈ 20초).
 * 예전 기록에 주소가 없거나, 인스타 CDN 주소가 만료됐을 때 「선택」이 이걸로 살아난다.
 */
export async function refreshMediaUrls(postUrl: string): Promise<{ videoUrl: string; audioUrl: string | null; duration: number | null }> {
  const res = await fetch("/api/link-find", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: postUrl }) });
  const data = (await res.json().catch(() => ({}))) as { error?: string; result?: { qualified?: { videoUrl?: string | null; audioUrl?: string | null; duration?: number | null }[] } };
  if (!res.ok) throw new Error(data.error || `영상 주소를 받지 못했어요 (${res.status})`);
  const v = data.result?.qualified?.[0];
  if (!v?.videoUrl) throw new Error("이 게시물에서 영상 파일을 찾지 못했어요");
  return { videoUrl: v.videoUrl, audioUrl: v.audioUrl ?? null, duration: v.duration ?? null };
}
