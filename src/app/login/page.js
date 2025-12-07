"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

// Supabase 클라이언트 설정
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState("login"); // 'signup' | 'login'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // 네비게이션 핸들러
  const handleNav = (path) => {
    if (path === '/?view=mytrip') {
      alert("로그인이 필요한 서비스입니다.");
      return;
    }
    router.push(path);
  };

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

      // 탈퇴 후 30일 재가입 차단 체크
      try {
        const checkRes = await fetch("https://tripgen-server.onrender.com/api/auth/check-deleted", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        const checkData = await checkRes.json();
        if (checkData.blocked) {
          setMessage(checkData.message);
          return;
        }
      } catch (err) {
        console.error("Check deleted error:", err);
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage("회원가입이 완료되었습니다. 이메일 확인 후 로그인해주세요.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
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
          redirectTo: `${window.location.origin}/auth/callback`,
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
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col transition-colors">

      {/* ✨ 헤더 (다크모드 적용) */}
      <Header showUserControls={false} />

      {/* 메인 컨텐츠 */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          <div className="text-center mb-10">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-rose-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-rose-200 dark:shadow-none">
                ✈️
              </div>
            </div>
            <h1 className="text-3xl font-black text-foreground mb-2 tracking-tight">
              TripGen
            </h1>
            <p className="text-foreground/60 text-lg font-medium">
              {mode === 'login' ? '여행의 시작, 여기서부터.' : '완벽한 여행을 위한 첫 걸음.'}
            </p>
          </div>

          <div className="bg-card rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-border p-8 md:p-10 transition-colors">

            {/* 모드 토글 */}
            <div className="flex mb-8 bg-secondary p-1 rounded-xl">
              <button
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === "login"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-foreground/60 hover:text-foreground"
                  }`}
                onClick={() => { setMode("login"); setMessage(null); }}
              >
                로그인
              </button>
              <button
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === "signup"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-foreground/60 hover:text-foreground"
                  }`}
                onClick={() => { setMode("signup"); setMessage(null); }}
              >
                회원가입
              </button>
            </div>

            {/* 이메일 폼 */}
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground/60 uppercase tracking-wider ml-1">이메일</label>
                <input
                  type="email"
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:bg-card text-foreground transition-all"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground/60 uppercase tracking-wider ml-1">비밀번호</label>
                <input
                  type="password"
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:bg-card text-foreground transition-all"
                  placeholder="8자 이상 입력"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-rose-100 dark:shadow-none transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                {loading ? "처리 중..." : (mode === "login" ? "로그인하기" : "가입하기")}
              </button>
            </form>

            {/* 구분선 */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-4 text-foreground/40 font-medium">또는</span>
              </div>
            </div>

            {/* 구글 로그인 버튼 */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-card border border-border hover:bg-secondary text-foreground font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-3"
            >
              <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" alt="Google" className="w-5 h-5" />
              <span>Google 계정으로 계속하기</span>
            </button>

            {message && (
              <div className={`mt-6 p-4 rounded-xl text-sm font-medium text-center ${message.includes('오류') ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : message.includes('30일') || message.includes('재가입') ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'}`}>
                {message}
              </div>
            )}
          </div>

          <p className="text-center mt-8 text-xs text-foreground/40">
            {mode === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
            <span
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(null); }}
              className="ml-2 text-foreground font-bold cursor-pointer hover:underline"
            >
              {mode === 'login' ? '회원가입' : '로그인'}
            </span>
          </p>
        </div>
      </main>

      <footer className="py-8 text-center text-foreground/40 text-xs border-t border-border">
        © 2025 TripGen Inc. All rights reserved.
      </footer>
    </div>
  );
}