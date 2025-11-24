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
// const API_BASE_URL = "http://localhost:8080/api"; 

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

      // 사용량 정보
      const { data: limit } = await supabase.from('user_limits').select('*').eq('user_id', user.id).single();
      setLimitInfo(limit || { tier: 'free', usage_count: 0 });

      // 여행 목록
      fetchMyTrips(user.id);
    };
    init();
  }, []);

  const fetchMyTrips = async (userId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/my-trips?user_id=${userId}`);
      setMyTrips(res.data.data);
    } catch (err) {
      console.error("Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, tripId) => {
    e.stopPropagation();
    if (!confirm("정말 이 여행 일정을 삭제하시겠습니까?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/trip/${tripId}`, { data: { user_id: user.id } });
      alert("삭제되었습니다.");
      setMyTrips(myTrips.filter(t => t.id !== tripId));
    } catch (err) {
      alert("삭제 오류: " + err.message);
    }
  };

  const handleShare = (e, tripId) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/share/${tripId}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => alert("링크 복사 완료! 🔗"))
      .catch(() => alert("URL을 직접 복사해주세요: " + shareUrl));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const getTripCoverImage = (trip) => {
    try {
      for (const day of trip.itinerary_data.itinerary) {
        for (const activity of day.activities) {
          if (activity.photoUrl) return activity.photoUrl;
        }
      }
    } catch (e) {}
    return `https://source.unsplash.com/featured/?${encodeURIComponent(trip.destination)},travel`;
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-spin text-4xl">⚪</div></div>;

  const tier = limitInfo?.tier || 'free';
  let maxLimit = 3;
  let tierName = "Free Plan";
  
  if (tier === 'pro') { maxLimit = 30; tierName = "Pro Plan"; }
  else if (tier === 'admin') { maxLimit = Infinity; tierName = "Admin"; }

  const percentage = tier === 'admin' ? 0 : Math.min((limitInfo?.usage_count / maxLimit) * 100, 100);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      
      {/* 헤더 */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 h-20 flex items-center">
        <div className="max-w-6xl mx-auto px-6 w-full flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-3xl text-rose-500">✈️</span>
            <span className="text-xl font-bold text-rose-500 tracking-tight">TripGen</span>
          </div>
          <button onClick={() => router.push('/')} className="text-sm font-bold text-slate-500 hover:text-slate-900 transition">
            홈으로 가기
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        
        {/* 프로필 섹션 (카드형) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 mb-12 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-4xl border-4 border-white shadow-md">
              👤
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-900">안녕하세요, 여행자님!</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${tier === 'pro' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                  {tierName}
                </span>
              </div>
              <p className="text-slate-500 font-medium">{user.email}</p>
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col items-end gap-4">
             {/* 사용량 게이지 */}
             <div className="bg-slate-50 px-6 py-3 rounded-xl border border-slate-100 w-full md:w-64">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                  <span>이번 달 생성</span>
                  <span>{limitInfo?.usage_count} / {tier === 'admin' ? '∞' : maxLimit}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-rose-500 h-2 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                </div>
             </div>
             
             <button onClick={handleLogout} className="text-sm font-bold text-slate-400 hover:text-slate-800 underline decoration-2 underline-offset-4 transition">
                로그아웃
             </button>
          </div>
        </div>

        {/* 내 여행 목록 */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">내 여행 보관함</h2>
            <button onClick={() => router.push('/')} className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-slate-800 transition shadow-md">
              + 새 여행 만들기
            </button>
          </div>
          
          {myTrips.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-24 text-center bg-slate-50/50">
              <div className="text-5xl mb-4 opacity-20">🗺️</div>
              <p className="text-slate-500 font-medium mb-6">아직 저장된 여행 일정이 없습니다.</p>
              <button onClick={() => router.push('/')} className="text-rose-500 font-bold hover:underline">
                첫 번째 여행을 계획해보세요
              </button>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {myTrips.map(trip => {
                const coverImage = getTripCoverImage(trip);
                return (
                  <div key={trip.id} className="group cursor-pointer relative" onClick={() => router.push(`/share/${trip.id}`)}>
                    {/* 이미지 영역 */}
                    <div className="relative aspect-[4/3] bg-slate-100 rounded-2xl overflow-hidden mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300">
                       <img 
                          src={coverImage} 
                          alt={trip.destination} 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                          onError={(e) => {e.target.src = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80"}}
                       />
                       {/* 뱃지 */}
                       <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm text-slate-900">
                          {trip.duration}
                       </div>
                       
                       {/* 오버레이 버튼들 (Hover 시 등장) */}
                       <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-start justify-end p-3 gap-2">
                          <button 
                            onClick={(e) => handleShare(e, trip.id)}
                            className="bg-white text-slate-800 p-2 rounded-full shadow-lg hover:scale-110 transition hover:text-blue-600"
                            title="공유"
                          >
                            🔗
                          </button>
                          <button 
                            onClick={(e) => handleDelete(e, trip.id)}
                            className="bg-white text-slate-800 p-2 rounded-full shadow-lg hover:scale-110 transition hover:text-rose-500"
                            title="삭제"
                          >
                            🗑️
                          </button>
                       </div>
                    </div>
                    
                    {/* 텍스트 정보 */}
                    <div className="px-1">
                      <h3 className="font-bold text-lg text-slate-900 truncate mb-1 group-hover:text-rose-500 transition-colors">{trip.itinerary_data.trip_title}</h3>
                      <div className="flex justify-between items-center text-sm">
                        <p className="text-slate-500 font-medium flex items-center gap-1">
                          <span>📍</span> {trip.destination}
                        </p>
                        <p className="text-slate-400 text-xs">{new Date(trip.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}