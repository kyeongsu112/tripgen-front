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

  const [mode, setMode] = useState("login"); // 'signup' | 'login' (기본값을 login으로 변경)
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
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        setMessage(
          "회원가입이 완료되었습니다. 이메일 확인 후 로그인해주세요."
        );
        setMode("login"); // 가입 후 로그인 모드로 전환
      } else {
        // 로그인
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // setMessage("로그인에 성공했습니다."); // 바로 이동하므로 생략 가능
        router.push("/");
      }
    } catch (err) {
      console.error(err);
      setMessage("오류: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- 구글 소셜 로그인 ---
  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`, // 리다이렉트 URL 명시
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
    <div className="min-h-screen bg-white font-sans text-slate-800 flex flex-col">
      
      {/* 헤더 (심플) */}
      <nav className="w-full px-6 h-20 flex items-center border-b border-slate-100">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-3xl text-rose-500">✈️</span>
            <span className="text-xl font-bold text-rose-500 tracking-tight">TripGen</span>
          </div>
        </div>
      </nav>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-slate-900 mb-3">
              {mode === 'login' ? '다시 만나서 반가워요!' : '여행의 시작,'}
            </h1>
            <p className="text-slate-500 text-lg">
              {mode === 'login' ? 'TripGen으로 여행을 계속하세요.' : 'TripGen과 함께 완벽한 일정을 만들어보세요.'}
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-100 p-8 md:p-10">
            
            {/* 모드 토글 (탭 스타일) */}
            <div className="flex mb-8 bg-slate-100 p-1 rounded-xl">
              <button
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                  mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => { setMode("login"); setMessage(null); }}
              >
                로그인
              </button>
              <button
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                  mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => { setMode("signup"); setMessage(null); }}
              >
                회원가입
              </button>
            </div>

            {/* 이메일 폼 */}
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">이메일</label>
                <input
                  type="email"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">비밀번호</label>
                <input
                  type="password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                  placeholder="8자 이상 입력"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-rose-100 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                {loading ? "처리 중..." : (mode === "login" ? "로그인하기" : "가입하기")}
              </button>
            </form>

            {/* 구분선 */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-4 text-slate-400 font-medium">또는</span>
              </div>
            </div>

            {/* 구글 로그인 버튼 */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-3"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              <span>Google 계정으로 계속하기</span>
            </button>

            {message && (
              <div className={`mt-6 p-4 rounded-xl text-sm font-medium text-center ${message.includes('오류') ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                {message}
              </div>
            )}
          </div>

          <p className="text-center mt-8 text-xs text-slate-400">
            {mode === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'} 
            <span 
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(null); }}
              className="ml-2 text-slate-800 font-bold cursor-pointer hover:underline"
            >
              {mode === 'login' ? '회원가입' : '로그인'}
            </span>
          </p>
        </div>
      </main>

      <footer className="py-8 text-center text-slate-400 text-xs border-t border-slate-50">
        © 2025 TripGen Inc. All rights reserved.
      </footer>
    </div>
  );
}