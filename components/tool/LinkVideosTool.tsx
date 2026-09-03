"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { commentRange, criteriaLabel, fmtCount, fmtIg, viewRange, type FoundProfile, type FoundVideo, type LinkFindRun } from "@/lib/linkFind";
import { loadRuns, refreshMediaUrls, removeRun, setPendingPick } from "@/lib/linkVideoStore";
import { Combobox } from "@/components/ui/Combobox";

const KIND_LABEL = { profile: "계정", hashtag: "해시태그", post: "게시물" } as const;
const CATEGORY_KO: Record<string, string> = { "Reel creator": "릴스 크리에이터", "Digital creator": "디지털 크리에이터", "Video creator": "비디오 크리에이터", Blogger: "블로거", Entrepreneur: "기업가" };
const TOP_N = 5;

function when(ts: number | null) {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString("ko-KR", { year: "2-digit", month: "numeric", day: "numeric" });
}
function kdate(ts: number | null) {
  if (!ts) return "—";
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
/** 인스타그램식 경과 표기: 3시간 · 6일 · 1주 */
function ago(ts: number | null) {
  if (!ts) return "";
  const s = Math.max(0, Date.now() / 1000 - ts);
  const d = Math.floor(s / 86400);
  if (d >= 7) return `${Math.floor(d / 7)}주`;
  if (d >= 1) return `${d}일`;
  const h = Math.floor(s / 3600);
  return h >= 1 ? `${h}시간` : `${Math.max(1, Math.floor(s / 60))}분`;
}
const profileUrl = (u: string) => `https://www.instagram.com/${u}/`;

export function LinkVideosTool() {
  const toast = useToast();
  const [runs, setRuns] = useState<LinkFindRun[]>([]);
  const [ready, setReady] = useState(false);
  /** 결과는 한 번에 하나만 — 대본 변환 화면과 같은 콤보박스·삭제 확인(2026-09-04). null 이면 가장 최근 것 */
  const [viewId, setViewId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const viewIdx = Math.max(0, runs.findIndex((r) => r.id === viewId));
  const viewRun: LinkFindRun | null = runs[viewIdx] ?? null;
  const runLabel = (r: LinkFindRun) => (r.target.kind === "hashtag" ? `#${r.target.id}` : r.target.kind === "profile" ? `@${r.target.id}` : `@${r.profile?.username ?? r.result.qualified[0]?.owner ?? r.target.id}`);

  useEffect(() => {
    setRuns(loadRuns());
    setReady(true);
  }, []);

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast("링크를 복사했어요", "ok");
    } catch {
      toast("복사하지 못했어요", "error");
    }
  }

  return (
    <div className="ref-page">
      <section className="panel linkfind">
        <div className="lf-head">
          <h1 className="tool-title">링크로 찾은 영상</h1>
          <div className="lf-sub">
            「링크로 찾기」에서 고른 <b>조회수 범위 · 댓글 범위</b> 안의 영상을 조회수순으로 고릅니다. 기준에 맞는 영상이 없으면 조회수 1위와 댓글 1위를 대신 보여줘요.
          </div>
        </div>
        <div className="lf-hint">
          링크는 <Link href="/overseas-reference">해외 레퍼런스 찾기</Link> 상단의 「링크로 찾기」에서 넣습니다. 결과는 이 브라우저에만 저장돼요(최근 20건).
        </div>
      </section>

      {ready && !runs.length && (
        <div className="empty ref-empty">
          아직 가져온 영상이 없어요. 해외 레퍼런스 찾기에서 계정·해시태그 링크를 넣고 「대본 가져오기」를 눌러 보세요.
        </div>
      )}

      {runs.length > 0 && (
        <div className="rsel">
          <button className="btn ghost" onClick={() => setViewId(runs[Math.max(0, viewIdx - 1)].id)} disabled={viewIdx <= 0} aria-label="더 최근 결과">
            <Icon.Chev size={16} style={{ transform: "rotate(90deg)" }} />
          </button>
          <Combobox
            ariaLabel="볼 결과 선택"
            placeholder="결과 선택"
            searchPlaceholder="계정·해시태그 검색"
            value={viewRun?.id ?? null}
            onChange={(id) => {
              setViewId(id);
              setConfirmDel(false);
            }}
            items={runs.map((r, i) => ({
              value: r.id,
              label: `${i + 1}. ${runLabel(r)}`,
              meta: `${r.direct ? "영상 1개" : `${r.result.qualified.length || r.result.fallback.length}개`} · ${new Date(r.createdAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
            }))}
          />
          <button className="btn ghost" onClick={() => setViewId(runs[Math.min(runs.length - 1, viewIdx + 1)].id)} disabled={viewIdx >= runs.length - 1} aria-label="더 이전 결과">
            <Icon.Chev size={16} style={{ transform: "rotate(-90deg)" }} />
          </button>
          <span className="tiny muted mono" style={{ whiteSpace: "nowrap" }}>
            {viewIdx + 1} / {runs.length}
          </span>
          {viewRun &&
            (confirmDel ? (
              <span className="rsel-confirm" role="alertdialog" aria-label="결과 삭제 확인">
                <span>
                  <b>{viewIdx + 1}. {runLabel(viewRun)}</b> 결과를 지울까요? 찾은 영상 목록이 사라지고 되돌릴 수 없어요.
                </span>
                <button
                  className="btn danger"
                  onClick={() => {
                    setRuns(removeRun(viewRun.id));
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
              <button className="btn ghost" onClick={() => setConfirmDel(true)} aria-label="이 결과 삭제" title="이 결과 삭제">
                <Icon.Trash size={15} /> 삭제
              </button>
            ))}
        </div>
      )}
      {viewRun && <RunCard key={viewRun.id} run={viewRun} onCopy={copy} />}
    </div>
  );
}

function RunCard({ run, onCopy }: { run: LinkFindRun; onCopy: (u: string) => void }) {
  const { result, target } = run;
  const usingFallback = !result.qualified.length && result.fallback.length > 0;
  const rows: FoundVideo[] = usingFallback ? result.fallback : result.qualified;
  const top = rows.slice(0, TOP_N);
  const rankLabel = (v: FoundVideo, i: number) => {
    if (run.direct) return "직접 지정";
    if (!usingFallback) return `${i + 1}위 · 조회수 ${fmtCount(v.views)}`;
    // 대체 규칙: 조회수 1위 / 댓글 1위 (한 영상이 둘 다면 하나로)
    if (result.fallback.length === 1) return `조회수·댓글 1위 · ${fmtCount(v.views)} / ${fmtCount(v.comments)}개`;
    const byViews = result.fallback[0] === v && v.views !== null;
    return byViews ? `조회수 1위 · ${fmtCount(v.views)}` : `댓글 1위 · ${fmtCount(v.comments)}개`;
  };

  return (
    <section className="panel run">
      <div className="run-head">
        <div>
          <div className="kn">
            {KIND_LABEL[target.kind]} · {new Date(run.createdAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            {run.provider === "mock" && <span className="badge warn" style={{ marginLeft: 8 }}>예시 데이터</span>}
          </div>
          {!run.profile && (
            <h2>
              <a href={target.url} target="_blank" rel="noopener noreferrer">
                {target.kind === "hashtag" ? `#${target.id}` : target.kind === "profile" ? `@${target.id}` : target.id}
              </a>
            </h2>
          )}
          <div className="run-meta">
            {run.direct ? (
              <>이 링크의 영상 1개 · 고르기 기준 적용 안 함</>
            ) : (
              <>
                {criteriaLabel(run.criteria)} · 훑은 영상 {result.scanned} · 기준 충족 {result.qualified.length}
                {result.excludedTooBig > 0 && viewRange(run.criteria).max && (
                  <>
                    {" "}
                    · {fmtCount(viewRange(run.criteria).max)} 이상 제외 {result.excludedTooBig}
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <div className="verdict">
          <span className={`badge ${run.direct ? "ok" : usingFallback ? "warn" : result.qualified.length ? "ok" : ""}`}>
            {run.direct
              ? "직접 지정한 영상"
              : usingFallback
                ? "기준 충족 없음 → 최고 조회수·댓글"
                : result.qualified.length
                  ? `기준 충족 ${result.qualified.length}`
                  : "영상 없음"}
          </span>
        </div>
      </div>

      {run.profile && <ProfileHeader p={run.profile} />}
      {run.warning && <p className="run-warn">{run.warning}</p>}

      {top.length > 0 && (
        <>
          <div className="sec">
            <h3>{run.direct ? "지정한 영상" : `상위 ${top.length}개`} — 인스타그램 게시물 모양</h3>
            <span>「선택」= 이 영상으로 대본 가져오기 · 사진·계정명 = 인스타그램에서 열기</span>
          </div>
          <div className="igcards">
            {top.map((v, i) => (
              <IgCard key={v.shortcode} v={v} rank={rankLabel(v, i)} profile={run.profile ?? null} onCopy={onCopy} />
            ))}
          </div>
        </>
      )}

      {rows.length ? (
        <>
          {rows.length > top.length && (
            <div className="sec">
              <h3>전체 목록 ({rows.length})</h3>
              <span>상위 {top.length}개 아래 나머지까지 표로</span>
            </div>
          )}
          <div className="ref-table">
            <table>
              <thead>
                <tr>
                  <th>영상</th>
                  <th>조회수</th>
                  <th>댓글</th>
                  <th>좋아요</th>
                  <th>게시일</th>
                  <th>길이</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr key={v.shortcode}>
                    <td>
                      <div className="owner">@{v.owner || "—"}</div>
                      <div className="cap">{v.caption || <span className="muted">캡션 없음</span>}</div>
                      <div className="sc">{v.shortcode}</div>
                    </td>
                    <td className="num">{fmtCount(v.views)}</td>
                    <td className="num">{fmtCount(v.comments)}</td>
                    <td className="num">{fmtCount(v.likes)}</td>
                    <td className="num">{when(v.takenAt)}</td>
                    <td className="num">{v.duration ? `${Math.round(v.duration)}s` : "—"}</td>
                    <td>
                      <div className="acts">
                        <button type="button" className="btn" onClick={() => onCopy(v.url)}>
                          복사
                        </button>
                        <a className="btn ghost" href={v.url} target="_blank" rel="noopener noreferrer">
                          열기
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="empty ref-empty">이 링크에서 영상을 찾지 못했어요.</div>
      )}
    </section>
  );
}

/** 인플루언서 프로필 — 인스타그램 프로필 상단과 같은 구성. 전체가 프로필 링크 */
function ProfileHeader({ p }: { p: FoundProfile }) {
  const bioLines = p.bio.split("\n").filter((l) => l.trim());
  return (
    <a className="prof" href={p.url} target="_blank" rel="noopener noreferrer">
      {p.avatar ? (
        <img className="prof-av" src={p.avatar} alt={`@${p.username} 프로필 사진`} />
      ) : (
        <span className="prof-av prof-av-fallback">{p.username[0]?.toUpperCase()}</span>
      )}
      <div className="prof-body">
        <div className="prof-name">
          <span className="u">{p.username}</span>
          {p.verified && <Icon.Verified size={20} />}
          <span className="ig-more" aria-hidden="true">···</span>
        </div>
        {p.fullName && <div className="prof-full">{p.fullName}</div>}
        <div className="prof-stats">
          <span><b>{p.posts !== null ? p.posts.toLocaleString("en-US") : "—"}</b> posts</span>
          <span><b>{fmtIg(p.followers)}</b> followers</span>
          <span><b>{fmtIg(p.follows)}</b> following</span>
        </div>
        {p.category && <div className="prof-cat">{CATEGORY_KO[p.category] ?? p.category}</div>}
        {bioLines.length > 0 && (
          <div className="prof-bio">
            {bioLines.map((l, i) => (
              <span key={i}>
                {l}
                {i < bioLines.length - 1 && <br />}
              </span>
            ))}
          </div>
        )}
        {p.externalUrl && <div className="prof-link">🔗 {p.externalUrl.replace(/^https?:\/\//, "")}</div>}
        <div className="prof-btns">
          <span className="pb follow">Follow</span>
          <span className="pb">Message</span>
          <span className="pb sq">+👤</span>
        </div>
      </div>
    </a>
  );
}

/** 인스타그램 게시물 모양 카드. 사진·캡션은 게시물, 계정명·아바타는 프로필로 연결. 「선택」은 이 영상을 대본 확보로 넘김 */
function IgCard({ v, rank, profile, onCopy }: { v: FoundVideo; rank: string; profile: FoundProfile | null; onCopy: (u: string) => void }) {
  const [broken, setBroken] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const [picking, setPicking] = useState(false);
  const pick = async () => {
    if (picking) return;
    let media = { videoUrl: v.videoUrl ?? "", audioUrl: v.audioUrl ?? null, duration: v.duration };
    if (!media.videoUrl) {
      // 「선택」 기능 전에 저장된 기록 — 게시물 링크로 주소를 새로 받는다
      setPicking(true);
      toast("영상 주소를 받아오는 중… (20초쯤)", "ok");
      try {
        media = await refreshMediaUrls(v.url);
      } catch (e) {
        toast(e instanceof Error ? e.message : "영상 주소를 받지 못했어요", "error");
        setPicking(false);
        return;
      }
      setPicking(false);
    }
    setPendingPick({
      videoUrl: media.videoUrl,
      audioUrl: media.audioUrl,
      name: `${v.owner || "instagram"}_${v.shortcode}.mp4`,
      shortcode: v.shortcode,
      owner: v.owner,
      url: v.url,
      duration: media.duration,
    });
    router.push("/reference-script");
  };
  const owner = v.owner || profile?.username || "";
  const ownerName = v.ownerName || profile?.fullName || "";
  const avatar = profile && profile.username === owner ? profile.avatar : null;
  const caption = v.caption.split("\n")[0];
  const showThumb = !!v.thumb && !broken;
  return (
    <article className="ig">
      <header className="ig-head">
        <a className="ig-av" href={profileUrl(owner)} target="_blank" rel="noopener noreferrer" aria-label={`@${owner} 프로필`}>
          {avatar ? <img src={avatar} alt="" /> : <span>{owner[0]?.toUpperCase() || "?"}</span>}
        </a>
        <div className="ig-who">
          <div className="ig-name">
            <a href={profileUrl(owner)} target="_blank" rel="noopener noreferrer">
              {owner}
            </a>
            {profile?.verified && profile.username === owner && <Icon.Verified size={14} />}
            {v.takenAt && (
              <>
                <span className="ig-dot">·</span>
                <span className="ig-ago">{ago(v.takenAt)}</span>
              </>
            )}
          </div>
          {ownerName && <div className="ig-sub">{ownerName}</div>}
          <div className="ig-sub muted">릴스{v.duration ? ` · ${Math.round(v.duration)}초` : ""}</div>
        </div>
        <button type="button" className="ig-select" onClick={pick} disabled={picking} aria-busy={picking} title="이 영상을 레퍼런스 대본 확보로 보내 대본을 가져와요">
          {picking ? "받는 중…" : "선택"}
        </button>
        <span className="ig-more" aria-hidden="true">···</span>
      </header>

      <a className={`ig-media${showThumb ? "" : " noimg"}`} href={v.url} target="_blank" rel="noopener noreferrer" aria-label="인스타그램에서 열기">
        {showThumb ? <img src={v.thumb as string} alt="" onError={() => setBroken(true)} /> : <span className="ig-noimg">{caption || "사진을 불러올 수 없어요"}</span>}
        <span className="ig-play">
          <Icon.Play size={22} />
        </span>
        <div className="ig-chips">
          <span className="chip rank">{rank}</span>
          <span className="chip">❤ {fmtIg(v.likes)}</span>
          <span className="chip">💬 {fmtIg(v.comments)}</span>
          <span className="chip">▶ {fmtIg(v.views)}</span>
          <span className="chip">📅 {kdate(v.takenAt)}</span>
          <span className="chip handle">@{owner}</span>
        </div>
      </a>
      <button type="button" className="chip copy" onClick={() => onCopy(v.url)}>
        ⧉ 복사
      </button>

      <div className="ig-acts">
        <span className="act">
          <Icon.Heart size={24} />
          {fmtIg(v.likes)}
        </span>
        <span className="act">
          <Icon.Comment size={24} />
          {fmtIg(v.comments)}
        </span>
        <span className="act">
          <Icon.Share size={24} />
          공유
        </span>
        <span className="act right">
          <Icon.Bookmark size={24} />
        </span>
      </div>
      <a className="ig-cap" href={v.url} target="_blank" rel="noopener noreferrer">
        <b>{owner}</b> {caption || <span className="muted">캡션 없음</span>}
      </a>
      <div className="ig-code">
        {v.shortcode} · 인스타그램에서 열기 ↗
      </div>
    </article>
  );
}
