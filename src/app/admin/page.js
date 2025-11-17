"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// .env에서 관리자 이메일 가져오기
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export default function AdminPage() {
  const [trips, setTrips] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // [수정됨] 환경변수와 비교
      if (user && user.email === ADMIN_EMAIL) {
        setIsAdmin(true);
        fetchAllTrips();
      } else {
        alert("관리자만 접근 가능합니다.");
        router.push("/"); // 홈으로 쫓아내기
      }
    };
    checkAdmin();
  }, []);

  const fetchAllTrips = async () => {
    const { data, error } = await supabase
      .from("trip_plans")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setTrips(data);
  };

  if (!isAdmin) return <div className="p-10 text-center">🔒 접근 권한 확인 중...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">👮‍♀️ 관리자 대시보드</h1>
          <button onClick={() => router.push('/')} className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
            홈으로 돌아가기
          </button>
        </div>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-semibold text-gray-600">생성일</th>
                <th className="p-4 font-semibold text-gray-600">여행지</th>
                <th className="p-4 font-semibold text-gray-600">기간</th>
                <th className="p-4 font-semibold text-gray-600">스타일</th>
                <th className="p-4 font-semibold text-gray-600">사용자</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-blue-50 transition">
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(trip.created_at).toLocaleString()}
                  </td>
                  <td className="p-4 font-bold text-gray-800">{trip.destination}</td>
                  <td className="p-4 text-sm text-gray-600">{trip.duration}</td>
                  <td className="p-4 text-sm text-blue-600">{trip.style || "-"}</td>
                  <td className="p-4 text-xs text-gray-400 font-mono">
                    {trip.user_id ? trip.user_id.slice(0, 8) + "..." : "비회원"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {trips.length === 0 && (
            <div className="p-10 text-center text-gray-500">아직 생성된 여행이 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}