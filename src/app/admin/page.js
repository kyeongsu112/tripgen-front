// src/app/admin/page.js
"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import axios from "axios";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
// 본인의 Render 주소
const API_BASE_URL = "https://tripgen-server.onrender.com/api";

export default function AdminPage() {
  const [trips, setTrips] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("trips"); // trips, users
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email === ADMIN_EMAIL) {
        fetchData();
      } else {
        alert("관리자만 접근할 수 있습니다.");
        router.push("/");
      }
      setLoading(false);
    };
    checkAdmin();
  }, []);

  const fetchData = async () => {
    // 1. 여행 기록 가져오기
    const { data: tripsData } = await supabase
      .from("trip_plans")
      .select("*")
      .order("created_at", { ascending: false });
    if (tripsData) setTrips(tripsData);

    // 2. 유저 이용 현황 가져오기 (API 호출)
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/users`);
      setUsers(res.data.data);
    } catch (err) {
      console.error("유저 정보 로드 실패:", err);
    }
  };

  // 등급 변경 핸들러
  const handleUpdateTier = async (userId, currentTier) => {
    const newTier = currentTier === 'free' ? 'pro' : 'free';
    if (!confirm(`이 유저의 등급을 '${newTier.toUpperCase()}'로 변경하시겠습니까?`)) return;

    try {
      await axios.put(`${API_BASE_URL}/admin/user/tier`, {
        target_user_id: userId,
        new_tier: newTier
      });
      alert("변경되었습니다.");
      fetchData(); // 데이터 새로고침
    } catch (err) {
      alert("변경 실패: " + err.message);
    }
  };

  if (loading) return <div className="p-10 text-center">🔒 권한 확인 중...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto">
        
        {/* 상단 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-800">👮‍♀️ 관리자 대시보드</h1>
            <div className="flex bg-white rounded-lg p-1 border border-gray-300">
              <button 
                onClick={() => setActiveTab("trips")}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${activeTab === 'trips' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                여행 기록 ({trips.length})
              </button>
              <button 
                onClick={() => setActiveTab("users")}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                유저 등급 관리 ({users.length})
              </button>
            </div>
          </div>
          <button onClick={() => router.push('/')} className="bg-white border border-gray-300 px-4 py-2 rounded hover:bg-gray-50 text-sm font-bold">
            홈으로 나가기
          </button>
        </div>

        {/* 탭 1: 여행 기록 리스트 */}
        {activeTab === 'trips' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-sm text-gray-500">날짜</th>
                  <th className="p-4 text-sm text-gray-500">여행지</th>
                  <th className="p-4 text-sm text-gray-500">기간</th>
                  <th className="p-4 text-sm text-gray-500">스타일</th>
                  <th className="p-4 text-sm text-gray-500">유저 ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {trips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-gray-50">
                    <td className="p-4 text-sm">{new Date(trip.created_at).toLocaleDateString()}</td>
                    <td className="p-4 font-bold">{trip.destination}</td>
                    <td className="p-4 text-sm">{trip.duration}</td>
                    <td className="p-4 text-sm text-blue-600">{trip.style}</td>
                    <td className="p-4 text-xs text-gray-400 font-mono">{trip.user_id ? trip.user_id.slice(0,8)+"..." : "(비회원)"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 탭 2: 유저 등급 관리 리스트 */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-blue-100">
            <table className="w-full text-left border-collapse">
              <thead className="bg-blue-50 border-b border-blue-100">
                <tr>
                  <th className="p-4 text-sm text-blue-800">유저 ID (UUID)</th>
                  <th className="p-4 text-sm text-blue-800 text-center">이번 달 사용량</th>
                  <th className="p-4 text-sm text-blue-800 text-center">현재 등급</th>
                  <th className="p-4 text-sm text-blue-800 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.user_id} className="hover:bg-blue-50/50 transition">
                    <td className="p-4 text-xs font-mono text-gray-500">{u.user_id}</td>
                    <td className="p-4 text-center font-bold text-gray-700">{u.usage_count}회</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${u.tier === 'pro' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                        {u.tier.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleUpdateTier(u.user_id, u.tier)}
                        className={`text-xs px-3 py-1.5 rounded font-bold text-white transition ${u.tier === 'free' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-500 hover:bg-red-600'}`}
                      >
                        {u.tier === 'free' ? 'PRO로 승급 ⬆️' : 'FREE로 강등 ⬇️'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}