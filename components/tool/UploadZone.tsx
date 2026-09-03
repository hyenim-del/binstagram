"use client";

import { useRef, useState, type DragEvent } from "react";
import { Icon } from "@/components/ui/icons";
import { MAX_FILES, type MediaFile } from "@/lib/types";

type Props = {
  files: MediaFile[];
  onAdd: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
};

export function UploadZone({ files, onAdd, onRemove }: Props) {
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files?.length) onAdd(e.dataTransfer.files);
  };

  return (
    <div className="card upload-card">
      <div className="upload-label">
        동영상 / 오디오 최대 {MAX_FILES}개 <span className="muted">(파일당 25MB 이하 · 파일마다 대본 1개)</span>{" "}
        <span className="muted mono">· {files.length}/{MAX_FILES}</span>
      </div>
      <div
        className={`dropzone${files.length ? " compact" : ""}${drag ? " drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!drag) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") input.current?.click();
        }}
        aria-label="동영상 또는 오디오 파일 업로드"
      >
        <input
          ref={input}
          type="file"
          multiple
          accept="video/*,audio/*,.mp4,.mov,.m4v,.webm,.mp3,.m4a,.wav,.aac,.ogg"
          hidden
          onChange={(e) => {
            if (e.target.files?.length) onAdd(e.target.files);
            e.target.value = "";
          }}
        />
        <Icon.Upload size={28} style={{ color: "var(--ink-2)" }} />
        <div className="dz-title">동영상 / 오디오</div>
        <div className="dz-hint">{drag ? "여기에 놓으면 추가돼요" : "클릭하거나 파일을 끌어다 업로드"}</div>
      </div>

      {files.length > 0 && (
        <div className="chips">
          {files.map((f) => (
            <div className="chip" key={f.id}>
              <span className="chip-kind">{f.kind === "video" ? "VID" : "AUD"}</span>
              <span style={{ fontWeight: 500 }}>{f.name}</span>
              <span className="muted mono">{f.duration !== null ? `${f.duration.toFixed(1)}s` : f.measured ? "길이 ?" : "측정 중…"}</span>
              <button className="chip-x" aria-label={`${f.name} 제거`} onClick={() => onRemove(f.id)}>
                <Icon.X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
