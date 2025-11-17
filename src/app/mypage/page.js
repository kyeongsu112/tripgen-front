// src/app/mypage/page.js
"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function MyPage() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/login");
      setUser(user);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">내 계정 정보</h1>
        
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <p className="text-sm text-gray-500 mb-1">이메일</p>
            <p className="text-lg font-bold text-blue-600">{user.email}</p>
          </div>

          <div>
             <p className="text-sm text-gray-500 mb-1">가입일</p>
             <p className="text-gray-800">{new Date(user.created_at).toLocaleString()}</p>
          </div>
          
          <div className="pt-4 border-t">
            <button 
              onClick={handleLogout}
              className="w-full bg-gray-800 text-white p-3 rounded-xl font-bold hover:bg-gray-900 transition"
            >
              로그아웃
            </button>
            <button 
              onClick={() => router.push('/')}
              className="w-full mt-3 text-gray-500 p-3 rounded-xl font-bold hover:bg-gray-100 transition"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}