"use client";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LoginPage() {
  const router = useRouter();

  const handleSocialLogin = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) alert("로그인 오류: " + error.message);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-800">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-gray-100 text-center">
        
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-blue-600 mb-3 cursor-pointer" onClick={() => router.push('/')}>
            ✈️ TripGen
          </h1>
          <h2 className="text-lg font-medium text-gray-500">여행을 시작하는 가장 쉬운 방법</h2>
        </div>

        <div className="space-y-4">
          {/* 카카오 로그인 */}
          <button onClick={() => handleSocialLogin("kakao")} className="w-full bg-[#FEE500] text-[#391B1B] p-4 rounded-xl font-bold flex items-center justify-center hover:shadow-md transition transform hover:-translate-y-0.5">
            <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C5.373 3 0 6.627 0 11.1c0 2.838 2.168 5.365 5.488 6.78a.89.89 0 0 0 .582.06l3.266.77a.39.39 0 0 0 .433-.53l-.774-2.87a.6.6 0 0 1 .056-.56A9.8 9.8 0 0 0 12 13.8c6.627 0 12-3.627 12-8.1S18.627 3 12 3z"/></svg>
            카카오로 3초 만에 시작하기
          </button>

          {/* 구글 로그인 */}
          <button onClick={() => handleSocialLogin("google")} className="w-full bg-white border border-gray-200 text-gray-700 p-4 rounded-xl font-bold flex items-center justify-center hover:bg-gray-50 hover:shadow-md transition transform hover:-translate-y-0.5">
             <span className="mr-3 text-xl">🇬</span> Google로 계속하기
          </button>
        </div>

        <p className="mt-8 text-xs text-gray-400">로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.</p>
      </div>
    </div>
  );
}