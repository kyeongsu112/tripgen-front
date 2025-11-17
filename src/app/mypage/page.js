// src/app/mypage/page.js
"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import axios from "axios";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 본인의 Render 주소 확인
const API_BASE_URL = "https://tripgen-server.onrender.com/api";

export default function MyPage() {
  const [user, setUser] = useState(null);
  const [limitInfo, setLimitInfo] = useState(null);
  const [myTrips, setMyTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      // 1. 사용량 정보 가져오기
      const { data: limit } = await supabase
        .from('user_limits')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setLimitInfo(limit || { tier: 'free', usage_count: 0 });

      // 2. 여행 목록 가져오기
      fetchMyTrips(user.id);
    };
    init();
  }, []);

  const fetchMyTrips = async (userId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/my-trips?user_id=${userId}`);
      setMyTrips(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tripId) => {
    if (!confirm("정말 이 일정을 삭제하시겠습니까?")) return;
    try {
      // 삭제 요청 시 body에 user_id를 보내서 본인 확인
      await axios.delete(`${API_BASE_URL}/trip/${tripId}`, {
        data: { user_id: user.id }
      });
      alert("삭제되었습니다.");
      fetchMyTrips(user.id); // 목록 새로고침
    } catch (err) {
      alert("삭제 실패: " + err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (!user) return <div className="p-10 text-center">로딩 중...</div>;

  const maxLimit = limitInfo?.tier === 'pro' ? 30 : 3;
  const percentage = Math.min((limitInfo?.usage_count / maxLimit) * 100, 100);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">마이페이지</h1>
          <button onClick={() => router.push('/')} className="bg-white border px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-bold">
            ← 홈으로
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* 왼쪽: 계정 정보 카드 */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-4 text-gray-700">내 정보</h2>
              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-1">이메일</p>
                <p className="font-bold text-gray-800 break-all">{user.email}</p>
              </div>
              
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">이번 달 사용량</span>
                  <span className="font-bold text-blue-600">{limitInfo?.usage_count}/{maxLimit}회</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className={`h-2 rounded-full ${percentage >= 100 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${percentage}%` }}></div>
                </div>
              </div>

              <button onClick={handleLogout} className="w-full border border-gray-300 text-gray-500 py-2 rounded-lg text-sm hover:bg-gray-50">
                로그아웃
              </button>
            </div>
          </div>

          {/* 오른쪽: 여행 기록 리스트 */}
          <div className="md:col-span-2">
            <h2 className="text-xl font-bold mb-4 text-gray-800">✈️ 나의 여행 기록 ({myTrips.length})</h2>
            
            {loading ? (
              <div className="text-center py-10 text-gray-400">불러오는 중...</div>
            ) : myTrips.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl shadow-sm text-center border border-dashed border-gray-300">
                <p className="text-gray-500 mb-4">아직 생성된 여행이 없습니다.</p>
                <button onClick={() => router.push('/')} className="text-blue-600 font-bold underline">여행 만들러 가기</button>
              </div>
            ) : (
              <div className="space-y-4">
                {myTrips.map((trip) => (
                  <div key={trip.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-lg text-gray-800 mb-1">{trip.itinerary_data.trip_title}</h3>
                      <div className="text-sm text-gray-500 flex gap-3">
                        <span>📍 {trip.destination}</span>
                        <span>🗓️ {trip.duration}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">{new Date(trip.created_at).toLocaleDateString()} 생성됨</p>
                    </div>
                    <button 
                      onClick={() => handleDelete(trip.id)}
                      className="text-red-400 hover:text-red-600 text-sm px-3 py-2 rounded hover:bg-red-50 transition"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}