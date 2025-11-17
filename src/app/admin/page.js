// src/app/admin/page.js
"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Vercel 환경변수에 등록된 관리자 이메일 불러오기
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export default function AdminPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 관리자 이메일 체크
      if (user && user.email === ADMIN_EMAIL) {
        fetchAllTrips();
      } else {
        alert("관리자만 접근할 수 있습니다.");
        router.push("/");
      }
      setLoading(false);
    };
    checkAdmin();
  }, []);

  const fetchAllTrips = async () => {
    // 모든 데이터 가져오기 (최신순)
    const { data, error } = await supabase
      .from("trip_plans")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setTrips(data);
    if (error) console.error(error);
  };

  if (loading) return <div className="p-10 text-center">권한 확인 중...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">👮‍♀️ TripGen 관리자 대시보드</h1>
          <button onClick={() => router.push('/')} className="bg-white border border-gray-300 px-4 py-2 rounded hover:bg-gray-50">
            홈으로 나가기
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-gray-500 font-medium">날짜</th>
                <th className="p-4 text-gray-500 font-medium">여행지</th>
                <th className="p-4 text-gray-500 font-medium">기간</th>
                <th className="p-4 text-gray-500 font-medium">스타일/동행</th>
                <th className="p-4 text-gray-500 font-medium">유저 ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-blue-50 transition">
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(trip.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 font-bold text-gray-800">{trip.destination}</td>
                  <td className="p-4 text-sm">{trip.duration}</td>
                  <td className="p-4 text-sm text-blue-600">
                    {trip.style} / {trip.companions}
                  </td>
                  <td className="p-4 text-xs text-gray-400 font-mono">
                    {trip.user_id ? trip.user_id : "(비회원)"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}