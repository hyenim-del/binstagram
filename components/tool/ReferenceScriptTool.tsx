"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { UploadZone } from "./UploadZone";
import { NoteBox } from "./NoteBox";
import { JobCard } from "./JobCard";
import { SamplePanel } from "./SamplePanel";
import { LANGS, MAX_BYTES, MAX_FILES, type Job, type MediaFile, type MediaKind, type TranscribeResponse } from "@/lib/types";
import { deleteMedia, loadMedia, saveMedia } from "@/lib/mediaStore";
import { accountOf, loadJobs, saveJobs } from "@/lib/jobStore";
import { Combobox } from "@/components/ui/Combobox";
import { refreshMediaUrls, takePendingPick } from "@/lib/linkVideoStore";
const uid = () => Math.random().toString(36).slice(2, 10);

function kindOf(file: File): MediaKind | null {
  const t = file.type || "";
  if (t.startsWith("video/")) return "video";
  if (t.startsWith("audio/")) return "audio";
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (/^(mp4|mov|webm|m4v|mkv|mpeg|mpg)$/.test(ext)) return "video";
  if (/^(mp3|m4a|wav|aac|ogg|flac|mpga)$/.test(ext)) return "audio";
  return null;
}

function measureDuration(url: string, kind: MediaKind): Promise<number | null> {
  return new Promise((resolve) => {
    const el = document.createElement(kind);
    el.muted = true;
    el.preload = "metadata";
    el.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;";
    let done = false;
    const finish = (v: number | null) => {
      if (done) return;
      done = true;
      el.removeAttribute("src");
      el.load();
      el.remove();
      resolve(v);
    };
    const read = () => {
      if (isFinite(el.duration) && el.duration > 0) finish(Math.round(el.duration * 10) / 10);
    };
    el.addEventListener("loadedmetadata", read);
    el.addEventListener("durationchange", read);
    el.addEventListener("canplay", read);
    el.addEventListener("error", () => finish(null));
    setTimeout(() => finish(null), 8000);
    document.body.appendChild(el);
    el.src = url;
    el.load();
  });
}

