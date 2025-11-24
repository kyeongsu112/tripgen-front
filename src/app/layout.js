import './globals.css'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { ThemeProvider } from '@/components/ThemeProvider' // 다크모드 설정 유지

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'TripGen - AI 여행 일정 플래너',
  description: 'AI가 만들어주는 최적의 여행 경로와 일정',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* 구글 애드센스 스크립트 (올바른 ID 적용됨) */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1053308341441139"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${inter.className} bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-300`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}