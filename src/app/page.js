"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// 1. 설정 로드
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
// 🚨 본인의 Render 주소인지 다시 한번 확인하세요!
const API_BASE_URL = "https://tripgen-server.onrender.com/api"; 

export default function Home() {
  const [user, setUser] = useState(null);
  const [isUserLoading, setIsUserLoading] = useState(true); // 유저 로딩 상태 추가
  const [activeTab, setActiveTab] = useState("home");
  const [myTrips, setMyTrips] = useState([]);
  const [formData, setFormData] = useState({ destination: "", startDate: "", endDate: "", style: "", companions: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  
  const router = useRouter();

  // 초기화: 유저 세션 확인
  useEffect(() => {
    const checkUser = async () => {
      setIsUserLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user);
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      setIsUserLoading(false);
      return () => subscription.unsubscribe();
    };
    checkUser();
  }, []);

  // 내 여행 목록 로드
  useEffect(() => {
    if (activeTab === "mytrip" && user) {
      axios.get(`${API_BASE_URL}/my-trips?user_id=${user.id}`)
        .then(res => setMyTrips(res.data.data))
        .catch(err => console.error(err));
    }
  }, [activeTab, user]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true); setResult(null); setCurrentDayIndex(0);
    try {
      const res = await axios.post(`${API_BASE_URL}/generate-trip`, { ...formData, user_id: user?.id });
      setResult(res.data.data);
    } catch (err) {
      alert("생성 실패: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // 지도 URL 생성
  const getMapUrl = (activities) => {
    if (!activities) return null;
    const validPlaces = activities.filter(a => a.place_name && !a.place_name.includes("이동") && a.type !== "숙소");
    if (validPlaces.length < 2) return null;

    const formatPlace = (p) => p.place_id ? `place_id:${p.place_id}` : encodeURIComponent(p.place_name);
    const origin = formatPlace(validPlaces[0]);
    const destination = formatPlace(validPlaces[validPlaces.length - 1]);
    
    let waypoints = "";
    if (validPlaces.length > 2) {
      const wpList = validPlaces.slice(1, -1).map(p => formatPlace(p)).join("|");
      waypoints = `&waypoints=${wpList}`;
    }

    return `https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_API_KEY}&origin=${origin}&destination=${destination}${waypoints}&mode=transit`;
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {/* 네비게이션 바 */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex justify-between items-center">
          
          {/* 왼쪽: 로고 및 탭 */}
          <div className="flex items-center gap-8">
            <span className="text-2xl font-extrabold text-blue-600 cursor-pointer" onClick={() => setActiveTab("home")}>
              ✈️ TripGen
            </span>
            <div className="hidden md:flex gap-6">
              <button onClick={() => setActiveTab("home")} className={`font-medium ${activeTab==="home" ? "text-blue-600" : "text-gray-500"}`}>일정 생성</button>
              {user && <button onClick={() => setActiveTab("mytrip")} className={`font-medium ${activeTab==="mytrip" ? "text-blue-600" : "text-gray-500"}`}>내 여행 보관함</button>}
            </div>
          </div>

          {/* 오른쪽: 로그인 버튼 (무조건 보여야 함) */}
          <div>
            {isUserLoading ? (
              <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div> // 로딩 중 스켈레톤
            ) : user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 hidden sm:inline">{user.email?.split("@")[0]}님</span>
                <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="text-sm text-red-500 border border-red-200 px-3 py-1.5 rounded hover:bg-red-50 transition">
                  로그아웃
                </button>
              </div>
            ) : (
              <button 
                onClick={() => router.push('/login')} 
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md transition transform hover:-translate-y-0.5"
              >
                로그인 / 가입
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* ... (나머지 탭 1, 2 내용은 기존과 동일하므로 그대로 두시면 됩니다) ... */}
        
        {/* [탭 2] 홈 (일정 생성 및 결과) 부분만 다시 붙여넣기 */}
        {activeTab === "home" && (
          <>
            {!result && (
              <div className="bg-white p-8 rounded-2xl shadow-lg animate-fade-in-up">
                <div className="text-center mb-8"><h2 className="text-2xl font-bold">여행을 계획해 보세요</h2></div>
                <form onSubmit={handleGenerate} className="space-y-6">
                  <input placeholder="여행지 (예: 부산, 도쿄)" className="w-full border p-3 rounded-xl" onChange={e=>setFormData({...formData, destination: e.target.value})} required />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="date" className="w-full border p-3 rounded-xl" onChange={e=>setFormData({...formData, startDate: e.target.value})} required />
                    <input type="date" className="w-full border p-3 rounded-xl" onChange={e=>setFormData({...formData, endDate: e.target.value})} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input placeholder="스타일 (예: 힐링)" className="w-full border p-3 rounded-xl" onChange={e=>setFormData({...formData, style: e.target.value})} />
                    <input placeholder="동행 (예: 연인)" className="w-full border p-3 rounded-xl" onChange={e=>setFormData({...formData, companions: e.target.value})} />
                  </div>
                  <button disabled={loading} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:bg-gray-400">
                    {loading ? "✨ AI가 경로를 계산 중입니다..." : "🚀 일정 생성하기"}
                  </button>
                </form>
              </div>
            )}

            {result && result.itinerary_data && (
              <div className="animate-fade-in-up">
                <div className="flex justify-between items-end mb-6 border-b pb-4">
                  <div><h2 className="text-3xl font-bold">{result.itinerary_data.trip_title}</h2><p className="text-gray-500 mt-1">{result.duration} | {result.destination}</p></div>
                  <button onClick={() => setResult(null)} className="text-sm text-gray-500 underline hover:text-blue-600">새 일정 만들기</button>
                </div>

                {/* 날짜 컨트롤 */}
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-6">
                  <button onClick={() => setCurrentDayIndex(Math.max(0, currentDayIndex - 1))} disabled={currentDayIndex === 0} className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-30 font-bold">← 이전 날</button>
                  <div className="text-center"><div className="font-bold text-blue-600 text-xl">Day {result.itinerary_data.itinerary[currentDayIndex].day}</div><div className="text-sm text-gray-500">{result.itinerary_data.itinerary[currentDayIndex].date}</div></div>
                  <button onClick={() => setCurrentDayIndex(Math.min(result.itinerary_data.itinerary.length-1, currentDayIndex + 1))} disabled={currentDayIndex===result.itinerary_data.itinerary.length-1} className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-30 font-bold">다음 →</button>
                </div>

                {/* 📍 [지도 영역] - 높이(h-96) 강제 지정 */}
                <div className="w-full h-96 bg-gray-100 rounded-2xl overflow-hidden shadow-inner mb-8 border border-gray-300 relative">
                   {getMapUrl(result.itinerary_data.itinerary[currentDayIndex].activities) ? (
                     <iframe
                       width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen
                       src={getMapUrl(result.itinerary_data.itinerary[currentDayIndex].activities)}
                     ></iframe>
                   ) : (
                     <div className="flex h-full flex-col items-center justify-center text-gray-500">
                        <span className="text-4xl mb-2">🗺️</span>
                        <span>지도를 표시할 경로 정보가 부족합니다.</span>
                     </div>
                   )}
                </div>

                {/* 일정 리스트 */}
                <div className="space-y-4 pb-20">
                  {result.itinerary_data.itinerary[currentDayIndex].activities.map((act, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl shadow flex gap-4 border border-gray-100">
                       <div className="w-24 h-24 shrink-0 bg-gray-100 rounded-lg overflow-hidden relative">
                           {act.photoUrl ? <img src={act.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">📍</div>}
                           {act.rating && <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1 rounded">⭐ {act.rating}</div>}
                       </div>
                       <div className="flex-1">
                         <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">{act.time}</span>
                                <span className="text-xs text-gray-500 border px-1 rounded">{act.type}</span>
                            </div>
                         </div>
                         <h3 className="font-bold text-lg">{act.place_name}</h3>
                         <p className="text-sm text-gray-600 line-clamp-2">{act.activity_description}</p>
                         {act.googleMapsUri && <a href={act.googleMapsUri} target="_blank" className="text-xs text-blue-500 mt-2 inline-block hover:underline">구글 지도 보기</a>}
                         {act.travel_info && (
                           <div className="mt-2 bg-gray-50 p-2 rounded text-xs text-gray-600 flex items-center gap-1">
                             <span>👣 이동:</span><span className="font-bold text-blue-600">{act.travel_info.duration}</span><span>({act.travel_info.distance})</span>
                           </div>
                         )}
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}