/** XHR로 업로드 진행률을 받으며 /api/transcribe 호출 */
function transcribe(file: File, opts: { language: string; speakers: boolean; note: string }, onProgress: (pct: number) => void, onUploaded: () => void) {
  return new Promise<TranscribeResponse>((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file, file.name);
    fd.append("language", opts.language);
    fd.append("speakers", String(opts.speakers));
    fd.append("note", opts.note);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/transcribe");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.upload.onload = () => onUploaded();
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as TranscribeResponse & { error?: string };
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data.error || `요청 실패 (${xhr.status})`));
      } catch {
        reject(new Error(`응답을 읽지 못했어요 (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("서버에 연결할 수 없어요"));
    xhr.send(fd);
  });
}

export function ReferenceScriptTool() {
  const toast = useToast();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [note, setNote] = useState("");
  const [lang, setLang] = useState<string>("auto");
  const [speakers, setSpeakers] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  /** 대본 결과는 한 번에 하나만 — 대본 변환 화면과 같은 콤보박스·삭제 확인(2026-09-04). null 이면 가장 최근 것 */
  const [viewId, setViewId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const viewIdx = Math.max(0, jobs.findIndex((j) => j.id === viewId));
  const viewJob: Job | null = jobs[viewIdx] ?? null;
  const STATUS_SHORT: Record<Job["status"], string> = { uploading: "업로드 중", transcribing: "인식 중", refining: "다듬는 중", done: "완료", failed: "실패" };
  const [tab, setTab] = useState<"results" | "sample">("sample");
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const langBox = useRef<HTMLDivElement>(null);
  const filesRef = useRef(files);
  filesRef.current = files;
  /** job.id → 원본 파일(재추출용). 새로 고침 후에는 IndexedDB에서 복원 */
  const blobs = useRef(new Map<string, Blob>());

  // ---- 저장/복원: 대본은 localStorage, 미디어 파일은 IndexedDB ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = loadJobs();
      if (!saved.length) {
        if (!cancelled) setHydrated(true);
        return;
      }
      const restored: Job[] = [];
      for (const j of saved) {
        const blob = await loadMedia(j.id);
        // 영상 파일이 남아 있지 않은 옛 결과는 복원하지 않음 (영상 없는 빈 카드 방지)
        if (!blob) continue;
        blobs.current.set(j.id, blob);
        const mediaUrl = URL.createObjectURL(blob);
        restored.push(
          j.status === "done" || j.status === "failed"
            ? { ...j, mediaUrl }
            : { ...j, mediaUrl, status: "failed", error: "페이지를 새로 고쳐 중단됐어요 — 「다시 추출」을 눌러주세요" }
        );
      }
      if (cancelled) return;
      setJobs(restored);
      if (restored.length) setTab("results");
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  // 복원이 끝난 뒤에만 저장 — 복원 전 빈 목록으로 덮어쓰는 문제 방지
  useEffect(() => {
    if (hydrated) saveJobs(jobs);
  }, [jobs, hydrated]);

  useEffect(() => {
    if (!langOpen) return;
    const close = (e: MouseEvent) => {
      if (!langBox.current?.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [langOpen]);

  // ---- 파일 ----
  const addFiles = useCallback(
    (list: FileList | File[]) => {
      const incoming = Array.from(list);
      let count = filesRef.current.length;
      const added: MediaFile[] = [];
      for (const f of incoming) {
        if (count >= MAX_FILES) {
          toast(`한 번에 최대 ${MAX_FILES}개까지 올릴 수 있어요`, "error");
          break;
        }
        const kind = kindOf(f);
        if (!kind) {
          toast(`${f.name}: 동영상 또는 오디오 파일만 올릴 수 있어요`, "error");
          continue;
        }
        if (f.size > MAX_BYTES) {
          toast(`${f.name}: 25MB를 넘어요 — 잘라서 올려주세요`, "error");
          continue;
        }
        if (filesRef.current.some((x) => x.name === f.name && x.size === f.size)) {
          toast("이미 추가된 파일이에요", "error");
          continue;
        }
        added.push({ id: uid(), name: f.name, kind, size: f.size, duration: null, measured: false, url: URL.createObjectURL(f), file: f });
        count++;
      }
      if (!added.length) return;
      setFiles((xs) => [...xs, ...added]);
      added.forEach(async (m) => {
        const d = await measureDuration(m.url, m.kind);
        setFiles((xs) => xs.map((x) => (x.id === m.id ? { ...x, duration: d, measured: true } : x)));
      });
    },
    [toast]
  );

  const removeFile = (id: string) => {
    setFiles((xs) => {
      const f = xs.find((x) => x.id === id);
      if (f && !jobs.some((j) => j.mediaUrl === f.url)) URL.revokeObjectURL(f.url);
      return xs.filter((x) => x.id !== id);
    });
  };

  // ---- 추출 ----
  const patchJob = (id: string, patch: Partial<Job>) => setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...patch } : j)));

  const runJob = async (job: Job, file: File) => {
    try {
      const res = await transcribe(
        file,
        { language: job.language, speakers: job.speakers, note: job.note },
        (pct) => patchJob(job.id, { uploadPct: pct }),
        () => patchJob(job.id, { status: "transcribing", uploadPct: 100 })
      );
      patchJob(job.id, { status: "done", segments: res.segments, detectedLanguage: res.language, duration: res.duration ?? job.duration, refined: res.refined, speech: res.speech });
      if (res.speech && res.speech.level !== "ok") toast(`${job.fileName}: ${res.speech.message} — 대본을 그대로 믿기 어려워요`, "error");
      else toast(`${job.fileName} 대본 완료`, "ok");
    } catch (e) {
      patchJob(job.id, { status: "failed", error: e instanceof Error ? e.message : String(e) });
      toast(`${job.fileName}: 실패`, "error");
    }
  };

  const generate = async () => {
    if (!files.length || busy) return;
    const newJobs: { job: Job; file: File }[] = files.map((f) => ({
      file: f.file,
      job: {
        id: uid(),
        fileName: f.name,
        kind: f.kind,
        duration: f.duration,
        mediaUrl: f.url,
        language: lang,
        speakers,
        note: note.trim(),
        status: "uploading",
        uploadPct: 0,
        segments: [],
        createdAt: Date.now(),
      },
    }));
    for (const n of newJobs) {
      blobs.current.set(n.job.id, n.file);
      void saveMedia(n.job.id, n.file);
    }
    setJobs((js) => [...newJobs.map((n) => n.job), ...js]);
    if (newJobs[0]) setViewId(newJobs[0].job.id);
    setTab("results");
    setBusy(true);
    for (const n of newJobs) await runJob(n.job, n.file); // 순차 처리 (요청 제한 회피)
    setBusy(false);
  };

  const retry = (old: Job) => {
    const blob = blobs.current.get(old.id) ?? files.find((f) => f.url === old.mediaUrl)?.file;
    if (!blob) {
      toast("파일을 다시 올려야 재추출할 수 있어요", "error");
      return;
    }
    const file = blob instanceof File ? blob : new File([blob], old.fileName, { type: blob.type });
    const job: Job = { ...old, id: uid(), status: "uploading", uploadPct: 0, segments: [], error: undefined, refined: undefined, language: lang, speakers, note: note.trim(), createdAt: Date.now(), mediaUrl: old.mediaUrl ?? URL.createObjectURL(file) };
    blobs.current.set(job.id, file);
    void saveMedia(job.id, file);
    setJobs((js) => [job, ...js]);
    setViewId(job.id);
    setBusy(true);
    runJob(job, file).finally(() => setBusy(false));
  };

  const removeJob = (id: string) => {
    blobs.current.delete(id);
    void deleteMedia(id);
    setJobs((js) => js.filter((j) => j.id !== id));
  };

  // ---- 「링크로 찾은 영상」에서 「선택」한 영상 ----
  // 서버가 인스타 CDN 에서 영상(미리보기용)과, 있으면 소리 트랙(대본용)을 받아 온다.
  // 인스타는 릴스를 영상·소리 분리(DASH)로 내주는 경우가 많아 영상 파일만으로는 Whisper 가 소리를 못 찾는다.
  const pickRunning = useRef(false);
  useEffect(() => {
    if (!hydrated || pickRunning.current) return;
    const pick = takePendingPick();
    if (!pick) return;
    pickRunning.current = true;
    (async () => {
      toast(`@${pick.owner} 영상을 가져오는 중…`, "ok");
      const fetchMedia = async (url: string, name: string) => {
        const res = await fetch("/api/link-video", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, name }) });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || `영상을 받지 못했어요 (${res.status})`);
        }
        const blob = await res.blob();
        return new File([blob], name, { type: blob.type || "video/mp4" });
      };
      const fetchBoth = (videoUrl: string, audioUrl: string | null) =>
        Promise.all([
          fetchMedia(videoUrl, pick.name),
          audioUrl ? fetchMedia(audioUrl, pick.name.replace(/\.mp4$/, "") + "_audio.m4a").catch(() => null) : Promise.resolve(null),
        ]);
      try {
        let video: File, audio: File | null;
        try {
          [video, audio] = await fetchBoth(pick.videoUrl, pick.audioUrl);
        } catch {
          // 인스타 CDN 주소가 만료된 경우 — 게시물 링크로 주소를 새로 받아 한 번 더
          toast("영상 주소가 만료돼 새로 받아오는 중…", "ok");
          const fresh = await refreshMediaUrls(pick.url);
          [video, audio] = await fetchBoth(fresh.videoUrl, fresh.audioUrl);
          pick.duration = pick.duration ?? fresh.duration;
        }
        const forWhisper = audio ?? video;
        const job: Job = {
          id: uid(),
          fileName: pick.name,
          kind: "video",
          duration: pick.duration,
          mediaUrl: URL.createObjectURL(video),
          language: lang,
          speakers,
          note: note.trim() || `인스타그램 ${pick.url}`,
          status: "uploading",
          uploadPct: 0,
          segments: [],
          createdAt: Date.now(),
        };
        blobs.current.set(job.id, forWhisper); // 재추출도 소리 트랙으로
        void saveMedia(job.id, video); // 새로 고침 뒤 미리보기 복원용
        setJobs((js) => [job, ...js]);
        setViewId(job.id);
        setTab("results");
        setBusy(true);
        await runJob(job, forWhisper);
        setBusy(false);
      } catch (e) {
        toast(e instanceof Error ? e.message : "영상을 받지 못했어요", "error");
      } finally {
        pickRunning.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const langName = useMemo(() => LANGS.find((l) => l.id === lang)?.name ?? lang, [lang]);
  const canGenerate = files.length > 0 && !busy;

  return (
    <>
      <section className="panel left-panel">
        <div>
          <h1 className="tool-title">레퍼런스 대본 확보</h1>
          <div className="tool-sub">
            레퍼런스 영상의 <b>음성을 글로 변환</b>해 타임코드가 붙은 대본을 만듭니다.
          </div>
        </div>

        <UploadZone files={files} onAdd={addFiles} onRemove={removeFile} />
        <NoteBox value={note} onChange={setNote} files={files} />

        <div className="controls">
          <div className="controls-row">
            <div ref={langBox} style={{ position: "relative" }}>
              <button className={`control${langOpen ? " open" : ""}`} onClick={() => setLangOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={langOpen}>
                <span>
                  <span className="lbl">언어</span>
                  <span className="val">{langName}</span>
                </span>
                <Icon.Chev size={16} style={{ color: "var(--ink-3)" }} />
              </button>
              {langOpen && (
                <div className="popover" style={{ left: 0, bottom: "calc(100% + 8px)", width: 320 }} role="listbox">
                  <div className="popover-title">음성 언어</div>
                  {LANGS.map((l) => (
                    <button
                      key={l.id}
                      className={`popover-item${l.id === lang ? " selected" : ""}`}
                      role="option"
                      aria-selected={l.id === lang}
                      onClick={() => {
                        setLang(l.id);
                        setLangOpen(false);
                      }}
                    >
                      <span className="t">{l.name}</span>
                      <span className="d">{l.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="control" onClick={() => setSpeakers((s) => !s)} role="switch" aria-checked={speakers}>
              <span>
                <span className="lbl">화자 구분</span>
                <span className="val">{speakers ? "켜기" : "끄기"}</span>
              </span>
              <span className={`toggle${speakers ? " on" : ""}`} />
            </button>
          </div>
          <button className="generate" disabled={!canGenerate} onClick={generate}>
            {busy ? "대본 추출 중…" : `대본 생성${files.length > 1 ? ` (${files.length}개)` : ""}`}
          </button>
          <div className="gen-hint">
            {files.length ? "파일마다 대본 1개가 만들어져요 · 음성 인식: OpenAI Whisper" : "동영상 또는 오디오를 올리면 버튼이 활성화돼요"}
          </div>
        </div>
      </section>

      <section className="panel right-panel">
        <div className="tabs" role="tablist">
          <button className={`tab${tab === "results" ? " active" : ""}`} role="tab" aria-selected={tab === "results"} onClick={() => setTab("results")}>
            대본 결과<span className="n">{jobs.length}</span>
          </button>
          <button className={`tab${tab === "sample" ? " active" : ""}`} role="tab" aria-selected={tab === "sample"} onClick={() => setTab("sample")}>
            예시
          </button>
        </div>
        {tab === "sample" ? (
          <SamplePanel />
        ) : (
          <div className="results">
            {jobs.length === 0 && (
              <div className="empty">
                아직 추출한 대본이 없어요
                <span className="tiny">왼쪽에 영상을 올리고 「대본 생성」을 눌러보세요</span>
              </div>
            )}
            {jobs.length > 0 && (
              <div className="rsel">
                <button className="btn ghost" onClick={() => setViewId(jobs[Math.max(0, viewIdx - 1)].id)} disabled={viewIdx <= 0} aria-label="더 최근 결과">
                  <Icon.Chev size={16} style={{ transform: "rotate(90deg)" }} />
                </button>
                <Combobox
                  ariaLabel="볼 대본 선택"
                  placeholder="대본 선택"
                  searchPlaceholder="계정·파일 이름 검색"
                  value={viewJob?.id ?? null}
                  onChange={(id) => {
                    setViewId(id);
                    setConfirmDel(false);
                  }}
                  items={jobs.map((j, i) => ({
                    value: j.id,
                    label: `${i + 1}. ${accountOf(j.fileName)}`,
                    meta: `${STATUS_SHORT[j.status]}${j.speech && j.speech.level !== "ok" ? (j.speech.kind === "lyrics" ? " · 노래만" : " · 말소리 없음") : ""}${j.duration ? ` · ${j.duration.toFixed(0)}s` : ""} · ${new Date(j.createdAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
                  }))}
                />
                <button className="btn ghost" onClick={() => setViewId(jobs[Math.min(jobs.length - 1, viewIdx + 1)].id)} disabled={viewIdx >= jobs.length - 1} aria-label="더 이전 결과">
                  <Icon.Chev size={16} style={{ transform: "rotate(-90deg)" }} />
                </button>
                <span className="tiny muted mono" style={{ whiteSpace: "nowrap" }}>
                  {viewIdx + 1} / {jobs.length}
                </span>
                {viewJob &&
                  (confirmDel ? (
                    <span className="rsel-confirm" role="alertdialog" aria-label="대본 삭제 확인">
                      <span>
                        <b>{viewIdx + 1}. {accountOf(viewJob.fileName)}</b> 대본을 지울까요? 저장된 영상과 대본이 함께 사라지고 되돌릴 수 없어요.
                      </span>
                      <button
                        className="btn danger"
                        onClick={() => {
                          removeJob(viewJob.id);
                          setConfirmDel(false);
                        }}
                      >
                        <Icon.Trash size={14} /> 지우기
                      </button>
                      <button className="btn ghost" onClick={() => setConfirmDel(false)}>
                        취소
                      </button>
                    </span>
                  ) : (
                    <button className="btn ghost" onClick={() => setConfirmDel(true)} aria-label="이 대본 삭제" title="이 대본 삭제">
                      <Icon.Trash size={15} /> 삭제
                    </button>
                  ))}
              </div>
            )}
            {viewJob && <JobCard key={viewJob.id} job={viewJob} onRetry={retry} onRemove={() => setConfirmDel(true)} />}
          </div>
        )}
      </section>
    </>
  );
}
