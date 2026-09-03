import { NextResponse } from "next/server";
import { MAX_BYTES } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST { url, name }  →  영상 파일(mp4) 그대로
 *
 * 「링크로 찾은 영상」에서 「선택」한 영상을 「레퍼런스 대본 확보」에 올리기 위해
 * 인스타그램 CDN 의 mp4 를 서버가 대신 받아 브라우저로 넘긴다(브라우저에서 직접 받으면 CORS 로 막힘).
 * 인스타그램 CDN 주소만 허용하고, 대본 확보의 파일 한도(25MB)를 넘으면 거절한다.
 */
const ALLOWED_HOST = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/i;

export async function POST(req: Request) {
  let body: { url?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 잘못됐어요" }, { status: 400 });
  }
  let u: URL;
  try {
    u = new URL(body.url || "");
  } catch {
    return NextResponse.json({ error: "영상 주소가 없어요" }, { status: 400 });
  }
  if (u.protocol !== "https:" || !ALLOWED_HOST.test(u.hostname)) {
    return NextResponse.json({ error: "인스타그램 영상 주소만 받을 수 있어요" }, { status: 400 });
  }
  try {
    const res = await fetch(u, { headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(90_000) });
    if (!res.ok) {
      return NextResponse.json({ error: res.status === 403 || res.status === 410 ? "영상 주소가 만료됐어요 — 링크를 다시 넣어주세요" : `영상을 받지 못했어요 (${res.status})` }, { status: 502 });
    }
    const len = Number(res.headers.get("content-length") || 0);
    if (len > MAX_BYTES) return NextResponse.json({ error: `영상이 ${Math.round(len / 1024 / 1024)}MB 라 25MB 한도를 넘어요` }, { status: 413 });
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) return NextResponse.json({ error: "영상이 25MB 한도를 넘어요" }, { status: 413 });
    const name = (body.name || "instagram.mp4").replace(/[^\w.-]+/g, "_");
    return new NextResponse(buf, {
      headers: {
        "content-type": res.headers.get("content-type") || "video/mp4",
        "content-length": String(buf.byteLength),
        "content-disposition": `inline; filename="${name}"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `영상을 받지 못했어요: ${msg}` }, { status: 502 });
  }
}
