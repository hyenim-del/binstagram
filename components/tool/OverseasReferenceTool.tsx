"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { LinkFind } from "./LinkFind";
import { REFERENCES, STRENGTH_BADGE, keywordMatches, ownerUrl, type RefKeyword } from "@/lib/references";

const GROUPS: { title: string; group: RefKeyword["group"] }[] = [
  { title: "주부 타겟", group: "주부" },
  { title: "자영업자 타겟", group: "자영업자" },
];

const pad = (n: number) => String(n).padStart(2, "0");

export function OverseasReferenceTool() {
  const toast = useToast();
  const [link, setLink] = useState("");
  const [q, setQ] = useState("");
  const [cur, setCur] = useState(REFERENCES.keywords[0].id);

  const totals = useMemo(
    () => ({
      creators: REFERENCES.keywords.reduce((n, k) => n + k.creators.length, 0),
      posts: REFERENCES.keywords.reduce((n, k) => n + k.hashtag.posts.length, 0),
    }),
    [],
  );
  const filtered = useMemo(() => REFERENCES.keywords.filter((k) => keywordMatches(k, q)), [q]);
  const k = REFERENCES.keywords.find((x) => x.id === cur) ?? REFERENCES.keywords[0];
  const hg = k.hashtag;

  function fillLink(url: string) {
    setLink(url);
    document.getElementById("link-find-input")?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast("링크로 찾기 칸에 넣었어요", "ok");
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast("링크를 복사했어요", "ok");
    } catch {
      toast("복사하지 못했어요. 「열기」로 이동해 주소를 복사해 주세요", "error");
    }
  }

  return (
    <div className="ref-page">
      <LinkFind value={link} onChange={setLink} />

      <div className="ref-cols">
        <section className="panel ref-left">
          <div>
            <h2 className="tool-title">해외 레퍼런스 찾기</h2>
            <div className="tool-sub">
              키워드 {REFERENCES.keywords.length}개 · 해외 계정 <b>{totals.creators}</b> · 확인한 게시물 <b>{totals.posts}</b>
            </div>
          </div>
          <label className="ref-search">
            <Icon.Search size={16} />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="키워드·해시태그·계정 검색" aria-label="키워드 검색" />
          </label>
          <div className="kwlist">
            {GROUPS.map(({ title, group }) => {
              const ks = filtered.filter((x) => x.group === group);
              if (!ks.length) return null;
              return (
                <div key={group}>
                  <div className="kwgroup">
                    <span>{title}</span>
                    <span>{ks.length}</span>
                  </div>
                  {ks.map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      className={`kw${x.id === cur ? " active" : ""}`}
                      onClick={() => setCur(x.id)}
                      aria-current={x.id === cur ? "true" : undefined}
                    >
                      <span className="n">{pad(x.id)}</span>
                      <span>{x.ko}</span>
                      <span className="kw-right">
                        <span className="cnt">{x.creators.length}</span>
                        <i className={`dot s-${x.hashtag.strength}`} title={x.hashtag.label} />
                      </span>
                    </button>
                  ))}
                </div>
              );
            })}
            {!filtered.length && <div className="empty ref-empty">일치하는 키워드가 없어요</div>}
          </div>
        </section>

        <section className="ref-right">
          <section className="panel">
            <div className="ref-head">
              <div>
                <div className="kn">
                  KEYWORD {pad(k.id)} · {k.group} 타겟
                </div>
                <h2>{k.ko}</h2>
                <div className="tagrow">
                  {k.tags.map((t) => (
                    <span key={t} className="tagchip">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="verdict">
                <span className={`badge ${STRENGTH_BADGE[hg.strength]}`}>
                  <i className={`dot s-${hg.strength} dot-inline`} />
                  {hg.label}
                </span>
                <span className="tiny muted">검색어 {hg.query}</span>
              </div>
            </div>
            <p className="ref-note">{hg.note}</p>
          </section>

          <section>
            <div className="sec">
              <h3>해외 계정 {k.creators.length}</h3>
              <span>웹검색 · 프로필 메타 기준 팔로워 · 국내 계정 제외</span>
            </div>
            {k.creators.length ? (
              <div className="ref-grid">
                {k.creators.map((c) => (
                  <div className="ref-card" key={c.handle}>
                    <div className="h">
                      <span className="handle">
                        @{c.handle}
                        {c.name && <small>{c.name}</small>}
                      </span>
                      {c.aux && <span className="badge">보조</span>}
                    </div>
                    <div className="meta">
                      {c.country && <span>{c.country}</span>}
                      {c.followers && (
                        <span>
                          팔로워 <b>{c.followers}</b>
                        </span>
                      )}
                      {c.format && <span>{c.format}</span>}
                    </div>
                    <p>{c.desc || "설명 없음"}</p>
                    <div className="foot">
                      <a className="btn" href={c.url} target="_blank" rel="noopener noreferrer">
                        프로필 열기
                      </a>
                      <button type="button" className="btn primary" onClick={() => fillLink(c.url)} title="이 계정 링크를 위 「링크로 찾기」 칸에 넣어요">
                        <Icon.Link size={14} /> 프로필 링크 넣기
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty ref-empty">계정 자료 없음</div>
            )}
          </section>

          <section>
            <div className="sec">
              <h3>해시태그 상위 게시물 {hg.posts.length}</h3>
              <span>
                인스타그램 검색 {hg.query} · {REFERENCES.generatedAt}
              </span>
            </div>
            {hg.posts.length ? (
              <div className="ref-table">
                <table>
                  <thead>
                    <tr>
                      <th>작성자 · 게시물</th>
                      <th>반응</th>
                      <th>내용</th>
                      <th>링크로 찾기에 넣기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hg.posts.map((p) => {
                      const ou = ownerUrl(p.owner);
                      return (
                        <tr key={p.shortcode}>
                          <td>
                            {ou ? (
                              <a className="owner" href={ou} target="_blank" rel="noopener noreferrer">
                                @{p.owner}
                              </a>
                            ) : (
                              <span className="muted">{p.owner}</span>
                            )}
                            <div className="sc">{p.shortcode}</div>
                          </td>
                          <td className="num">{p.metric}</td>
                          <td>{p.desc}</td>
                          <td>
                            <div className="acts">
                              <button type="button" className="btn primary" onClick={() => fillLink(p.url)}>
                                링크 넣기
                              </button>
                              <button type="button" className="btn" onClick={() => copy(p.url)}>
                                복사
                              </button>
                              <a className="btn ghost" href={p.url} target="_blank" rel="noopener noreferrer">
                                열기
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty ref-empty">이 해시태그는 확인할 만한 게시물이 없었어요. 위 계정 목록의 릴스 탭을 보세요.</div>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}
