// src/app/login/page.js
"use client";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// Supabase 클라이언트 설정
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LoginPage() {
  const router = useRouter();

  // --- 소셜 로그인 핸들러 ---
  const handleSocialLogin = async (provider) => {
    
    // [핵심 수정] 카카오에게 요청할 권한 범위를 명시적으로 지정
    // (account_email과 충돌하는 'profile' 범위를 제거)
    const kakaoScopes = 'profile_nickname profile_image'; // 요청할 두 항목

    const options = {
      redirectTo: window.location.origin,
      // provider가 카카오일 때만 명시적 범위 사용, 구글은 기본 범위 사용
      scopes: provider === 'kakao' ? kakaoScopes : undefined 
    };

    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: options,
    });
    
    if (error) alert("로그인 오류: " + error.message);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-800">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-gray-100 text-center">
        
        {/* 헤더 영역 */}
        <div className="mb-10">
          <h1 
            className="text-4xl font-extrabold text-blue-600 mb-3 cursor-pointer hover:scale-105 transition transform" 
            onClick={() => router.push('/')}
          >
            ✈️ TripGen
          </h1>
          <h2 className="text-lg font-medium text-gray-500">
            여행을 시작하는 가장 쉬운 방법
          </h2>
        </div>

        {/* 소셜 로그인 버튼 영역 */}
        <div className="space-y-4">
          
          {/* 🟡 카카오 로그인 버튼 */}
          <button
            onClick={() => handleSocialLogin("kakao")}
            className="w-full bg-[#FEE500] text-[#391B1B] p-4 rounded-xl font-bold flex items-center justify-center hover:shadow-md transition transform hover:-translate-y-0.5"
          >
            <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C5.373 3 0 6.627 0 11.1c0 2.838 2.168 5.365 5.488 6.78a.89.89 0 0 0 .582.06l3.266.77a.39.39 0 0 0 .433-.53l-.774-2.87a.6.6 0 0 1 .056-.56A9.8 9.8 0 0 0 12 13.8c6.627 0 12-3.627 12-8.1S18.627 3 12 3z"/>
            </svg>
            카카오로 3초 만에 시작하기
          </button>

          {/* ⚪ 구글 로그인 버튼 */}
          <button
            onClick={() => handleSocialLogin("google")}
            className="w-full bg-white border border-gray-200 text-gray-700 p-4 rounded-xl font-bold flex items-center justify-center hover:bg-gray-50 hover:shadow-md transition transform hover:-translate-y-0.5"
          >
             <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google로 계속하기
          </button>
        </div>

        <p className="text-center mt-8 text-xs text-gray-400">
          로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}