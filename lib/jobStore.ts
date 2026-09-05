import type { Job } from "./types";

export const JOBS_KEY = "bsg.jobs.v1";
/** 「이 대본으로 변환」이 변환 화면에 넘겨 주는 원본 대본 id (sessionStorage) */
export const PICK_SOURCE_KEY = "bsg.convert.pickSource.v1";

/** 저장된 대본 결과 읽기 (미리보기 URL은 제외된 상태) */
export function loadJobs(): Job[] {
  try {
    const raw = localStorage.getItem(JOBS_KEY);
    return raw ? (JSON.parse(raw) as Job[]) : [];
  } catch {
    return [];
  }
}

export function saveJobs(jobs: Job[]): void {
  try {
    const slim = jobs.map((j) => ({ ...j, mediaUrl: null }));
    localStorage.setItem(JOBS_KEY, JSON.stringify(slim.slice(0, 30)));
  } catch {
    /* ignore */
  }
}

/** 변환 도구에서 쓸 수 있는 완료된 대본만 */
/** 파일명에서 인플루언서 계정 이름만 — "home.with.leanne_DcpgaNMp-Zx.mp4" → "home.with.leanne". 짧은 제목용 */
export function accountOf(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  const m = base.match(/^(.+?)_[A-Za-z0-9_-]{9,}(?:_[a-z]+)?$/);
  return m ? m[1] : base;
}

export function loadDoneJobs(): Job[] {
  return loadJobs().filter((j) => j.status === "done" && j.segments.length > 0);
}
