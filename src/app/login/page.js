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
    <div className="min-h-screen bg-background text-foreground dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100 flex flex-col transition-colors">
      
      {/* ✨ 헤더 (다크모드 적용) */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 h-16 md:h-20 flex items-center transition-colors">
        <div className="max-w-7xl mx-auto px-4 md:px-6 w-full flex justify-between items-center">
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
              <span className="text-2xl md:text-3xl text-rose-500">✈️</span>
              <span className="text-lg md:text-xl font-extrabold tracking-tight text-rose-500">TripGen</span>
            </div>
            
            {/* 데스크톱 메뉴 */}
            <div className="hidden md:flex items-center gap-3">
              <div className="flex gap-1 bg-slate-100/80 dark:bg-slate-800 p-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                  <button onClick={() => handleNav('/?view=home')} className="px-5 py-2 rounded-full text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all">일정 생성</button>
                  <button onClick={() => handleNav('/?view=mytrip')} className="px-5 py-2 rounded-full text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all">보관함</button>
              </div>
              <div className="flex gap-1 bg-slate-100/80 dark:bg-slate-800 p-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                  <button onClick={() => router.push('/community')} className="px-5 py-2 rounded-full text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all">공유게시판</button>
                  <button onClick={() => router.push('/board')} className="px-5 py-2 rounded-full text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all">건의함</button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 모바일 메뉴 */}
            <div className="flex md:hidden gap-1 mr-1">
               <button onClick={() => handleNav('/?view=home')} className="text-xs font-bold px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">생성</button>
               <button onClick={() => handleNav('/?view=mytrip')} className="text-xs font-bold px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">보관</button>
               <button onClick={() => router.push('/community')} className="text-xs font-bold px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">공유</button>
               <button onClick={() => router.push('/board')} className="text-xs font-bold px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">건의</button>
            </div>
          </div>
        </div>
      </nav>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
              {mode === 'login' ? '다시 만나서 반가워요!' : '여행의 시작,'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              {mode === 'login' ? 'TripGen으로 여행을 계속하세요.' : 'TripGen과 함께 완벽한 일정을 만들어보세요.'}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-100 dark:border-slate-700 p-8 md:p-10 transition-colors">
            
            {/* 모드 토글 */}
            <div className="flex mb-8 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl">
              <button
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                  mode === "login" 
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
                onClick={() => { setMode("login"); setMessage(null); }}
              >
                로그인
              </button>
              <button
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                  mode === "signup" 
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
                onClick={() => { setMode("signup"); setMessage(null); }}
              >
                회원가입
              </button>
            </div>

            {/* 이메일 폼 */}
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">이메일</label>
                <input
                  type="email"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 focus:bg-white dark:focus:bg-slate-950 text-slate-900 dark:text-white transition-all"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">비밀번호</label>
                <input
                  type="password"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 focus:bg-white dark:focus:bg-slate-950 text-slate-900 dark:text-white transition-all"
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
                <div className="w-full border-t border-slate-200 dark:border-slate-600"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-slate-800 px-4 text-slate-400 font-medium">또는</span>
              </div>
            </div>

            {/* 구글 로그인 버튼 */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-3"
            >
              {/* 로컬 이미지 사용 (다크모드에서도 잘 보이도록 배경 조정은 불필요) */}
              <img src="/google.svg" alt="Google" className="w-5 h-5" />
              <span>Google 계정으로 계속하기</span>
            </button>

            {message && (
              <div className={`mt-6 p-4 rounded-xl text-sm font-medium text-center ${message.includes('오류') ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'}`}>
                {message}
              </div>
            )}
          </div>

          <p className="text-center mt-8 text-xs text-slate-400">
            {mode === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'} 
            <span 
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(null); }}
              className="ml-2 text-slate-800 dark:text-slate-300 font-bold cursor-pointer hover:underline"
            >
              {mode === 'login' ? '회원가입' : '로그인'}
            </span>
          </p>
        </div>
      </main>

      <footer className="py-8 text-center text-slate-400 text-xs border-t border-slate-50 dark:border-slate-800">
        © 2025 TripGen Inc. All rights reserved.
      </footer>
    </div>
  );
}