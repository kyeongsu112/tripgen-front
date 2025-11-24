"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider"; // ✨ 다크모드 훅 불러오기

// --- 설정 ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const API_BASE_URL = "https://tripgen-server.onrender.com/api"; 
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function HomeContent() {
  const [user, setUser] = useState(null);
  const [usageInfo, setUsageInfo] = useState({ tier: 'free', usage_count: 0 });
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [myTrips, setMyTrips] = useState([]);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('view') || 'home'; 

  // ✨ 다크모드 상태 가져오기
  const { theme, toggleTheme } = useTheme();

  const [formData, setFormData] = useState({ 
    destination: "", startDate: "", endDate: "", arrivalTime: "09:00", departureTime: "21:00", otherRequirements: "" 
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

  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showMobileMap, setShowMobileMap] = useState(false);

  const [generateCount, setGenerateCount] = useState(0); 
  const [showAd, setShowAd] = useState(false);         
  const [adTimer, setAdTimer] = useState(30);          
  const [pendingAction, setPendingAction] = useState(null);
  
  useEffect(() => {
    const checkUser = async () => {
      setIsUserLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        fetchUsageInfo(session.user.id);
      }
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        if (session) fetchUsageInfo(session.user.id);
      });
      setIsUserLoading(false);
      return () => subscription.unsubscribe();
    };
    checkUser();
  }, []);

  const fetchUsageInfo = async (userId) => {
    const { data } = await supabase.from('user_limits').select('*').eq('user_id', userId).single();
    if (data) setUsageInfo(data);
  };

  useEffect(() => {
    if (activeTab === "mytrip" && user) {
        fetchMyTrips();
    }
  }, [activeTab, user]);

  const fetchMyTrips = async () => {
      if(!user) return;
      try {
        const res = await axios.get(`${API_BASE_URL}/my-trips?user_id=${user.id}`);
        setMyTrips(res.data.data);
      } catch(err) { console.error(err); }
  };

  useEffect(() => {
    setSelectedActivity(null);
    setShowMobileMap(false);
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

  const handleLogoClick = () => {
    router.push('/?view=home');
    setResult(null);
    setCurrentDayIndex(0);
    setSelectedActivity(null);
  };

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
      fetchUsageInfo(user.id);
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

  const handleDelete = async (e, tripId) => {
      e.stopPropagation();
      if(!confirm("정말 삭제하시겠습니까?")) return;
      try {
          await axios.delete(`${API_BASE_URL}/trip/${tripId}`, { data: { user_id: user.id } });
          setMyTrips(prev => prev.filter(t => t.id !== tripId));
          alert("삭제되었습니다.");
      } catch(err) { alert("삭제 실패"); }
  };

  const getMapUrl = (activities) => {
    if (!activities || activities.length === 0) return null;

    if (selectedActivity) {
        const query = selectedActivity.place_id 
            ? `place_id:${selectedActivity.place_id}` 
            : encodeURIComponent(selectedActivity.place_name);
        return `http://googleusercontent.com/maps.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${query}`;
    }

    const validPlaces = activities.filter(a => a.place_name && !a.place_name.includes("이동"));
    if (validPlaces.length < 2) {
        if(validPlaces.length === 1) {
            const query = validPlaces[0].place_id ? `place_id:${validPlaces[0].place_id}` : encodeURIComponent(validPlaces[0].place_name);
            return `http://googleusercontent.com/maps.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${query}`;
        }
        return null;
    }

    const origin = validPlaces[0].place_id ? `place_id:${validPlaces[0].place_id}` : encodeURIComponent(validPlaces[0].place_name);
    const destination = validPlaces[validPlaces.length-1].place_id ? `place_id:${validPlaces[validPlaces.length-1].place_id}` : encodeURIComponent(validPlaces[validPlaces.length-1].place_name);
    
    let waypoints = "";
    if (validPlaces.length > 2) {
      const wpList = validPlaces.slice(1, -1).map(p => p.place_id ? `place_id:${p.place_id}` : encodeURIComponent(p.place_name)).join("|");
      waypoints = `&waypoints=${wpList}`;
    }
    return `http://googleusercontent.com/maps.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_API_KEY}&origin=${origin}&destination=${destination}${waypoints}&mode=transit`;
  };

  return (
<div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300">      
      {/* 광고 모달 (다크모드 적용) */}
      {showAd && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl relative">
            <div className="p-4 bg-slate-100 dark:bg-slate-700 flex justify-between items-center">
                <span className="font-bold text-slate-700 dark:text-slate-200">📢 잠시 광고 보고 가실게요!</span>
                <span className="text-rose-500 font-black text-lg">{adTimer}초</span>
            </div>
            <div className="aspect-video bg-black relative">
               <iframe 
                  width="100%" height="100%" 
                  src={`https://www.youtube.com/embed/fEErySYqItI?autoplay=1&controls=0&disablekb=1&modestbranding=1`} 
                  title="Ad Video" frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen className="pointer-events-none"
                ></iframe>
                <div className="absolute inset-0"></div>
            </div>
            <div className="p-6 text-center">
              <p className="text-slate-600 dark:text-slate-300 mb-2 font-bold text-lg">광고를 30초간 시청해주시면<br/><span className="text-rose-500">여행 일정을 무료로 생성</span>해 드립니다! 🎁</p>
              <button onClick={closeAdAndResume} disabled={adTimer > 0} className={`w-full py-4 rounded-xl font-black text-lg transition-all duration-300 ${adTimer > 0 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-rose-500 text-white hover:bg-rose-600 shadow-lg hover:-translate-y-1 animate-bounce-short"}`}>
                {adTimer > 0 ? `광고 시청 중... (${adTimer})` : "광고 닫고 일정 생성하기 ✨"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 h-16 md:h-20 flex items-center transition-colors">
        <div className="max-w-7xl mx-auto px-4 md:px-6 w-full flex justify-between items-center">
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={handleLogoClick}>
              <span className="text-2xl md:text-3xl text-rose-500">✈️</span>
              <span className="text-lg md:text-xl font-extrabold tracking-tight text-rose-500">TripGen</span>
            </div>
            
            {/* 데스크톱 메뉴 */}
            <div className="hidden md:flex items-center gap-4">
                {/* 그룹 1: 일정 */}
                <div className="flex gap-1 bg-slate-100/80 dark:bg-slate-800 p-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                    <button onClick={() => router.push('/?view=home')} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeTab==="home" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}>일정 생성</button>
                    <button onClick={() => { if(user) router.push('/?view=mytrip'); else alert('로그인이 필요합니다.'); }} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeTab==="mytrip" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}>보관함</button>
                </div>
                {/* 그룹 2: 커뮤니티 */}
                <div className="flex gap-1 bg-slate-100/80 dark:bg-slate-800 p-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                    <button onClick={() => router.push('/community')} className="px-5 py-2 rounded-full text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all">공유게시판</button>
                    <button onClick={() => router.push('/board')} className="px-5 py-2 rounded-full text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all">건의함</button>
                </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* ✨ 다크모드 토글 버튼 */}
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title="테마 변경"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>

            {/* 모바일 메뉴 */}
            <div className="flex md:hidden gap-1 mr-1">
               <button onClick={() => router.push('/?view=home')} className={`text-xs font-bold px-2 py-1.5 rounded-lg ${activeTab==="home" ? "bg-black text-white" : "bg-slate-100 text-slate-600"}`}>생성</button>
               <button onClick={() => { if(user) router.push('/?view=mytrip'); else alert('로그인 필요'); }} className={`text-xs font-bold px-2 py-1.5 rounded-lg ${activeTab==="mytrip" ? "bg-black text-white" : "bg-slate-100 text-slate-600"}`}>보관</button>
            </div>

            {isUserLoading ? <div className="w-24 h-9 bg-slate-100 rounded-full animate-pulse"></div> : user ? (
              <div className="flex items-center gap-2 md:gap-3">
                <span className="hidden lg:block text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-700">{usageInfo.tier === 'admin' ? '∞' : `남은 횟수: ${Math.max(0, (usageInfo.tier==='pro'?30:3) - usageInfo.usage_count)}`}</span>
                {user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && <button onClick={() => router.push('/admin')} className="text-xs font-bold text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white">ADMIN</button>}
                <button onClick={() => router.push('/mypage')} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full pl-2 pr-1 py-1 hover:shadow-md transition duration-200"><span className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1 hidden sm:inline">MY</span><div className="w-7 h-7 bg-slate-800 dark:bg-slate-600 rounded-full text-white flex items-center justify-center text-[10px]">👤</div></button>
              </div>
            ) : <button onClick={() => router.push('/login')} className="text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-rose-500 transition px-2">로그인</button>}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
        
        {/* 보관함 탭 */}
        {activeTab === "mytrip" && user && (
          <div className="space-y-8 animate-fade-in-up">
             <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-slate-900 dark:text-white">내 여행 보관함</h2><span className="text-rose-500 font-bold text-lg">{myTrips.length}</span></div>
             {myTrips.length === 0 ? (
               <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-24 text-center bg-slate-50/50 dark:bg-slate-800/50"><div className="text-5xl mb-4 opacity-20">🗺️</div><p className="text-slate-500 dark:text-slate-400 font-medium mb-6">아직 저장된 여행 일정이 없습니다.</p><button onClick={handleLogoClick} className="text-rose-500 font-bold hover:underline">첫 번째 여행을 계획해보세요</button></div>
             ) : (
               <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {myTrips.map(trip => {
                    const coverImage = getTripCoverImage(trip);
                    return (
                      <div key={trip.id} className="group cursor-pointer relative" onClick={() => { setResult(trip); router.push('/?view=home'); }}>
                        <div className="relative aspect-[4/3] bg-slate-200 dark:bg-slate-700 rounded-xl overflow-hidden mb-4 shadow-sm group-hover:shadow-md transition-all">
                           <img src={coverImage} alt={trip.destination} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" onError={(e) => {e.target.src = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80"}} />
                           <div className="absolute top-3 left-3 bg-white/90 dark:bg-black/80 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm text-slate-900 dark:text-white">{trip.duration}</div>
                           
                           <div className="absolute bottom-3 right-3 flex gap-2">
                              <button onClick={(e) => handleShare(e, trip.id)} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white p-2 rounded-full shadow-md hover:text-blue-600 transition hover:scale-110" title="공유">🔗</button>
                              <button onClick={(e) => handleDelete(e, trip.id)} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white p-2 rounded-full shadow-md hover:text-rose-500 transition hover:scale-110" title="삭제">🗑️</button>
                           </div>
                        </div>
                        <div className="px-1">
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate mb-1 group-hover:text-rose-500 transition-colors">{trip.itinerary_data.trip_title}</h3>
                          <div className="flex justify-between items-center text-sm"><p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1"><span>📍</span> {trip.destination}</p><p className="text-slate-400 dark:text-slate-500 text-xs">{new Date(trip.created_at).toLocaleDateString()}</p></div>
                        </div>
                      </div>
                    );
                  })}
               </div>
             )}
          </div>
        )}

        {/* 홈 탭 */}
        {activeTab === "home" && (
          <>
            {!result && (
              <div className="max-w-4xl mx-auto animate-fade-in-up">
                <div className="text-center mb-8 md:mb-12">
                  <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-3 md:mb-4 tracking-tight">어디로 떠나실 건가요?</h2>
                  <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 font-medium">완벽한 여행을 위한 맞춤형 일정을 제안해 드립니다.</p>
                </div>
                
                <div className="bg-white dark:bg-slate-800 p-6 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-100 dark:border-slate-700 relative transition-colors">
                  <form onSubmit={handleGenerateClick} className="space-y-6 md:space-y-8">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                      <div className="space-y-2 relative">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider ml-1">여행지</label>
                        <input 
                          placeholder="도시나 지역 검색" 
                          className={`w-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-950 focus:bg-white dark:focus:bg-black border p-4 rounded-xl text-lg font-bold placeholder:text-slate-400 outline-none transition-all ${!isPlaceSelected && formData.destination ? 'border-red-300 focus:ring-red-200' : 'border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500'}`} 
                          value={formData.destination}
                          onChange={handleDestinationChange}
                          required 
                        />
                        {!isPlaceSelected && formData.destination.length > 0 && <p className="text-xs text-red-500 mt-1 ml-1 font-bold">⚠️ 목록에서 여행지를 선택해주세요.</p>}
                        {showSuggestions && suggestions.length > 0 && (
                          <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl mt-2 z-50 overflow-hidden max-h-60 overflow-y-auto">
                            {suggestions.map((item, idx) => (
                              <div key={idx} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200 border-b border-slate-50 dark:border-slate-700 last:border-none" onClick={() => selectSuggestion(item.description)}><span className="text-lg">📍</span>{item.description}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider ml-1">출발일</label><input type="date" className="w-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-950 focus:bg-white dark:focus:bg-black border border-slate-100 dark:border-slate-700 p-4 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 transition-all" onChange={e=>setFormData({...formData, startDate: e.target.value})} required /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider ml-1">마지막 날</label><input type="date" min={formData.startDate} className="w-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-950 focus:bg-white dark:focus:bg-black border border-slate-100 dark:border-slate-700 p-4 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 transition-all" onChange={e=>setFormData({...formData, endDate: e.target.value})} required /></div>
                      </div>
                    </div>

                    <div className="p-5 md:p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">여행 시작 시간</label><input type="time" value={formData.arrivalTime} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 p-3 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-slate-900 dark:focus:border-slate-400" onChange={e=>setFormData({...formData, arrivalTime: e.target.value})} /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">여행 종료 시간</label><input type="time" value={formData.departureTime} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 p-3 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-slate-900 dark:focus:border-slate-400" onChange={e=>setFormData({...formData, departureTime: e.target.value})} /></div>
                        </div>
                        <div className="mt-6 space-y-2">
                           <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">기타 요구사항 (선택)</label>
                           <textarea placeholder="예: 친구와 함께하는 힐링 여행, 해산물은 못 먹어요." className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 p-4 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-slate-900 dark:focus:border-slate-400 h-24 resize-none" onChange={e=>setFormData({...formData, otherRequirements: e.target.value})} />
                        </div>
                    </div>

                    <div className="pt-4">
                      <button disabled={loading || !isPlaceSelected} className={`w-full p-4 rounded-xl font-black text-lg shadow-lg transition-all duration-300 transform flex items-center justify-center gap-2 ${loading || !isPlaceSelected ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none" : "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200 dark:shadow-none active:scale-[0.99] hover:shadow-xl"}`}>
                        {loading ? <><span className="animate-spin">⚪</span><span>여행 계획을 세우는 중...</span></> : <><span className="text-xl">✨</span><span>일정 생성하기</span></>}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {result && result.itinerary_data && (
              <div className="animate-slide-up pb-20">
                {/* 결과 화면 상단 */}
                <div className="mb-10 border-b border-slate-100 dark:border-slate-800 pb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-3">{result.itinerary_data.trip_title}</h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-slate-500 dark:text-slate-400">
                      <span className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 flex items-center gap-1.5"><span className="text-rose-500">🗓️</span> {result.duration}</span>
                      <span className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 flex items-center gap-1.5"><span className="text-rose-500">📍</span> {result.destination}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button onClick={(e) => handleShare(e, result.id)} className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200 text-sm font-bold transition shadow-md flex items-center justify-center gap-2"><span>🔗</span> 공유하기</button>
                    <button onClick={handleLogoClick} className="flex-1 md:flex-none px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300 transition">새로운 검색</button>
                  </div>
                </div>

                {/* 메인 컨텐츠 */}
                <div className="flex flex-col lg:flex-row gap-10 h-[calc(100vh-200px)] min-h-[600px]">
                  <div className={`lg:w-[45%] flex flex-col h-full ${showMobileMap ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="flex overflow-x-auto pb-4 gap-2 mb-2 scrollbar-hide px-1">
                      {result.itinerary_data.itinerary.map((day, idx) => (
                        <button key={idx} onClick={() => setCurrentDayIndex(idx)} className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-sm ${currentDayIndex === idx ? "bg-black dark:bg-white text-white dark:text-black scale-105" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>{day.day}일차</button>
                      ))}
                    </div>

                    <div className="flex-1 lg:overflow-y-auto pr-0 lg:pr-4 space-y-6 pb-24 lg:pb-10 custom-scrollbar">
                        <div className="pl-4 border-l-2 border-slate-100 dark:border-slate-700 space-y-8 ml-2 mt-2">
                            {result.itinerary_data.itinerary[currentDayIndex].activities.map((act, idx) => (
                                <div key={idx} className="relative group">
                                    <div className="absolute -left-[23px] top-1 w-4 h-4 bg-rose-500 rounded-full ring-4 ring-white dark:ring-slate-900 shadow-sm"></div>
                                    <div className="text-xs font-bold text-slate-400 mb-2 pl-1">{act.time}</div>
                                    
                                    <div onClick={() => { setSelectedActivity(act); setShowMobileMap(true); }} className={`bg-white dark:bg-slate-800 rounded-2xl border overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer ${selectedActivity === act ? 'border-rose-500 ring-2 ring-rose-100 dark:ring-rose-900' : 'border-slate-200 dark:border-slate-700'}`}>
                                        <div className="flex flex-col sm:flex-row">
                                            <div className="w-full sm:w-32 h-32 sm:h-auto bg-slate-100 dark:bg-slate-700 shrink-0 relative overflow-hidden">
                                                {act.photoUrl ? <img src={act.photoUrl} alt={act.place_name} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" /> : <div className="w-full h-full flex items-center justify-center text-2xl bg-slate-50 dark:bg-slate-700 text-slate-300">📍</div>}
                                            </div>
                                            <div className="p-5 flex-1 flex flex-col justify-between">
                                                <div>
                                                  <div className="flex justify-between items-start mb-1"><h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{act.place_name}</h3><span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded-full shrink-0 ml-2">{act.type}</span></div>
                                                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">{act.activity_description}</p>
                                                </div>
                                                <div className="flex gap-2 flex-wrap">
                                                    {act.googleMapsUri && <a href={act.googleMapsUri} target="_blank" onClick={(e)=>e.stopPropagation()} className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition flex items-center gap-1">🗺️ 구글맵</a>}
                                                    {act.booking_url && <a href={act.booking_url} target="_blank" onClick={(e)=>e.stopPropagation()} className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 transition flex items-center gap-1">🎟️ 예약하기</a>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {act.travel_info && <div className="mt-4 mb-2 flex items-center gap-2 text-xs text-slate-400 pl-1"><div className="h-6 border-l border-dashed border-slate-300 dark:border-slate-600"></div><div className="bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-100 dark:border-slate-700 flex items-center gap-1 font-bold text-slate-600 dark:text-slate-400"><span>🚗</span><span>{act.travel_info.duration}</span><span className="text-slate-300 dark:text-slate-600">|</span><span>{act.travel_info.distance}</span></div></div>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-lg sticky bottom-0 z-20">
                      <label className="text-xs font-bold text-slate-500 mb-2 block flex items-center gap-1"><span>🤖</span> AI에게 일정 수정을 요청해보세요</label>
                      <div className="flex gap-2">
                        <input type="text" value={modificationPrompt} onChange={(e) => setModificationPrompt(e.target.value)} placeholder="예: 점심을 초밥집으로 바꿔줘" className="flex-1 bg-slate-50 dark:bg-slate-900 border-none p-3 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 transition-all" onKeyDown={(e) => e.key === 'Enter' && !modifying && handleModify()} />
                        <button onClick={handleModify} disabled={modifying || !modificationPrompt.trim()} className="bg-rose-500 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center shadow-sm">{modifying ? <span className="animate-spin">⏳</span> : "수정"}</button>
                      </div>
                    </div>
                  </div>

                  <div className={`lg:w-[55%] h-full bg-slate-100 dark:bg-slate-800 lg:rounded-[2rem] overflow-hidden shadow-inner border border-slate-200 dark:border-slate-700 lg:sticky lg:top-24 ${showMobileMap ? 'fixed inset-0 z-50 rounded-none' : 'hidden lg:block relative'}`}>
                    {getMapUrl(result.itinerary_data.itinerary[currentDayIndex].activities) ? (
                      <>
                        <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen src={getMapUrl(result.itinerary_data.itinerary[currentDayIndex].activities)} className="grayscale-[20%] contrast-[1.1] hover:grayscale-0 transition-all duration-500"></iframe>
                        {showMobileMap && <button onClick={() => setShowMobileMap(false)} className="absolute top-4 right-4 bg-white text-black p-3 rounded-full shadow-lg font-bold z-50">✕ 닫기</button>}
                        {selectedActivity && !showMobileMap && <button onClick={() => setSelectedActivity(null)} className="absolute top-4 left-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur text-slate-800 dark:text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold hover:bg-white dark:hover:bg-slate-700 transition flex items-center gap-2">🔙 전체 경로 보기</button>}
                      </>
                    ) : <div className="flex h-full flex-col items-center justify-center text-slate-400 gap-2"><span className="text-4xl opacity-50">🗺️</span><span className="font-medium">지도 정보를 불러올 수 없습니다.</span></div>}
                  </div>

                </div>
                
                {/* 모바일용 지도 버튼 */}
                {!showMobileMap && (
                    <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
                        <button onClick={() => setShowMobileMap(true)} className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full shadow-xl font-bold flex items-center gap-2 hover:scale-105 transition">🗺️ 지도 보기</button>
                    </div>
                )}

                {/* 수정 요청 바 (모바일 하단 고정) */}
                {!showMobileMap && (
                    <div className="fixed lg:static bottom-0 left-0 w-full bg-white dark:bg-slate-800 border-t lg:border border-slate-200 dark:border-slate-700 p-4 rounded-t-2xl lg:rounded-2xl shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-30">
                      <div className="max-w-6xl mx-auto lg:max-w-none">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block flex items-center gap-1"><span>🤖</span> AI에게 일정 수정을 요청해보세요</label>
                          <div className="flex gap-2">
                            <input type="text" value={modificationPrompt} onChange={(e) => setModificationPrompt(e.target.value)} placeholder="예: 점심을 초밥집으로 바꿔줘" className="flex-1 bg-slate-50 dark:bg-slate-900 border-none p-3 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 transition-all" onKeyDown={(e) => e.key === 'Enter' && !modifying && handleModify()} />
                            <button onClick={handleModify} disabled={modifying || !modificationPrompt.trim()} className="bg-rose-500 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center shadow-sm">{modifying ? <span className="animate-spin">⏳</span> : "수정"}</button>
                          </div>
                      </div>
                    </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
      <footer className="border-t border-slate-100 dark:border-slate-800 py-10 mt-12 bg-slate-50 dark:bg-slate-900"><div className="max-w-7xl mx-auto px-6 text-center text-slate-400 text-sm">© 2025 TripGen Inc. All rights reserved.</div></footer>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900"><div className="animate-spin text-4xl">⚪</div></div>}>
      <HomeContent />
    </Suspense>
  );
}