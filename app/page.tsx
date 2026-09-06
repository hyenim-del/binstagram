import { redirect } from "next/navigation";

/** 처음 온 사람이 무엇인지 알 수 있게 사용 설명서로 보낸다(2026-09-06). 작업 화면은 메뉴·아래 바에서 한 번에 간다 */
export default function Home() {
  redirect("/steps");
}
