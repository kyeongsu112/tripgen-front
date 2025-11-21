"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// --- 설정 ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
// Render 주소 (배포용)
const API_BASE_URL = "https://tripgen-server.onrender.com/api"; 

// 로컬 테스트용 주소 👇
//const API_BASE_URL = "http://localhost:8080/api";

export default function Home() {
  const [user, setUser] = useState(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [myTrips, setMyTrips] = useState([]);
  
  // ✨ [변경] 시간 입력을 위해 arrivalTime, departureTime 추가 (기본값 설정)
  const [formData, setFormData] = useState({ 
    destination: "", 
    startDate: "", 
    endDate: "", 
    style: "", 
    companions: "",
    arrivalTime: "14:00",    // 기본값 오후 2시
    departureTime: "12:00"   // 기본값 낮 12시
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  
  const router = useRouter();

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

  useEffect(() => {
    if (activeTab === "mytrip" && user) {
      axios.get(`${API_BASE_URL}/my-trips?user_id=${user.id}`)
        .then(res => setMyTrips(res.data.data))
        .catch(err => console.error(err));
    }
  }, [activeTab, user]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!user) {
      if (confirm("로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?")) {
        router.push('/login');
      }
      return;
    }
    setLoading(true); setResult(null); setCurrentDayIndex(0);
    try {
      // formData에 이미 arrivalTime, departureTime이 포함되어 있으므로 그대로 전송됨
      const res = await axios.post(`${API_BASE_URL}/generate-trip`, { ...formData, user_id: user?.id });
      setResult(res.data.data);
    } catch (err) {
      alert("오류: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-blue-100">
      
      {/* ✨ 헤더 */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab("home")}>
              <span className="text-2xl">✈️</span>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">TripGen</span>
            </div>
            
            <div className="hidden md:flex gap-1 bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab("home")} 
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab==="home" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
              >
                일정 생성
              </button>
              {user && (
                <button 
                  onClick={() => setActiveTab("mytrip")} 
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab==="mytrip" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                >
                  보관함
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isUserLoading ? (
              <div className="w-24 h-9 bg-slate-200 rounded animate-pulse"></div>
            ) : user ? (
              <>
                {user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
                  <button onClick={() => router.push('/admin')} className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-full font-bold hover:bg-slate-700 transition">관리자</button>
                )}
                <button onClick={() => router.push('/mypage')} className="text-sm font-bold text-slate-600 hover:text-blue-600 transition">마이페이지</button>
              </>
            ) : (
              <button onClick={() => router.push('/login')} className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30 transition transform hover:-translate-y-0.5">
                로그인
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-10">
        
        {/* 탭 1: 내 여행 보관함 */}
        {activeTab === "mytrip" && user && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800">🧳 내 여행 보관함</h2>
              <span className="text-sm text-slate-500">총 {myTrips.length}개의 추억</span>
            </div>
            
            {myTrips.length === 0 ? (
              <div className="bg-white p-16 rounded-3xl shadow-sm border border-dashed border-slate-300 text-center">
                <p className="text-slate-400 mb-4 text-lg">아직 저장된 여행이 없습니다.</p>
                <button onClick={() => setActiveTab('home')} className="text-blue-600 font-bold hover:underline">새로운 여행 떠나기</button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {myTrips.map(trip => (
                  <div key={trip.id} className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition duration-300 cursor-pointer" onClick={() => { setResult(trip); setActiveTab("home"); }}>
                    <div className="flex justify-between items-start mb-4">
                      <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded-full">{trip.duration}</span>
                      <span className="text-xl group-hover:scale-110 transition">✈️</span>
                    </div>
                    <h3 className="font-bold text-lg text-slate-800 mb-1 line-clamp-2 h-14">{trip.itinerary_data.trip_title}</h3>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mb-4">📍 {trip.destination}</p>
                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs text-slate-400">{new Date(trip.created_at).toLocaleDateString()}</span>
                      <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition">자세히 보기 →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 탭 2: 홈 (입력 및 결과) */}
        {activeTab === "home" && (
          <>
            {!result && (
              <div className="max-w-3xl mx-auto animate-fade-in-up">
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-extrabold text-slate-900 mb-4 leading-tight">
                    어디로 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">떠나시나요?</span>
                  </h2>
                  <p className="text-lg text-slate-500">AI가 당신의 취향에 딱 맞는 완벽한 일정을 설계해 드립니다.</p>
                </div>
                
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                  <form onSubmit={handleGenerate} className="space-y-8">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">여행지</label>
                      <input placeholder="예: 오사카, 제주도, 파리" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition" onChange={e=>setFormData({...formData, destination: e.target.value})} required />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">가는 날</label>
                        <input type="date" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" onChange={e=>setFormData({...formData, startDate: e.target.value})} required />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">오는 날</label>
                        <input type="date" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" onChange={e=>setFormData({...formData, endDate: e.target.value})} required />
                      </div>
                    </div>

                    {/* ✨ [추가] 비행기 시간 입력 영역 (UI 개선) */}
                    <div className="grid grid-cols-2 gap-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">🛬 도착 시간</label>
                        <input type="time" value={formData.arrivalTime} className="w-full bg-white border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" onChange={e=>setFormData({...formData, arrivalTime: e.target.value})} />
                        <p className="text-xs text-slate-400 mt-1 ml-1">첫날 일정 시작 기준</p>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">🛫 출발 시간</label>
                        <input type="time" value={formData.departureTime} className="w-full bg-white border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" onChange={e=>setFormData({...formData, departureTime: e.target.value})} />
                        <p className="text-xs text-slate-400 mt-1 ml-1">마지막 날 일정 종료 기준</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">스타일</label>
                        <input placeholder="예: 힐링, 맛집 투어" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" onChange={e=>setFormData({...formData, style: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">동행</label>
                        <input placeholder="예: 연인, 부모님" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" onChange={e=>setFormData({...formData, companions: e.target.value})} />
                      </div>
                    </div>
                    
                    <button disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-teal-500 text-white p-5 rounded-xl font-bold text-lg shadow-lg hover:shadow-blue-500/30 transform hover:-translate-y-1 transition disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? "✨ AI가 최고의 코스를 짜고 있어요..." : "🚀 무료로 여행 일정 생성하기"}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ✨ 결과 화면: 타임라인 스타일 적용 */}
            {result && result.itinerary_data && (
              <div className="animate-fade-in-up pb-20">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 mb-8 flex flex-col md:flex-row justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">{result.itinerary_data.trip_title}</h2>
                    <p className="text-slate-500 flex items-center gap-2">
                      <span>🗓️ {result.duration}</span>
                      <span className="text-slate-300">|</span>
                      <span>📍 {result.destination}</span>
                    </p>
                  </div>
                  <button onClick={() => setResult(null)} className="mt-4 md:mt-0 text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition">
                    + 새 일정 만들기
                  </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                  
                  {/* 왼쪽: 일정 리스트 (타임라인) */}
                  <div className="lg:w-1/2">
                    {/* 날짜 네비게이션 */}
                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 sticky top-20 z-10">
                      <button onClick={() => setCurrentDayIndex(Math.max(0, currentDayIndex - 1))} disabled={currentDayIndex === 0} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 disabled:opacity-30 transition font-bold text-slate-600">←</button>
                      <div className="text-center">
                        <div className="font-extrabold text-blue-600 text-lg">DAY {result.itinerary_data.itinerary[currentDayIndex].day}</div>
                        <div className="text-xs text-slate-400 font-medium">{result.itinerary_data.itinerary[currentDayIndex].date}</div>
                      </div>
                      <button onClick={() => setCurrentDayIndex(Math.min(result.itinerary_data.itinerary.length-1, currentDayIndex + 1))} disabled={currentDayIndex===result.itinerary_data.itinerary.length-1} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 disabled:opacity-30 transition font-bold text-slate-600">→</button>
                    </div>

                    <div className="relative border-l-2 border-slate-200 ml-6 space-y-8">
                      {result.itinerary_data.itinerary[currentDayIndex].activities.map((act, idx) => (
                        <div key={idx} className="ml-8 relative group">
                          {/* 타임라인 점 */}
                          <div className="absolute -left-[39px] top-6 bg-white border-4 border-blue-500 w-5 h-5 rounded-full z-10 group-hover:scale-125 transition"></div>
                          
                          {/* 이동 정보 */}
                          {act.travel_info && (
                            <div className="mb-4 -ml-2 inline-flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-xs font-medium text-slate-600">
                              <span>👣</span>
                              <span>{act.travel_info.duration} 이동</span>
                              <span className="text-slate-400">({act.travel_info.distance})</span>
                            </div>
                          )}

                          {/* 장소 카드 */}
                          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-blue-200 transition duration-300 flex flex-col sm:flex-row gap-5">
                             <div className="w-full sm:w-32 h-32 shrink-0 bg-slate-100 rounded-xl overflow-hidden relative">
                               {act.photoUrl ? <img src={act.photoUrl} alt={act.place_name} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" /> : <div className="w-full h-full flex items-center justify-center text-2xl">📍</div>}
                               {act.rating && <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-bold">⭐ {act.rating}</div>}
                             </div>
                             
                             <div className="flex-1">
                               <div className="flex items-center gap-2 mb-2">
                                  <span className="bg-slate-900 text-white px-2 py-0.5 rounded-md text-xs font-bold font-mono">{act.time}</span>
                                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{act.type}</span>
                               </div>
                               <h3 className="text-lg font-bold text-slate-800 mb-2 leading-tight">{act.place_name}</h3>
                               <p className="text-sm text-slate-500 leading-relaxed mb-3">{act.activity_description}</p>
                               
                               {/* ✨ [추가] 구글 지도 및 예약 버튼 링크 영역 */}
                               <div className="flex flex-wrap gap-2 mt-2">
                                 {act.googleMapsUri && <a href={act.googleMapsUri} target="_blank" className="text-xs font-bold text-blue-500 hover:underline flex items-center gap-1">🗺️ 지도 보기</a>}
                                 
                                 {/* ✨ [추가] 예약 링크 버튼 */}
                                 {act.booking_url && (
                                   <a href={act.booking_url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded hover:bg-green-100 transition flex items-center gap-1">
                                     🎟️ 예약/구매 링크
                                   </a>
                                 )}
                               </div>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 오른쪽: 지도 (Sticky) */}
                  <div className="lg:w-1/2">
                    <div className="sticky top-24 h-[500px] bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
                      {getMapUrl(result.itinerary_data.itinerary[currentDayIndex].activities) ? (
                        <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen src={getMapUrl(result.itinerary_data.itinerary[currentDayIndex].activities)}></iframe>
                      ) : <div className="flex h-full flex-col items-center justify-center text-slate-400 bg-slate-50"><span className="text-4xl mb-2">🗺️</span><span>지도 정보를 불러올 수 없습니다.</span></div>}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}