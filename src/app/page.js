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

// 배포 주소
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

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isPlaceSelected, setIsPlaceSelected] = useState(false); 
  const debounceTimeout = useRef(null);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modifying, setModifying] = useState(false); 
  const [modificationPrompt, setModificationPrompt] = useState(""); 
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  // 광고
  const [generateCount, setGenerateCount] = useState(0); 
  const [showAd, setShowAd] = useState(false);         
  const [adTimer, setAdTimer] = useState(30);          
  const [pendingAction, setPendingAction] = useState(null);

  // ✨ [추가] 지도 인터랙션을 위한 선택된 장소 상태
  const [selectedActivity, setSelectedActivity] = useState(null);
  
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

  // 날짜 탭 변경 시 선택된 장소 초기화
  useEffect(() => {
    setSelectedActivity(null);
  }, [currentDayIndex]);

  useEffect(() => {
    let interval;
    if (showAd && adTimer > 0) {
      interval = setInterval(() => {
        setAdTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showAd, adTimer]);

  const handleDestinationChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, destination: value });
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

  const selectSuggestion = (placeName) => {
    setFormData({ ...formData, destination: placeName });
    setSuggestions([]);
    setShowSuggestions(false);
    setIsPlaceSelected(true);
  };

  const executeGenerate = async () => {
    setLoading(true); setResult(null); setCurrentDayIndex(0); setSelectedActivity(null);
    setShowSuggestions(false);

    try {
      const res = await axios.post(`${API_BASE_URL}/generate-trip`, { ...formData, user_id: user?.id });
      setResult(res.data.data);
      setGenerateCount(prev => prev + 1);
    } catch (err) {
      alert("오류: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateClick = (e) => {
    e.preventDefault();
    if (!user) {
      if (confirm("로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?")) {
        router.push('/login');
      }
      return;
    }

    if (!isPlaceSelected) {
      alert("여행지를 검색 후 목록에서 선택해주세요.");
      return;
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (start > end) {
        alert("마지막 날이 출발일보다 빠를 수 없습니다.");
        return;
      }
      if (formData.startDate === formData.endDate) {
        if (formData.departureTime <= formData.arrivalTime) {
          alert("당일치기 여행입니다.\n종료 시간이 시작 시간보다 늦어야 합니다.");
          return;
        }
      }
    }

    if (generateCount > 0 && generateCount % 3 === 0 && !showAd) {
        setPendingAction(() => executeGenerate);
        setAdTimer(30);
        setShowAd(true);
    } else {
        executeGenerate();
    }
  };

  const closeAdAndResume = () => {
      setShowAd(false);
      setGenerateCount(prev => prev + 1); 
      if (pendingAction) {
          pendingAction();
          setPendingAction(null);
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

  const handleLogoClick = () => {
    setActiveTab("home");
    setResult(null);
    setCurrentDayIndex(0);
    setSelectedActivity(null);
  };

  // ✨ [핵심] 지도 URL 생성 함수 (선택된 장소 우선)
  const getMapUrl = (activities) => {
    if (!activities || activities.length === 0) return null;

    // 1. 사용자가 카드를 클릭했다면 -> 그 장소만 보여주는 'Place Mode' URL 반환
    if (selectedActivity) {
        const query = selectedActivity.place_id 
            ? `place_id:${selectedActivity.place_id}` 
            : encodeURIComponent(selectedActivity.place_name);
        return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${query}`;
    }

    // 2. 선택된 게 없다면 -> 전체 경로 'Directions Mode' URL 반환
    const validPlaces = activities.filter(a => a.place_name && !a.place_name.includes("이동"));
    if (validPlaces.length < 2) {
        // 장소가 1개뿐이면 그냥 그 장소만 보여줌
        if(validPlaces.length === 1) {
            const query = validPlaces[0].place_id ? `place_id:${validPlaces[0].place_id}` : encodeURIComponent(validPlaces[0].place_name);
            return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${query}`;
        }
        return null;
    }

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
      
      {/* 광고 모달 */}
      {showAd && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl relative">
            <div className="p-4 bg-slate-100 flex justify-between items-center">
                <span className="font-bold text-slate-700">📢 잠시 광고 보고 가실게요!</span>
                <span className="text-rose-500 font-black text-lg">{adTimer}초</span>
            </div>
            <div className="aspect-video bg-black relative">
               <iframe 
                  width="100%" 
                  height="100%" 
                  src={`https://www.youtube.com/embed/fEErySYqItI?autoplay=1&controls=0&disablekb=1&modestbranding=1`} 
                  title="Ad Video" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                  className="pointer-events-none"
                ></iframe>
                <div className="absolute inset-0"></div>
            </div>
            <div className="p-6 text-center">
              <p className="text-slate-600 mb-2 font-bold text-lg">
                광고를 30초간 시청해주시면<br/>
                <span className="text-rose-500">여행 일정을 무료로 생성</span>해 드립니다! 🎁
              </p>
              <p className="text-slate-400 text-xs mb-6">TripGen은 여러분의 광고 시청으로 운영됩니다.</p>
              <button 
                onClick={closeAdAndResume}
                disabled={adTimer > 0}
                className={`w-full py-4 rounded-xl font-black text-lg transition-all duration-300 ${
                    adTimer > 0 
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                    : "bg-rose-500 text-white hover:bg-rose-600 shadow-lg hover:-translate-y-1 animate-bounce-short"
                }`}
              >
                {adTimer > 0 ? `광고 시청 중... (${adTimer})` : "광고 닫고 일정 생성하기 ✨"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 h-20 flex items-center">
        <div className="max-w-7xl mx-auto px-6 w-full flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={handleLogoClick}>
              <span className="text-3xl text-rose-500">✈️</span>
              <span className="text-xl font-bold text-rose-500 tracking-tight">TripGen</span>
            </div>
            <div className="hidden md:flex gap-2">
              <button onClick={handleLogoClick} className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab==="home" ? "bg-black text-white" : "text-slate-500 hover:bg-slate-100"}`}>일정 생성</button>
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
        {/* 보관함 탭 (생략 - 기존 코드 동일) */}
        {activeTab === "mytrip" && user && (
          <div className="space-y-8 animate-fade-in-up">
             {/* ... (기존 코드 유지) ... */}
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
          </div>
        )}

        {/* 홈 탭 (입력 폼 & 결과) */}
        {activeTab === "home" && (
          <>
            {!result && (
              <div className="max-w-4xl mx-auto animate-fade-in-up">
                <div className="text-center mb-10">
                  <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">어디로 떠나실 건가요?</h2>
                  <p className="text-lg text-slate-500">완벽한 여행을 위한 맞춤형 일정을 제안해 드립니다.</p>
                </div>
                <div className="bg-white p-8 rounded-[2rem] shadow-[0_6px_30px_rgba(0,0,0,0.08)] border border-slate-100 relative">
                  <form onSubmit={handleGenerateClick} className="space-y-8">
                    {/* ... (입력 폼 코드 기존 동일) ... */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2 relative">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider ml-1">여행지</label>
                        <input placeholder="도시나 지역 검색" className={`w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border p-4 rounded-xl text-lg font-semibold placeholder:text-slate-400 outline-none transition-all ${!isPlaceSelected && formData.destination ? 'border-red-300 focus:ring-red-200' : 'border-none ring-1 ring-transparent focus:ring-slate-900'}`} value={formData.destination} onChange={handleDestinationChange} required />
                        {showSuggestions && suggestions.length > 0 && (
                          <div className="absolute top-full left-0 w-full bg-white border border-slate-100 rounded-xl shadow-xl mt-2 z-50 overflow-hidden max-h-60 overflow-y-auto">
                            {suggestions.map((item, idx) => (
                              <div key={idx} className="p-3 hover:bg-slate-50 cursor-pointer flex items-center gap-2 text-sm font-medium text-slate-700" onClick={() => selectSuggestion(item.description)}><span>📍</span>{item.description}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-800 uppercase tracking-wider ml-1">출발일</label><input type="date" className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border-none p-4 rounded-xl font-medium outline-none ring-1 ring-transparent focus:ring-slate-900 transition-all text-slate-600" onChange={e=>setFormData({...formData, startDate: e.target.value})} required /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-800 uppercase tracking-wider ml-1">마지막 날</label><input type="date" min={formData.startDate} className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border-none p-4 rounded-xl font-medium outline-none ring-1 ring-transparent focus:ring-slate-900 transition-all text-slate-600" onChange={e=>setFormData({...formData, endDate: e.target.value})} required /></div>
                      </div>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500">여행 시작 시간</label><input type="time" value={formData.arrivalTime} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-sm font-semibold outline-none focus:border-slate-900" onChange={e=>setFormData({...formData, arrivalTime: e.target.value})} /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500">여행 종료 시간</label><input type="time" value={formData.departureTime} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-sm font-semibold outline-none focus:border-slate-900" onChange={e=>setFormData({...formData, departureTime: e.target.value})} /></div>
                        </div>
                        <div className="mt-6 space-y-1">
                           <label className="text-xs font-bold text-slate-500">기타 요구사항 (선택)</label>
                           <textarea placeholder="예: 친구와 함께하는 힐링 여행, 해산물은 못 먹어요, 박물관 위주로 짜주세요." className="w-full bg-white border border-slate-200 p-3 rounded-lg text-sm font-medium outline-none focus:border-slate-900 h-24 resize-none" onChange={e=>setFormData({...formData, otherRequirements: e.target.value})} />
                        </div>
                    </div>
                    <div className="pt-2">
                      <button disabled={loading || !isPlaceSelected} className={`w-full p-4 rounded-xl font-bold text-lg shadow-lg transition-all duration-300 transform flex items-center justify-center gap-2 ${loading || !isPlaceSelected ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none" : "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200 active:scale-[0.99]"}`}>
                        {loading ? <><span className="animate-spin">⚪</span><span>여행 계획을 세우는 중...</span></> : <><span className="text-xl">✨</span><span>일정 생성하기</span></>}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 결과 화면 */}
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
                    <button onClick={handleLogoClick} className="px-5 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-bold transition">새로운 검색</button>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-200px)] min-h-[600px]">
                  <div className="lg:w-[45%] flex flex-col h-full">
                    <div className="flex overflow-x-auto pb-4 gap-2 mb-2 scrollbar-hide px-1">
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
                                    {/* ✨ 클릭 시 지도 표시 (onClick 추가) */}
                                    <div 
                                      onClick={() => setSelectedActivity(act)} 
                                      className={`bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-shadow duration-300 group cursor-pointer ${selectedActivity === act ? 'border-rose-500 ring-2 ring-rose-100' : 'border-slate-200'}`}
                                    >
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
                                                {/* 지도 보기 버튼 없애거나, 외부 링크로 유지 */}
                                                <div className="flex gap-3">
                                                    {act.googleMapsUri && <a href={act.googleMapsUri} target="_blank" onClick={(e)=>e.stopPropagation()} className="text-xs font-semibold text-slate-900 hover:underline flex items-center gap-1">구글맵 열기</a>}
                                                    {act.booking_url && <a href={act.booking_url} target="_blank" onClick={(e)=>e.stopPropagation()} className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1">예약하기 →</a>}
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

                  <div className="lg:w-[55%] h-full bg-slate-100 rounded-2xl overflow-hidden shadow-inner border border-slate-200 sticky top-24 hidden lg:block relative">
                    {getMapUrl(result.itinerary_data.itinerary[currentDayIndex].activities) ? (
                      <>
                        <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen src={getMapUrl(result.itinerary_data.itinerary[currentDayIndex].activities)}></iframe>
                        {/* ✨ 전체 경로 보기 버튼 (개별 장소 선택 시 나타남) */}
                        {selectedActivity && (
                           <button 
                             onClick={() => setSelectedActivity(null)}
                             className="absolute top-4 left-4 bg-white text-slate-800 px-4 py-2 rounded-full shadow-md text-sm font-bold hover:bg-slate-50 transition"
                           >
                             🔙 전체 경로 보기
                           </button>
                        )}
                      </>
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