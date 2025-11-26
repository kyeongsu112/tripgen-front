import "./globals.css";
import { Inter } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  metadataBase: new URL('https://tripgen.app'), // 실제 도메인 입력
  title: {
    default: 'TripGen - AI 여행 일정 플래너',
    template: '%s | TripGen',
  },
  description: 'AI가 1분 만에 만들어주는 최적의 여행 경로와 일정. 복잡한 계획 없이 떠나세요.',
  keywords: ['TripGen', '트립젠', 'AI 여행', '여행 일정', '여행 계획', 'J같은 P', '여행 플래너'],
  authors: [{ name: 'TripGen Team' }],
  creator: 'TripGen',
  publisher: 'TripGen',
  openGraph: {
    title: 'TripGen - AI 여행 일정 플래너',
    description: '어디로 떠나시나요? AI가 완벽한 여행 일정을 계획해드립니다.',
    url: 'https://tripgen.app',
    siteName: 'TripGen',
    locale: 'ko_KR',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico', // favicon이 public 폴더에 있어야 함
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1053308341441139"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />


        {/* 구글 애드센스 스크립트 (퍼블리셔ID 사용) */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1053308341441139"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${inter.className} bg-background text-foreground transition-colors duration-300`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
