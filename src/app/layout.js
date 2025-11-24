import './globals.css'
import { Inter } from 'next/font/google'
import Script from 'next/script' // ✨ [추가 1] Script 컴포넌트 불러오기

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'TripGen - AI 여행 일정 플래너',
  description: 'AI가 만들어주는 최적의 여행 경로와 일정',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1053308341441139"
     crossorigin="anonymous"></script>}
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_ID_HERE`} // ⚠️ 여기에 본인의 ca-pub- ID를 넣으세요
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}