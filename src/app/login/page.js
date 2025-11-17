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
  const router = useRouter();

  const [mode, setMode] = useState("signup"); // 'signup' | 'login'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // --- 이메일 회원가입 / 로그인 ---
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!email || !password) {
        setMessage("이메일과 비밀번호를 입력해 주세요.");
        return;
      }

      if (mode === "signup") {
        // 회원가입
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          // 이메일 확인을 켜두었다면 redirect 주소 지정
          // options: { emailRedirectTo: `${window.location.origin}` },
        });

        if (error) throw error;

        // 이메일 확인 OFF라면 바로 로그인된 상태, ON이면 메일 확인 안내
        setMessage(
          "회원가입이 완료되었습니다. 설정에 따라 이메일 확인이 필요할 수 있습니다."
        );
        router.push("/"); // 로그인 후 메인으로 이동
      } else {
        // 로그인
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setMessage("로그인에 성공했습니다.");
        router.push("/");
      }
    } catch (err) {
      console.error(err);
      setMessage("오류: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- (선택) 구글 소셜 로그인 ---
  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error(err);
      setMessage("구글 로그인 오류: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-800">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-gray-100 text-center">
        {/* 헤더 영역 */}
        <div className="mb-10">
          <h1
            className="text-4xl font-extrabold text-blue-600 mb-3 cursor-pointer hover:scale-105 transition transform"
            onClick={() => router.push("/")}
          >
            ✈️ TripGen
          </h1>
          <h2 className="text-lg font-medium text-gray-500">
            여행을 시작하는 가장 쉬운 방법
          </h2>
        </div>

        {/* 모드 토글 */}
        <div className="flex justify-center mb-6 text-sm">
          <button
            className={`px-4 py-2 rounded-l-full border border-gray-200 ${
              mode === "signup" ? "bg-blue-50 text-blue-600 font-semibold" : "bg-white"
            }`}
            onClick={() => setMode("signup")}
          >
            회원가입
          </button>
          <button
            className={`px-4 py-2 rounded-r-full border border-gray-200 border-l-0 ${
              mode === "login" ? "bg-blue-50 text-blue-600 font-semibold" : "bg-white"
            }`}
            onClick={() => setMode("login")}
          >
            로그인
          </button>
        </div>

        {/* 이메일 폼 */}
        <form onSubmit={handleEmailSubmit} className="space-y-4 text-left mb-6">
          <div>
            <label className="block text-sm mb-1">이메일</label>
            <input
              type="email"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">비밀번호</label>
            <input
              type="password"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="8자 이상 비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 transition transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {loading
              ? "처리 중..."
              : mode === "signup"
              ? "이메일로 회원가입"
              : "이메일로 로그인"}
          </button>
        </form>

        {/* 구분선 */}
        <div className="flex items-center my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="px-3 text-xs text-gray-400">또는</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* (선택) 구글 로그인 버튼 */}
        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white border border-gray-200 text-gray-700 p-4 rounded-xl font-bold flex items-center justify-center hover:bg-gray-50 hover:shadow-md transition transform hover:-translate-y-0.5"
            disabled={loading}
          >
            <svg
              className="w-6 h-6 mr-3"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google로 계속하기
          </button>
        </div>

        {message && (
          <p className="mt-6 text-xs text-gray-500 whitespace-pre-line">{message}</p>
        )}

        <p className="text-center mt-6 text-xs text-gray-400">
          로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}
