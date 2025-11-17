// src/app/login/page.js
"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// 1. Supabase 클라이언트 설정
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LoginPage() {
  // --- 상태 관리 ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true); // true: 로그인, false: 회원가입
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // --- 이메일 로그인/가입 핸들러 ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 로그인 모드에 따라 함수 결정
    const func = isLoginMode ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    
    const { error } = await func({ email, password });
    
    if (error) {
      alert("오류 발생: " + error.message);
    } else {
      if (!isLoginMode) {
        alert("가입이 완료되었습니다! 로그인을 진행해주세요.");
        setIsLoginMode(true); // 가입 성공 시 로그인 모드로 전환
      } else {
        // 로그인 성공 시 홈으로 이동 및 새로고침
        router.push("/"); 
        router.refresh();
      }
    }
    setLoading(false);
  };

  // --- 소셜 로그인 핸들러 ---
  const handleSocialLogin = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: window.location.origin, // 로그인 완료 후 돌아올 주소
      },
    });
    if (error) alert("소셜 로그인 오류: " + error.message);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-800">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg">
        
        {/* 헤더 영역 */}
        <div className="text-center mb-8">
          <h1 
            className="text-3xl font-extrabold text-blue-600 mb-2 cursor-pointer hover:opacity-80 transition" 
            onClick={() => router.push('/')}
          >
            ✈️ TripGen
          </h1>
          <h2 className="text-xl font-bold text-gray-700">
            {isLoginMode ? "다시 오셨군요!" : "여행의 시작"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isLoginMode ? "로그인하여 나만의 여행을 계획하세요." : "회원가입하고 여행 일정을 저장하세요."}
          </p>
        </div>

        {/* 이메일 폼 */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="이메일 주소"
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="비밀번호 (6자리 이상)"
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {loading ? "처리 중..." : (isLoginMode ? "로그인" : "회원가입")}
          </button>
        </form>

        {/* 구분선 */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">또는</span>
          </div>
        </div>

        {/* 구글 로그인 버튼 */}
        <button
          onClick={() => handleSocialLogin("google")}
          className="w-full border border-gray-300 p-3 rounded-lg font-bold text-gray-700 flex items-center justify-center hover:bg-gray-50 transition"
        >
          {/* 구글 아이콘 (텍스트 대체 가능) */}
          <span className="mr-2 text-xl">🇬</span> 
          Google로 계속하기
        </button>

        {/* 모드 전환 링크 */}
        <p className="text-center mt-8 text-sm text-gray-500">
          {isLoginMode ? "계정이 없으신가요? " : "이미 계정이 있으신가요? "}
          <button 
            className="text-blue-600 font-bold hover:underline ml-1"
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setEmail("");
              setPassword("");
            }}
          >
            {isLoginMode ? "회원가입" : "로그인"}
          </button>
        </p>

      </div>
    </div>
  );
}