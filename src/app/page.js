"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// --- 설정 ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 배포 주소 (Render)
const API_BASE_URL = "https://tripgen-server.onrender.com/api"; 
// const API_BASE_URL = "http://localhost:8080/api"; 

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function Home() {
  const [user, setUser] = useState(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [myTrips, setMyTrips] = useState([]);
  
  const [formData, setFormData] = useState({ 
    destination: "", 
    startDate: "", 
    endDate: "", 
    arrivalTime: "14:00",
    departureTime: "12:00",
    otherRequirements: "" 
  });

  // ✨ 자동완성 및 유효성 검사 State
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isPlaceSelected, setIsPlaceSelected] = useState(false); // ✨ 장소 선택 여부 체크
  const debounceTimeout = useRef(null);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modifying, setModifying] = useState(false); 
  const [modificationPrompt, setModificationPrompt] = useState(""); 
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

  // ✨ 여행지 입력 핸들러
  const handleDestinationChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, destination: value });
    
    // 🚨 사용자가 타이핑을 시작하면 "선택됨" 상태를 해제 (목록에서 다시 골라야 함)
    setIsPlaceSelected(false); 

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    if (value.length > 1) {
      debounceTimeout.current = setTimeout(async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/places/autocomplete`, {
            params: { query: value }
          });
          setSuggestions(res.data.predictions || []);
          setShowSuggestions(true);
        } catch (err) {
          console.error("Autocomplete Error", err);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // ✨ 자동완성 목록 클릭 핸들러
  const selectSuggestion = (placeName) => {
    setFormData({ ...formData, destination: placeName });
    setSuggestions([]);
    setShowSuggestions(false);
    setIsPlaceSelected(true); // ✅ 목록에서 선택했으므로 유효함!
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!user) {
      if (confirm("로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?")) {
        router.push('/login');
      }
      return;
    }

    // ✨ 유효성 검사: 목록에서 선택하지 않았으면 막음
    if (!isPlaceSelected) {
      alert("여행지를 검색 후 목록에서 선택해주세요.");
      return;
    }

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        alert("출발일은 도착일보다 늦을 수 없습니다.");
        return;
      }
    }

    setLoading(true); setResult(null); setCurrentDayIndex(0);
    setShowSuggestions(false);

    try {
      const res = await axios.post(`${API_BASE_URL}/generate-trip`, { ...formData, user_id: user?.id });
      setResult(res.data.data);
    } catch (err) {
      alert("오류: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleModify = async () => {
    if (!modificationPrompt.trim()) return;
    setModifying(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/modify-trip`, {
        trip_id: result.id,
        currentItinerary: result.itinerary_data,
        userRequest: modificationPrompt,
        destination: result.destination,
        user_id: user?.id
      });
      
      setResult({ ...result, itinerary_data: res.data.data });
      setModificationPrompt("");
      alert("일정이 수정되었습니다! (자동 저장됨) ✨");
    } catch (err) {
      console.error(err);
      alert("수정 중 오류가 발생했습니다.");
    } finally {
      setModifying(false);
    }
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

  const handleShare = (e, tripId) => {
    if (e) e.stopPropagation();
    const shareUrl = `${window.location.origin}/share/${tripId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("공유 링크가 복사되었습니다! 🔗");
    }).catch(() => alert("링크 복사 실패"));
  };

  const getMapUrl = (activities) => {
    if (!activities) return null;
    const validPlaces = activities.filter(a => a.place_name && !a.place_name.includes("이동"));
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
    <div className="min-h-screen bg-white font-sans text-slate-800">
      
      {/* 헤더 */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 h-20 flex items-center">
        <div className="max-w-7xl mx-auto px-6 w-full flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab("home")}>
              <span className="text-3xl text-rose-500">✈️</span>
              <span className="text-xl font-bold text-rose-500 tracking-tight">TripGen</span>
            </div>
            
            <div className="hidden md:flex gap-2">
              <button onClick={() => setActiveTab("home")} className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab==="home" ? "bg-black text-white" : "text-slate-500 hover:bg-slate-100"}`}>일정 생성</button>
              {user && <button onClick={() => setActiveTab("mytrip")} className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab==="mytrip" ? "bg-black text-white" : "text-slate-500 hover:bg-slate-100"}`}>보관함</button>}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isUserLoading ? <div className="w-24 h-10 bg-slate-100 rounded-full animate-pulse"></div> : user ? (
              <div className="flex items-center gap-4">
                {user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && <button onClick={() => router.push('/admin')} className="text-xs font-semibold text-slate-500 hover:text-black">관리자</button>}
                <button onClick={() => router.push('/mypage')} className="flex items-center gap-2 border border-slate-200 rounded-full pl-3 pr-1 py-1 hover:shadow-md transition"><span className="text-sm font-semibold text-slate-700">MY</span><div className="w-8 h-8 bg-slate-500 rounded-full text-white flex items-center justify-center text-xs">👤</div></button>
              </div>
            ) : <button onClick={() => router.push('/login')} className="text-sm font-bold text-slate-800 hover:text-rose-500 transition">로그인</button>}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        
        {/* 탭 1: 보관함 */}
        {activeTab === "mytrip" && user && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between mb-6"><h2 className="text-3xl font-bold text-slate-900">내 여행</h2></div>
            {myTrips.length === 0 ? (
              <div className="border rounded-2xl p-16 text-center bg-slate-50"><h3 className="text-xl font-semibold text-slate-900 mb-2">아직 예약된 여행이 없습니다</h3><p className="text-slate-500 mb-6">TripGen과 함께 새로운 모험을 계획해보세요.</p><button onClick={() => setActiveTab('home')} className="bg-rose-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-rose-600 transition">여행 일정 만들기</button></div>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {myTrips.map(trip => {
                  const coverImage = getTripCoverImage(trip);
                  return (
                    <div key={trip.id} className="group cursor-pointer relative" onClick={() => { setResult(trip); setActiveTab("home"); }}>
                      <div className="relative aspect-[4/3] bg-slate-200 rounded-xl overflow-hidden mb-4 shadow-sm group-hover:shadow-md transition-all">
                         <img src={coverImage} alt={trip.destination} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" onError={(e) => {e.target.src = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80"}} />
                         <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-xs font-bold shadow-sm">{trip.duration}</div>
                         <button onClick={(e) => handleShare(e, trip.id)} className="absolute bottom-3 right-3 bg-white hover:bg-rose-50 text-slate-800 p-2 rounded-full shadow-md transition hover:scale-110 active:scale-95" title="공유 링크 복사">🔗</button>
                      </div>
                      <h3 className="font-semibold text-lg text-slate-900 truncate">{trip.itinerary_data.trip_title}</h3>
                      <p className="text-slate-500 text-sm font-medium">📍 {trip.destination}</p>
                      <p className="text-slate-400 text-xs mt-1">{new Date(trip.created_at).toLocaleDateString()}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 탭 2: 홈 */}
        {activeTab === "home" && (
          <>
            {!result && (
              <div className="max-w-4xl mx-auto animate-fade-in-up">
                <div className="text-center mb-10">
                  <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">어디로 떠나실 건가요?</h2>
                  <p className="text-lg text-slate-500">완벽한 여행을 위한 맞춤형 일정을 제안해 드립니다.</p>
                </div>
                
                <div className="bg-white p-8 rounded-[2rem] shadow-[0_6px_30px_rgba(0,0,0,0.08)] border border-slate-100 relative">
                  <form onSubmit={handleGenerate} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      
                      {/* ✨ 여행지 입력 (검색 후 선택 필수) */}
                      <div className="space-y-2 relative">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider ml-1">여행지</label>
                        <input 
                          placeholder="도시나 지역 검색 (예: 도쿄)" 
                          className={`w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border p-4 rounded-xl text-lg font-semibold placeholder:text-slate-400 outline-none transition-all ${!isPlaceSelected && formData.destination ? 'border-red-300 focus:ring-red-200' : 'border-none ring-1 ring-transparent focus:ring-slate-900'}`} 
                          value={formData.destination}
                          onChange={handleDestinationChange}
                          required 
                        />
                        {/* 경고 메시지 (선택 안 했을 때) */}
                        {!isPlaceSelected && formData.destination.length > 0 && (
                          <p className="text-xs text-red-500 mt-1 ml-1">⚠️ 목록에서 여행지를 선택해주세요.</p>
                        )}

                        {showSuggestions && suggestions.length > 0 && (
                          <div className="absolute top-full left-0 w-full bg-white border border-slate-100 rounded-xl shadow-xl mt-2 z-50 overflow-hidden max-h-60 overflow-y-auto">
                            {suggestions.map((item, idx) => (
                              <div key={idx} className="p-3 hover:bg-slate-50 cursor-pointer flex items-center gap-2 text-sm font-medium text-slate-700" onClick={() => selectSuggestion(item.description)}><span>📍</span>{item.description}</div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-800 uppercase tracking-wider ml-1">체크인</label><input type="date" className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border-none p-4 rounded-xl font-medium outline-none ring-1 ring-transparent focus:ring-slate-900 transition-all text-slate-600" onChange={e=>setFormData({...formData, startDate: e.target.value})} required /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-800 uppercase tracking-wider ml-1">체크아웃</label><input type="date" className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border-none p-4 rounded-xl font-medium outline-none ring-1 ring-transparent focus:ring-slate-900 transition-all text-slate-600" onChange={e=>setFormData({...formData, endDate: e.target.value})} required /></div>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500">도착 시간</label><input type="time" value={formData.arrivalTime} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-sm font-semibold outline-none focus:border-slate-900" onChange={e=>setFormData({...formData, arrivalTime: e.target.value})} /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500">출발 시간</label><input type="time" value={formData.departureTime} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-sm font-semibold outline-none focus:border-slate-900" onChange={e=>setFormData({...formData, departureTime: e.target.value})} /></div>
                        </div>
                        <div className="mt-6 space-y-1">
                           <label className="text-xs font-bold text-slate-500">기타 요구사항 (선택)</label>
                           <textarea placeholder="예: 해산물은 못 먹어요, 박물관 위주로 짜주세요." className="w-full bg-white border border-slate-200 p-3 rounded-lg text-sm font-medium outline-none focus:border-slate-900 h-24 resize-none" onChange={e=>setFormData({...formData, otherRequirements: e.target.value})} />
                        </div>
                    </div>

                    <div className="pt-2">
                      <button 
                        disabled={loading || !isPlaceSelected} 
                        className={`w-full p-4 rounded-xl font-bold text-lg shadow-lg transition-all duration-300 transform flex items-center justify-center gap-2
                          ${loading || !isPlaceSelected 
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none" 
                            : "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200 active:scale-[0.99]"}`}
                      >
                        {loading ? <><span className="animate-spin">⚪</span><span>여행 계획을 세우는 중...</span></> : <><span className="text-xl">✨</span><span>일정 생성하기</span></>}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 결과 및 수정 화면 (기존과 동일) */}
            {result && result.itinerary_data && (
              <div className="animate-slide-up pb-20">
                <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">{result.itinerary_data.trip_title}</h1>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span className="flex items-center gap-1"><span className="text-rose-500">📅</span> {result.duration}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><span className="text-rose-500">📍</span> {result.destination}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={(e) => handleShare(e, result.id)} className="px-5 py-2.5 rounded-lg bg-black text-white hover:bg-slate-800 text-sm font-bold transition shadow-md flex items-center gap-2"><span>🔗</span> 공유하기</button>
                    <button onClick={() => setResult(null)} className="px-5 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-bold transition">새로운 검색</button>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-200px)] min-h-[600px]">
                  <div className="lg:w-[45%] flex flex-col h-full">
                    <div className="flex overflow-x-auto pb-4 gap-2 mb-2 scrollbar-hide">
                      {result.itinerary_data.itinerary.map((day, idx) => (
                        <button key={idx} onClick={() => setCurrentDayIndex(idx)} className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${currentDayIndex === idx ? "bg-black text-white shadow-md" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>{day.day}일차</button>
                      ))}
                    </div>

                    <div className="flex-1 overflow-y-auto pr-4 space-y-6 pb-10 custom-scrollbar">
                        <div className="pl-4 border-l border-slate-200 space-y-8 ml-2 mt-2">
                            {result.itinerary_data.itinerary[currentDayIndex].activities.map((act, idx) => (
                                <div key={idx} className="relative">
                                    <div className="absolute -left-[21px] top-1 w-3 h-3 bg-rose-500 rounded-full ring-4 ring-white"></div>
                                    <div className="text-xs font-bold text-slate-400 mb-1">{act.time}</div>
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300 group">
                                        <div className="flex">
                                            <div className="w-32 bg-slate-100 shrink-0 relative">
                                                {act.photoUrl ? <img src={act.photoUrl} alt={act.place_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl bg-slate-50 text-slate-300">📷</div>}
                                            </div>
                                            <div className="p-4 flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="font-bold text-slate-900 line-clamp-1">{act.place_name}</h3>
                                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{act.type}</span>
                                                </div>
                                                <p className="text-sm text-slate-500 line-clamp-2 mb-3">{act.activity_description}</p>
                                                <div className="flex gap-3">
                                                    {act.googleMapsUri && <a href={act.googleMapsUri} target="_blank" className="text-xs font-semibold text-slate-900 hover:underline flex items-center gap-1">지도 보기</a>}
                                                    {act.booking_url && <a href={act.booking_url} target="_blank" className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1">예약하기 →</a>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {act.travel_info && <div className="mt-4 mb-2 flex items-center gap-2 text-xs text-slate-400 pl-1"><span className="border-l border-slate-300 h-4 block"></span><span>🚗 {act.travel_info.duration} ({act.travel_info.distance})</span></div>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-lg sticky bottom-0 z-20">
                      <label className="text-xs font-bold text-slate-500 mb-2 block flex items-center gap-1"><span>🤖</span> AI에게 일정 수정을 요청해보세요</label>
                      <div className="flex gap-2">
                        <input type="text" value={modificationPrompt} onChange={(e) => setModificationPrompt(e.target.value)} placeholder="예: 2일차 점심을 초밥집으로 바꿔줘" className="flex-1 bg-slate-50 border-none p-3 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-slate-200 transition-all" onKeyDown={(e) => e.key === 'Enter' && !modifying && handleModify()} />
                        <button onClick={handleModify} disabled={modifying || !modificationPrompt.trim()} className="bg-black text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center shadow-sm">{modifying ? <span className="animate-spin">⏳</span> : "수정"}</button>
                      </div>
                    </div>
                  </div>

                  <div className="lg:w-[55%] h-full bg-slate-100 rounded-2xl overflow-hidden shadow-inner border border-slate-200 sticky top-24 hidden lg:block">
                    {getMapUrl(result.itinerary_data.itinerary[currentDayIndex].activities) ? (
                      <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen src={getMapUrl(result.itinerary_data.itinerary[currentDayIndex].activities)}></iframe>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-slate-400"><span>지도를 불러올 수 없습니다</span></div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <footer className="border-t border-slate-100 py-8 mt-12 bg-slate-50"><div className="max-w-7xl mx-auto px-6 text-center text-slate-400 text-sm">© 2025 TripGen Inc. All rights reserved.</div></footer>
    </div>
  );
}