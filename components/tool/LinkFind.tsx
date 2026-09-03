"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { COMMENT_RANGES, DAY_RANGES, DEFAULT_CRITERIA, VIEW_RANGES, criteriaLabel, fmtCount, parseLink, viewRange, type Criteria, type LinkFindRun } from "@/lib/linkFind";
import { addRun } from "@/lib/linkVideoStore";

type Props = {
  /** 바깥에서 링크를 채워 넣을 때(해외 레퍼런스 표의 「링크 넣기」) */
  value: string;
  onChange: (v: string) => void;
  inputId?: string;
};

const LINK_RE = /^https?:\/\/\S+$/i;
const uid = () => Math.random().toString(36).slice(2, 10);
const CRIT_KEY = "binstagram.linkFindCriteria.v1";

/** 「링크로 찾기」 입력 블록 — 목업(design/mockup/Search.dc.html)과 같은 구성 */
export function LinkFind({ value, onChange, inputId = "link-find-input" }: Props) {
  const toast = useToast();
  const router = useRouter();
  const [criteria, setCriteria] = useState<Criteria>(DEFAULT_CRITERIA);
  // 고른 기준은 이 브라우저에 기억
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CRIT_KEY);
      if (raw) {
        const c = JSON.parse(raw) as Partial<Criteria>;
        setCriteria({
          views: VIEW_RANGES.some((r) => r.id === c.views) ? c.views! : DEFAULT_CRITERIA.views,
          comments: COMMENT_RANGES.some((r) => r.id === c.comments) ? c.comments! : DEFAULT_CRITERIA.comments,
          days: DAY_RANGES.some((r) => r.id === c.days) ? c.days! : DEFAULT_CRITERIA.days,
        });
      }
    } catch {
      /* ignore */
    }
  }, []);
  const pickCriteria = (next: Criteria) => {
    setCriteria(next);
    try {
      localStorage.setItem(CRIT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  const [busy, setBusy] = useState(false);
  const ready = LINK_RE.test(value.trim()) && !busy;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const url = value.trim();
    if (!LINK_RE.test(url)) {
      toast("https:// 로 시작하는 링크를 붙여넣어 주세요", "error");
      return;
    }
    if (!parseLink(url)) {
      toast("지금은 인스타그램 계정·해시태그·게시물 링크만 읽을 수 있어요", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/link-find", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, criteria }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `서버 오류 ${res.status}`);
      const run: LinkFindRun = {
        id: uid(),
        createdAt: Date.now(),
        input: url,
        target: data.target,
        provider: data.provider,
        result: data.result,
        warning: data.warning,
        direct: data.direct,
        profile: data.profile ?? null,
        criteria: data.criteria ?? criteria,
      };
      addRun(run);
      const n = run.result.qualified.length;
      toast(
        run.direct ? "지정한 영상을 가져왔어요" : n ? `기준에 맞는 영상 ${n}개를 찾았어요` : "기준에 맞는 영상이 없어 조회수·댓글 1위를 가져왔어요",
        "ok",
      );
      router.push("/link-videos");
    } catch (err) {
      toast(err instanceof Error ? err.message : "가져오지 못했어요", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel linkfind">
      <div className="lf-head">
        <h1 className="tool-title">링크로 찾기</h1>
        <div className="lf-sub">
          계정·해시태그 링크를 붙여넣으면 인플루언서의 <b>5개 영상</b>을 보실 수 있습니다.
        </div>
      </div>
      <form className={`linkrow${ready ? " ready" : ""}`} onSubmit={submit}>
        <span className="ic">
          <Icon.Link size={16} />
        </span>
        <input
          id={inputId}
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https:// 영상 링크를 붙여넣으세요 — 인스타그램 · 유튜브 · 틱톡"
          aria-label="영상 링크"
          autoComplete="off"
          spellCheck={false}
          disabled={busy}
        />
        <button type="submit" className="go" disabled={busy} aria-busy={busy}>
          {busy ? <Icon.Refresh size={16} className="spin" /> : <Icon.Search size={16} />}
          {busy ? "가져오는 중" : "대본 가져오기"}
        </button>
      </form>
      <div className="opts">
        <label className="opt">
          <span className="lbl">조회수</span>
          <select className="opt-select" value={criteria.views} onChange={(e) => pickCriteria({ ...criteria, views: e.target.value })} aria-label="조회수 범위">
            {VIEW_RANGES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <span className="chev">
            <Icon.Chev size={16} />
          </span>
        </label>
        <label className="opt">
          <span className="lbl">댓글</span>
          <select className="opt-select" value={criteria.comments} onChange={(e) => pickCriteria({ ...criteria, comments: e.target.value })} aria-label="댓글 범위">
            {COMMENT_RANGES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <span className="chev">
            <Icon.Chev size={16} />
          </span>
        </label>
        <label className="opt">
          <span className="lbl">기간</span>
          <select className="opt-select" value={criteria.days ?? "all"} onChange={(e) => pickCriteria({ ...criteria, days: e.target.value })} aria-label="올린 날짜 범위">
            {DAY_RANGES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <span className="chev">
            <Icon.Chev size={16} />
          </span>
        </label>
      </div>
      <div className="lf-hint">
        {criteriaLabel(criteria)}
        {viewRange(criteria).max ? ` · 조회수 ${fmtCount(viewRange(criteria).max)} 이상은 제외` : ""} · 기준에 없으면 조회수 1위와 댓글 1위 · 아래 표의 「링크 넣기」를 누르면 이 칸에 채워져요
      </div>
    </section>
  );
}
