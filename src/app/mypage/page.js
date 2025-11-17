"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import axios from "axios";

// 1. Supabase 설정
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 2. 백엔드 API 주소 (Render)
const API_BASE_URL = "https://tripgen-server.onrender.com/api";

export default function MyPage() {
  // --- 상태 관리 ---
  const [user, setUser] = useState(null);
  const [limitInfo, setLimitInfo] = useState(null); // 사용량 및 등급 정보
  const [myTrips, setMyTrips] = useState([]); // 생성한 여행 목록
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // --- 초기 데이터 로드 ---
  useEffect(() => {
    const init = async () => {
      // 로그인 체크
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      // 1. 사용량/등급 정보 가져오기
      const { data: limit } = await supabase
        .from('user_limits')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      // 데이터가 없으면 기본값(Free, 0회) 설정
      setLimitInfo(limit || { tier: 'free', usage_count: 0 });

      // 2. 내 여행 목록 가져오기
      fetchMyTrips(user.id);
    };
    init();
  }, []);

  // 여행 목록 조회 함수
  const fetchMyTrips = async (userId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/my-trips?user_id=${userId}`);
      setMyTrips(res.data.data);
    } catch (err) {
      console.error("여행 목록 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  // 삭제 핸들러
  const handleDelete = async (tripId) => {
    if (!confirm("정말 이 여행 일정을 삭제하시겠습니까?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/trip/${tripId}`, {
        data: { user_id: user.id }
      });
      alert("삭제되었습니다.");
      fetchMyTrips(user.id); // 목록 새로고침
    } catch (err) {
      alert("삭제 오류: " + err.message);
    }
  };

  // 공유 핸들러 (클립보드 복사)
  const handleShare = (tripId) => {
    const shareUrl = `${window.location.origin}/trip/${tripId}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => alert("📋 공유 링크가 복사되었습니다!\n친구에게 전달해보세요."))
      .catch(() => alert("복사 실패. URL을 직접 복사해주세요: " + shareUrl));
  };

  // 로그아웃 핸들러
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  // 로딩 중 화면
  if (!user) return <div className="min-h-screen flex items-center justify-center text-gray-500">로딩 중...</div>;

  // --- 등급별 UI 설정 ---
  const tier = limitInfo?.tier || 'free';
  let maxLimit = 3;
  let tierName = "FREE 플랜";
  let badgeColor = "bg-blue-100 text-blue-700";

  if (tier === 'pro') {
    maxLimit = 30;
    tierName = "PRO 플랜";
    badgeColor = "bg-purple-100 text-purple-700";
  } else if (tier === 'admin') {
    maxLimit = Infinity;
    tierName = "👑 ADMIN (무제한)";
    badgeColor = "bg-gray-800 text-white";
  }

  // 게이지 퍼센트 계산 (Admin은 0%로 고정하여 깔끔하게 표시)
  const percentage = tier === 'admin' ? 0 : Math.min((limitInfo?.usage_count / maxLimit) * 100, 100);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-5xl mx-auto">
        
        {/* 상단 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">마이페이지</h1>
          <button onClick={() => router.push('/')} className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition">
            ← 홈으로 돌아가기
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          
          {/* [왼쪽] 내 정보 및 사용량 카드 */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-24">
              <h2 className="text-lg font-bold mb-4 text-gray-700">내 정보</h2>
              
              <div className="mb-6">
                <p className="text-xs text-gray-400 mb-1">이메일</p>
                <p className="font-bold text-gray-900 break-all">{user.email}</p>
                <div className={`mt-2 inline-block px-3 py-1 text-xs font-bold rounded-full ${badgeColor}`}>
                  {tierName}
                </div>
              </div>
              
              {/* 사용량 게이지 */}
              <div className="mb-8 bg-gray-50 p-5 rounded-2xl border border-gray-200">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-bold text-gray-500">이번 달 사용량</span>
                  <span className="font-bold text-blue-600">
                    {limitInfo?.usage_count} / {tier === 'admin' ? '∞' : maxLimit}회
                  </span>
                </div>
                
                {/* 게이지 바 (Admin은 숨김) */}
                {tier !== 'admin' && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden mb-2">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-500 ${percentage >= 100 ? 'bg-red-500' : 'bg-blue-600'}`} 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                )}
                
                <p className="text-xs text-gray-400 text-center">
                  {tier === 'admin' 
                    ? "관리자는 제한 없이 이용 가능합니다." 
                    : (percentage >= 100 ? "이번 달 이용 한도를 초과했습니다." : "아직 여유가 있어요!")}
                </p>
              </div>

              <button onClick={handleLogout} className="w-full border border-gray-300 text-gray-500 py-3 rounded-xl text-sm hover:bg-gray-100 font-bold transition">
                로그아웃
              </button>
            </div>
          </div>

          {/* [오른쪽] 여행 기록 리스트 */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-xl font-bold text-gray-900">✈️ 나의 여행 기록</h2>
              <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">{myTrips.length}</span>
            </div>
            
            {loading ? (
              <div className="text-center py-20 text-gray-400">데이터를 불러오는 중입니다...</div>
            ) : myTrips.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl shadow-sm text-center border-2 border-dashed border-gray-200">
                <p className="text-gray-400 mb-4">아직 생성된 여행 일정이 없습니다.</p>
                <button onClick={() => router.push('/')} className="text-blue-600 font-bold underline hover:text-blue-800">
                  첫 번째 여행 만들기
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myTrips.map((trip) => (
                  <div key={trip.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition duration-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 mb-1">{trip.itinerary_data.trip_title}</h3>
                      <div className="text-sm text-gray-500 flex flex-wrap gap-3">
                        <span className="flex items-center gap-1">📍 {trip.destination}</span>
                        <span className="text-gray-300">|</span>
                        <span className="flex items-center gap-1">🗓️ {trip.duration}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(trip.created_at).toLocaleDateString()} 생성됨
                      </p>
                    </div>
                    
                    <div className="flex gap-2 self-end sm:self-auto">
                      <button 
                        onClick={() => handleShare(trip.id)}
                        className="text-blue-600 bg-blue-50 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-100 transition"
                      >
                        공유
                      </button>
                      <button 
                        onClick={() => handleDelete(trip.id)}
                        className="text-red-500 bg-red-50 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-100 transition"
                      >
                        삭제
                      </button>
                    </div>
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