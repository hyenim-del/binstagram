export type NavItem = { href: string; label: string; icon: "steps" | "globe" | "film" | "ref" | "convert"; /** 바로 위 항목의 하위 메뉴로 들여쓰기 */ sub?: boolean };
export type NavGroup = { title?: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  { items: [{ href: "/steps", label: "사용 설명서", icon: "steps" }] },
  {
    title: "제작 도구",
    items: [
      { href: "/overseas-reference", label: "해외 레퍼런스 찾기", icon: "globe" },
      { href: "/link-videos", label: "링크로 찾은 영상", icon: "film", sub: true }, // 해외 레퍼런스 찾기 안 「링크로 찾기」의 결과
      { href: "/reference-script", label: "레퍼런스 대본 확보", icon: "ref" },
      { href: "/reference-convert", label: "레퍼런스 대본 변환", icon: "convert" },
    ],
  },
];
