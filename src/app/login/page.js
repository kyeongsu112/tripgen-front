// src/app/login/page.js
"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// Supabase 클라이언트 설정
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 이메일 로그인/가입 핸들러
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const func = isLoginMode ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await func({ email, password });
    
    if (error) {
      alert("오류: " + error.message);
    } else {
      if (!isLoginMode) {
        alert("가입 성공! 자동 로그인됩니다.");
        router.push("/"); // 가입 후 홈으로
      } else {
        router.push("/"); // 로그인 후 홈으로
        router.refresh();
      }
    }
    setLoading(false);
  };

  // 소셜 로그인 핸들러
  const handleSocialLogin = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) alert("소셜 로그인 오류: " + error.message);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-800">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-blue-600 mb-2 cursor-pointer" onClick={() => router.push('/')}>
            ✈️ TripGen
          </h1>
          <h2 className="text-xl font-bold text-gray-700">
            {isLoginMode ? "로그인" : "회원가입"}
          </h2>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input 
            type="email" placeholder="이메일" className="w-full border p-3 rounded-lg"
            value={email} onChange={e => setEmail(e.target.value)} required 
          />
          <input 
            type="password" placeholder="비밀번호" className="w-full border p-3 rounded-lg"
            value={password} onChange={e => setPassword(e.target.value)} required 
          />
          <button disabled={loading} className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700">
            {loading ? "처리 중..." : (isLoginMode ? "로그인하기" : "가입하기")}
          </button>
        </form>

        <div className="mt-6">
          <button onClick={() => handleSocialLogin("google")} className="w-full border p-3 rounded-lg font-bold flex justify-center items-center gap-2 hover:bg-gray-50">
            <span>🇬</span> Google로 계속하기
          </button>
        </div>

        <p className="text-center mt-6 text-sm text-gray-500 cursor-pointer hover:text-blue-600" onClick={() => setIsLoginMode(!isLoginMode)}>
          {isLoginMode ? "계정이 없으신가요? 회원가입" : "로그인하러 가기"}
        </p>
      </div>
    </div>
  );
}