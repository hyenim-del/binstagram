export type MediaKind = "video" | "audio";

export type MediaFile = {
  id: string;
  name: string;
  kind: MediaKind;
  size: number;
  duration: number | null; // seconds; null = 측정 중 또는 실패 (measured 로 구분)
  measured: boolean;
  url: string; // object URL (브라우저 세션 동안만 유효)
  file: File;
};

export type Segment = {
  start: number;
  end: number;
  text: string;
  speaker?: string;
};

/** 말소리 판정 — Whisper 구간별 무음 확률·신뢰도로 계산. 배경음악·무음 영상에서 Whisper가 지어낸 대본을 걸러내기 위함 */
export type SpeechCheck = {
  level: "ok" | "low" | "none";
  /** 내용 종류 — speech: 말, lyrics: 노래 가사(대본으로 못 씀), nonsense: 앞뒤 안 맞는 환각. 예전 저장분에는 없음 */
  kind?: "speech" | "lyrics" | "nonsense";
  /** 짧은 제목: "말소리가 거의 없는 영상이에요" */
  message: string;
  /** 근거 설명 */
  detail: string;
  /** 전체 길이 중 말로 인식된 비율(0~1) */
  coverage: number;
};

export type JobStatus = "uploading" | "transcribing" | "refining" | "done" | "failed";

export type Job = {
  id: string;
  fileName: string;
  kind: MediaKind;
  duration: number | null;
  mediaUrl: string | null; // object URL; 새로 고침 후 IndexedDB에서 복원
  language: string; // 요청 언어 (auto | ko | en | ja)
  detectedLanguage?: string;
  speakers: boolean;
  note: string;
  status: JobStatus;
  uploadPct: number;
  segments: Segment[];
  error?: string;
  refined?: boolean;
  /** 말소리 판정. 예전 저장분에는 없음(= 판정 안 함) */
  speech?: SpeechCheck;
  createdAt: number;
};

export type TranscribeResponse = {
  language: string;
  duration: number;
  segments: Segment[];
  refined: boolean;
  speech?: SpeechCheck;
};

export const LANGS = [
  { id: "auto", name: "자동 감지", desc: "음성에서 언어를 알아냅니다 (기본)" },
  { id: "ko", name: "한국어", desc: "한국어 릴스·쇼츠" },
  { id: "en", name: "English", desc: "영어 콘텐츠" },
  { id: "ja", name: "日本語", desc: "일본어 콘텐츠" },
] as const;

export const MAX_FILES = 5;
export const MAX_BYTES = 25 * 1024 * 1024;
