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
// 본인의 Render 주소 (배포용)
const API_BASE_URL = "https://tripgen-server.onrender.com/api";
// const API_BASE_URL = "http://localhost:8080/api"; 

export default function AdminPage() {
  const [trips, setTrips] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("trips"); // 'trips' | 'users'
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
      alert("등급이 변경되었습니다.");
      fetchData(); // 데이터 새로고침
    } catch (err) {
      alert("변경 실패: " + err.message);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-spin text-4xl">🔒</div></div>;

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      
      {/* 헤더 */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 h-20 flex items-center">
        <div className="max-w-7xl mx-auto px-6 w-full flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-3xl text-rose-500">✈️</span>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-rose-500 tracking-tight leading-none">TripGen</span>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider">ADMIN DASHBOARD</span>
            </div>
          </div>
          <button onClick={() => router.push('/')} className="text-sm font-bold text-slate-500 hover:text-slate-900 transition">
            홈으로 가기
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        
        {/* 대시보드 상단 요약 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <p className="text-sm font-bold text-slate-400 mb-1">총 생성된 여행</p>
            <p className="text-3xl font-black text-slate-900">{trips.length}</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <p className="text-sm font-bold text-slate-400 mb-1">등록된 사용자</p>
            <p className="text-3xl font-black text-slate-900">{users.length}</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-400 mb-1">현재 관리자</p>
              <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{ADMIN_EMAIL}</p>
            </div>
            <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center text-lg">👑</div>
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div className="flex gap-2 mb-6 border-b border-slate-100 pb-1">
          <button 
            onClick={() => setActiveTab("trips")}
            className={`px-6 py-3 text-sm font-bold rounded-t-lg transition-all ${
              activeTab === 'trips' 
              ? 'border-b-2 border-black text-black' 
              : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            여행 기록 관리
          </button>
          <button 
            onClick={() => setActiveTab("users")}
            className={`px-6 py-3 text-sm font-bold rounded-t-lg transition-all ${
              activeTab === 'users' 
              ? 'border-b-2 border-black text-black' 
              : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            유저 등급 관리
          </button>
        </div>

        {/* 탭 1: 여행 기록 리스트 */}
        {activeTab === 'trips' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">생성일</th>
                    <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">여행지</th>
                    <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">기간</th>
                    <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">스타일</th>
                    <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">유저 ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trips.map((trip) => (
                    <tr key={trip.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-5 text-sm text-slate-600 whitespace-nowrap">
                        {new Date(trip.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-5 font-bold text-slate-900">{trip.destination}</td>
                      <td className="p-5 text-sm text-slate-600">{trip.duration}</td>
                      <td className="p-5 text-sm">
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-bold">
                          {trip.style || "-"}
                        </span>
                      </td>
                      <td className="p-5 text-xs text-slate-400 font-mono whitespace-nowrap">
                        {trip.user_id ? trip.user_id.slice(0,8)+"..." : "(비회원)"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {trips.length === 0 && <div className="p-10 text-center text-slate-400">데이터가 없습니다.</div>}
          </div>
        )}

        {/* 탭 2: 유저 등급 관리 리스트 */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">유저 ID (UUID)</th>
                    <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">이번 달 사용량</th>
                    <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">현재 등급</th>
                    <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">등급 관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.user_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-5 text-xs font-mono text-slate-500">{u.user_id}</td>
                      <td className="p-5 text-center font-bold text-slate-700">{u.usage_count}회</td>
                      <td className="p-5 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                          u.tier === 'pro' 
                          ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {u.tier}
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <button 
                          onClick={() => handleUpdateTier(u.user_id, u.tier)}
                          className={`text-xs px-4 py-2 rounded-lg font-bold transition shadow-sm ${
                            u.tier === 'free' 
                            ? 'bg-black text-white hover:bg-slate-800' 
                            : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {u.tier === 'free' ? 'PRO로 승급 ▲' : 'FREE로 강등 ▼'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.length === 0 && <div className="p-10 text-center text-slate-400">유저 데이터가 없습니다.</div>}
          </div>
        )}

      </main>
    </div>
  );
}