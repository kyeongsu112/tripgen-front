"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const API_BASE_URL = "https://tripgen-server.onrender.com/api";

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState("loading"); // loading, blocked, success
  const [blockMessage, setBlockMessage] = useState("");

  useEffect(() => {
    const handleAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // 탈퇴 후 30일 재가입 차단 체크
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/check-deleted`, {
            email: session.user.email
          });

          if (res.data.blocked) {
            // 차단된 경우: 로그아웃 후 메시지 표시
            await supabase.auth.signOut();
            setStatus("blocked");
            setBlockMessage(res.data.message);
            return;
          }
        } catch (err) {
          console.error("Check deleted error:", err);
          // API 실패 시 그냥 진행
        }

        setStatus("success");
        router.replace("/");
      } else {
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === "SIGNED_IN" && session) {
            // 탈퇴 후 30일 재가입 차단 체크
            try {
              const res = await axios.post(`${API_BASE_URL}/auth/check-deleted`, {
                email: session.user.email
              });

              if (res.data.blocked) {
                await supabase.auth.signOut();
                setStatus("blocked");
                setBlockMessage(res.data.message);
                return;
              }
            } catch (err) {
              console.error("Check deleted error:", err);
            }

            setStatus("success");
            router.replace("/");
          }
        });

        return () => subscription.unsubscribe();
      }
    };

    handleAuth();
  }, [router]);

  // 차단된 경우
  if (status === "blocked") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground transition-colors px-6">
        <div className="text-6xl mb-6">🚫</div>
        <h2 className="text-2xl font-black mb-4 text-center">
          재가입이 제한되어 있습니다
        </h2>
        <p className="text-center text-foreground/70 mb-6 max-w-md">
          {blockMessage}
        </p>
        <button
          onClick={() => router.replace("/login")}
          className="px-6 py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition"
        >
          로그인 페이지로 돌아가기
        </button>
      </div>
    );
  }

  // 로딩 중
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground transition-colors">
      <div className="animate-bounce text-4xl mb-4">✈️</div>

      <h2 className="text-xl font-bold mb-2">
        로그인 중입니다...
      </h2>

      <p className="text-sm opacity-80">
        잠시만 기다려주세요.
      </p>
    </div>
  );
}
