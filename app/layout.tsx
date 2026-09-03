import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { TopBar } from "@/components/shell/TopBar";
import { Sidebar } from "@/components/shell/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "BinStaGram",
  description: "레퍼런스 영상의 음성을 글로 변환해 타임코드 대본을 만듭니다.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <ToastProvider>
          <div className="app">
            <TopBar />
            <div className="body">
              <Sidebar />
              <main className="workspace">{children}</main>
            </div>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
