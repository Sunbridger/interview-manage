import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileTabBar } from "@/components/layout/MobileTabBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "前端 AI Agent 面试知识库",
  description: "整理、查看、检索前端与 AI Agent 相关面试题，辅助复习",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 pb-14 lg:pb-0">
          <Header />
          <main className="flex-1 p-4 lg:p-8 overflow-auto">
            {children}
          </main>
        </div>
        <MobileTabBar />
      </body>
    </html>
  );
}
