"use client";

import { useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { toDisplayTime, toPlainText, toSrt } from "@/lib/srt";
import { LANGS, type Job } from "@/lib/types";

type Props = { job: Job; onRetry: (job: Job) => void; onRemove: (id: string) => void };

const STATUS_TEXT: Record<Job["status"], string> = {
  uploading: "업로드 중",
  transcribing: "음성 인식 중",
  refining: "다듬는 중",
  done: "완료",
  failed: "실패",
};

function langName(id?: string) {
  return LANGS.find((l) => l.id === id)?.name ?? (id ? id.toUpperCase() : "");
}

export function JobCard({ job, onRetry, onRemove }: Props) {
  const toast = useToast();
  const media = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  const [t, setT] = useState(0);
  const [mediaFailed, setMediaFailed] = useState(false);

  const activeIdx = useMemo(() => job.segments.findIndex((s) => t >= s.start && t < s.end), [job.segments, t]);
  const active = activeIdx >= 0 ? job.segments[activeIdx] : null;
  const running = job.status === "uploading" || job.status === "transcribing" || job.status === "refining";

  const seek = (sec: number) => {
    const el = media.current;
    if (!el) return;
    el.currentTime = sec + 0.01;
    el.play().catch(() => {});
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toPlainText(job.segments));
      toast("대본을 복사했어요", "ok");
    } catch {
      toast("복사가 막혔어요 — 텍스트를 드래그해서 복사해 주세요", "error");
    }
  };

  const saveSrt = () => {
    const blob = new Blob([toSrt(job.segments)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = job.fileName.replace(/\.[^.]+$/, "") + ".srt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("SRT 파일을 저장했어요", "ok");
  };

  const speechWarn = job.status === "done" && job.speech && job.speech.level !== "ok" ? job.speech : null;
  const meta = [
    job.duration ? `${job.duration.toFixed(1)}s` : null,
    job.status === "done" ? langName(job.detectedLanguage || job.language) : langName(job.language),
    job.speakers ? "화자 구분(추정)" : null,
    job.refined ? "다듬기 적용" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="job">
      <div className="job-head">
        <span style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
          <span className="file" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {job.fileName}
          </span>
          <span className={`status ${running ? "running" : job.status}`}>
            {STATUS_TEXT[job.status]}
            {job.status === "uploading" ? ` ${job.uploadPct}%` : ""}
          </span>
          {speechWarn && (
            <span className="badge warn" title={speechWarn.detail}>
              {speechWarn.kind === "lyrics" ? "노래만" : speechWarn.level === "none" ? "말소리 없음" : "말소리 적음"}
            </span>
          )}
        </span>
        <span className="muted" style={{ whiteSpace: "nowrap" }}>
          {meta}
        </span>
      </div>

      {running && (
        <div className="progress-box">
          <div className={`bar${job.status === "uploading" ? "" : " indeterminate"}`}>
            <span style={job.status === "uploading" ? { width: `${job.uploadPct}%` } : undefined} />
          </div>
          <span className="small muted">
            {job.status === "uploading" && "파일을 서버로 보내는 중"}
            {job.status === "transcribing" && (job.note ? "음성 인식(Whisper) → 다듬기 지시 적용 중…" : "음성 인식(Whisper) 중 — 보통 영상 길이의 1/3 정도 걸려요")}
            {job.status === "refining" && "다듬기 지시 적용 중"}
          </span>
        </div>
      )}

      {job.status === "failed" && (
        <div className="failed-box">
          <span className="t">대본을 만들지 못했어요</span>
          <span className="d">{job.error ?? "알 수 없는 오류"}</span>
        </div>
      )}

      {job.status === "done" && (
        <>
          {speechWarn && (
            <div className={`speech-box ${speechWarn.level}`} role="alert">
              <span className="t">
                <Icon.Alert size={16} /> {speechWarn.message}
              </span>
              <span className="d">{speechWarn.detail}</span>
            </div>
          )}
          <div className="media">
            {job.mediaUrl && !mediaFailed ? (
              job.kind === "video" ? (
                <video
                  ref={media}
                  src={job.mediaUrl}
                  controls
                  playsInline
                  onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
                  onError={() => setMediaFailed(true)}
                />
              ) : (
                <>
                  <div className="poster" />
                  <audio ref={media} src={job.mediaUrl} controls onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onError={() => setMediaFailed(true)} style={{ position: "relative", zIndex: 1 }} />
                </>
              )
            ) : (
              <div className="poster">{mediaFailed ? "이 파일은 브라우저에서 재생할 수 없는 형식이에요 (대본은 정상)" : "미리보기 파일을 찾을 수 없어요 — 대본은 그대로 남아 있어요"}</div>
            )}
            {active && job.kind === "video" && job.mediaUrl && !mediaFailed && (
              <div className="caption-wrap">
                <span className="caption">
                  {active.speaker ? `${active.speaker} · ` : ""}
                  {active.text}
                </span>
              </div>
            )}
          </div>

          <div className="lines">
            <div className="lines-head">
              <span>
                {job.segments.length}문장 · 줄을 클릭하면 그 지점으로 이동
                {job.speakers ? " · 화자는 침묵 간격으로 추정" : ""}
              </span>
            </div>
            {job.segments.map((s, i) => (
              <button key={i} className={`line${s.speaker ? " spk" : ""}${i === activeIdx ? " active" : ""}`} onClick={() => seek(s.start)}>
                <span className="tc">
                  {toDisplayTime(s.start)}–{toDisplayTime(s.end)}
                </span>
                {s.speaker && <span className="sp">{s.speaker}</span>}
                <span>{s.text}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="job-foot">
        <div className="note">{job.note ? `다듬기: ${job.note}` : ""}</div>
        <div className="btn-row">
          {job.status === "done" && (
            <>
              <button className="btn" onClick={copy}>
                <Icon.Clip size={14} /> 복사 (글만)
              </button>
              <button className="btn" onClick={saveSrt}>
                <Icon.Download size={16} /> SRT 저장
              </button>
            </>
          )}
          {!running && (
            <>
              <button className="btn" onClick={() => onRetry(job)}>
                <Icon.Refresh size={16} /> 다시 추출
              </button>
              <button className="btn" onClick={() => onRemove(job.id)} aria-label="결과 삭제">
                <Icon.Trash size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
