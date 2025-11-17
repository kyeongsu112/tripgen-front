// src/app/login/page.js
"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// Supabase 설정
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);
  const router = useRouter();

  const handleAuth = async (e) => {
    e.preventDefault();
    const func = isLoginMode ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    
    const { error } = await func({ email, password });
    
    if (error) {
      alert(error.message);
    } else {
      if (!isLoginMode) alert("가입 성공! 로그인해주세요.");
      else {
        // 로그인 성공 시 홈으로 이동
        router.push("/"); 
        router.refresh(); // 상태 갱신
      }
    }
  };

  const handleSocialLogin = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) alert(error.message);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-blue-600 mb-2 cursor-pointer" onClick={() => router.push('/')}>
            ✈️ TripGen
          </h1>
          <h2 className="text-xl font-bold text-gray-800">
            {isLoginMode ? "다시 오셨군요!" : "여행을 시작해보세요"}
          </h2>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email" placeholder="이메일"
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={email} onChange={e => setEmail(e.target.value)} required
          />
          <input
            type="password" placeholder="비밀번호"
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={password} onChange={e => setPassword(e.target.value)} required
          />
          <button className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition">
            {isLoginMode ? "로그인" : "회원가입"}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
          <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">또는</span></div>
        </div>

        <button
          onClick={() => handleSocialLogin("google")}
          className="w-full border border-gray-300 p-3 rounded-lg font-bold text-gray-700 flex items-center justify-center hover:bg-gray-50 transition"
        >
          <span className="mr-2">🇬</span> Google로 계속하기
        </button>

        <p className="text-center mt-6 text-sm text-gray-500 cursor-pointer hover:text-blue-600" onClick={() => setIsLoginMode(!isLoginMode)}>
          {isLoginMode ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
        </p>
      </div>
    </div>
  );
}