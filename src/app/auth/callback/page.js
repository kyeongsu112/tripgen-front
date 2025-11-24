"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Supabase가 URL의 해시(#) 토큰을 자동으로 감지하고 세션을 설정합니다.
    const handleAuth = async () => {
      // 잠시 대기 후 세션 확인
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // 로그인 성공 시 메인으로 이동
        router.replace("/"); 
      } else {
        // 세션이 바로 안 잡히면 이벤트 리스너 등록
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session) {
            router.replace("/");
          }
        });
        return () => subscription.unsubscribe();
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="animate-bounce text-4xl mb-4">✈️</div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">로그인 중입니다...</h2>
      <p className="text-slate-500 text-sm">잠시만 기다려주세요.</p>
    </div>
  );
}