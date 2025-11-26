"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Calendar from "@/components/Calendar";


// --- 설정 ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// const API_BASE_URL = "http://localhost:8080/api"; // 로컬 테스트용
const API_BASE_URL = "https://tripgen-server.onrender.com/api";
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  console.error("⚠️ Google Maps API Key is missing! Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file.");
}

function HomeContent() {
  const [user, setUser] = useState(null);
  const [usageInfo, setUsageInfo] = useState({ tier: 'free', usage_count: 0 });
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [myTrips, setMyTrips] = useState([]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('view') || 'home';



  const [formData, setFormData] = useState({
    destination: "", startDate: "", endDate: "", arrivalTime: "09:00", departureTime: "21:00", travelers: 1, budget: "", otherRequirements: ""
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
  const [showCalendar, setShowCalendar] = useState(false);
  const [weatherData, setWeatherData] = useState({});

  useEffect(() => {
    const checkUser = async () => {
      setIsUserLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        fetchUsageInfo(session.user.id);
      } else {
        router.replace('/login');
        return;
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
    if (!user) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/my-trips?user_id=${user.id}`);
      setMyTrips(res.data.data);
    } catch (err) { console.error(err); }
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

  const getWeatherIcon = (code) => {
    if (code === 0) return "☀️"; // 맑음
    if (code >= 1 && code <= 3) return "⛅"; // 구름 조금
    if (code >= 45 && code <= 48) return "🌫️"; // 안개
    if (code >= 51 && code <= 67) return "🌧️"; // 비
    if (code >= 71 && code <= 77) return "❄️"; // 눈
    if (code >= 80 && code <= 82) return "🌦️"; // 소나기
    if (code >= 95 && code <= 99) return "⛈️"; // 뇌우
    return "🌡️";
  };

  const fetchWeather = async (destination, startDate, endDate) => {
    if (!GOOGLE_MAPS_API_KEY) return;

    try {
      // 1. Google Places API (New)로 위도/경도 가져오기
      const placesUrl = `https://places.googleapis.com/v1/places:searchText`;

      const placesRes = await axios.post(placesUrl, {
        textQuery: destination
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'places.location'
        }
      });

      if (!placesRes.data.places || !placesRes.data.places.length) return;

      const { latitude, longitude } = placesRes.data.places[0].location;

      // 2. Open-Meteo API로 날씨 가져오기
      const weatherRes = await axios.get(`https://api.open-meteo.com/v1/forecast`, {
        params: {
          latitude: latitude,
          longitude: longitude,
          daily: "weather_code,temperature_2m_max,temperature_2m_min",
          start_date: startDate,
          end_date: endDate,
          timezone: "auto"
        }
      });

      if (!weatherRes.data.daily) return;

      const daily = weatherRes.data.daily;
      const weatherMap = {};

      daily.time.forEach((date, index) => {
        weatherMap[date] = {
          code: daily.weather_code[index],
          max: Math.round(daily.temperature_2m_max[index]),
          min: Math.round(daily.temperature_2m_min[index]),
          icon: getWeatherIcon(daily.weather_code[index])
        };
      });

      setWeatherData(weatherMap);
    } catch (err) {
      console.error("Weather fetch error:", err);
    }
  };

  const executeGenerate = async () => {
    setLoading(true); setResult(null); setCurrentDayIndex(0); setSelectedActivity(null);
    setShowSuggestions(false);

    try {
      const res = await axios.post(`${API_BASE_URL}/generate-trip`, { ...formData, user_id: user?.id });
      setResult(res.data.data);

      // 날씨 정보 가져오기
      if (formData.startDate && formData.endDate) {
        fetchWeather(formData.destination, formData.startDate, formData.endDate);
      }

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

    if (!formData.startDate || !formData.endDate) {
      alert("여행 일정을 선택해주세요.");
      return;
    }

    if (formData.startDate === formData.endDate) {
      if (formData.departureTime <= formData.arrivalTime) {
        alert("당일치기 여행입니다.\n종료 시간이 시작 시간보다 늦어야 합니다.");
        return;
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
    } catch (e) { }
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
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/trip/${tripId}`, { data: { user_id: user.id } });
      setMyTrips(prev => prev.filter(t => t.id !== tripId));
      alert("삭제되었습니다.");
    } catch (err) { alert("삭제 실패"); }
  };

  const getMapUrl = (activities) => {
    if (!activities || activities.length === 0) return null;

    if (selectedActivity) {
      const query = selectedActivity.place_id
        ? `place_id:${selectedActivity.place_id}`
        : encodeURIComponent(selectedActivity.place_name);
      return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${query}`;
    }

    const validPlaces = activities.filter(a => a.place_name && !a.place_name.includes("이동"));
    if (validPlaces.length < 2) {
      if (validPlaces.length === 1) {
        const query = validPlaces[0].place_id ? `place_id:${validPlaces[0].place_id}` : encodeURIComponent(validPlaces[0].place_name);
        return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${query}`;
      }
      return null;
    }

    const origin = validPlaces[0].place_id ? `place_id:${validPlaces[0].place_id}` : encodeURIComponent(validPlaces[0].place_name);
    const destination = validPlaces[validPlaces.length - 1].place_id ? `place_id:${validPlaces[validPlaces.length - 1].place_id}` : encodeURIComponent(validPlaces[validPlaces.length - 1].place_name);

    let waypoints = "";
    if (validPlaces.length > 2) {
      const wpList = validPlaces.slice(1, -1).map(p => p.place_id ? `place_id:${p.place_id}` : encodeURIComponent(p.place_name)).join("|");
      waypoints = `&waypoints=${wpList}`;
    }
    return `https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_API_KEY}&origin=${origin}&destination=${destination}${waypoints}&mode=transit`;
  };

  if (isUserLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground"><div className="animate-spin text-4xl">⚪</div></div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300">
      {/* 광고 모달 (다크모드 적용) */}
      {showAd && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="bg-card rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl relative">
            <div className="p-4 bg-secondary flex justify-between items-center">
              <span className="font-bold text-foreground">📢 잠시 광고 보고 가실게요!</span>
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
              <p className="text-foreground/80 mb-2 font-bold text-lg">광고를 30초간 시청해주시면<br /><span className="text-rose-500">여행 일정을 무료로 생성</span>해 드립니다! 🎁</p>
              <button onClick={closeAdAndResume} disabled={adTimer > 0} className={`w-full py-4 rounded-xl font-black text-lg transition-all duration-300 ${adTimer > 0 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-rose-500 text-white hover:bg-rose-600 shadow-lg hover:-translate-y-1 animate-bounce-short"}`}>
                {adTimer > 0 ? `광고 시청 중... (${adTimer})` : "광고 닫고 일정 생성하기 ✨"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <Header
        user={user}
        onLogoClick={handleLogoClick}
        activeTab={activeTab}
      />

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">

        {/* 보관함 탭 */}
        {activeTab === "mytrip" && user && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-foreground">내 여행 보관함</h2><span className="text-rose-500 font-bold text-lg">{myTrips.length}</span></div>
            {myTrips.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-3xl p-24 text-center bg-secondary/50"><div className="text-5xl mb-4 opacity-20">🗺️</div><p className="text-foreground/60 font-medium mb-6">아직 저장된 여행 일정이 없습니다.</p><button onClick={handleLogoClick} className="text-rose-500 font-bold hover:underline">첫 번째 여행을 계획해보세요</button></div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {myTrips.map(trip => {
                  const coverImage = getTripCoverImage(trip);
                  return (
                    <div key={trip.id} className="group cursor-pointer relative" onClick={() => { setResult(trip); router.push('/?view=home'); }}>
                      <div className="relative aspect-[4/3] bg-secondary rounded-xl overflow-hidden mb-4 shadow-sm group-hover:shadow-md transition-all">
                        <img src={coverImage} alt={trip.destination} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80" }} />
                        <div className="absolute top-3 left-3 bg-card/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm text-foreground">{trip.duration}</div>

                        <div className="absolute bottom-3 right-3 flex gap-2">
                          <button onClick={(e) => handleShare(e, trip.id)} className="bg-card text-foreground p-2 rounded-full shadow-md hover:text-blue-600 transition hover:scale-110" title="공유">🔗</button>
                          <button onClick={(e) => handleDelete(e, trip.id)} className="bg-card text-foreground p-2 rounded-full shadow-md hover:text-rose-500 transition hover:scale-110" title="삭제">🗑️</button>
                        </div>
                      </div>
                      <div className="px-1">
                        <h3 className="font-bold text-lg text-foreground truncate mb-1 group-hover:text-rose-500 transition-colors">{trip.itinerary_data.trip_title}</h3>
                        <div className="flex justify-between items-center text-sm"><p className="text-foreground/60 font-medium flex items-center gap-1"><span>📍</span> {trip.destination}</p><p className="text-foreground/50 text-xs">{new Date(trip.created_at).toLocaleDateString()}</p></div>
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
                  <div className="flex justify-center mb-6">
                    <img
                      src="/hero-image.png"
                      alt="Travel Hero"
                      className="w-64 h-64 md:w-80 md:h-80 object-contain animate-float drop-shadow-2xl"
                    />
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black text-foreground mb-3 md:mb-4 tracking-tight animate-fade-in-up" style={{ animationDelay: '0.1s' }}>어디로 떠나실 건가요?</h2>
                  <p className="text-base md:text-lg text-foreground/60 font-medium animate-fade-in-up" style={{ animationDelay: '0.2s' }}>완벽한 여행을 위한 맞춤형 일정을 제안해 드립니다.</p>
                </div>

                <div className="bg-card p-6 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-border relative transition-colors">
                  <form onSubmit={handleGenerateClick} className="space-y-6 md:space-y-8">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                      <div className="space-y-2 relative">
                        <label className="text-xs font-bold text-foreground/80 uppercase tracking-wider ml-1">여행지</label>
                        <input
                          placeholder="도시나 지역 검색"
                          className={`w-full bg-secondary hover:bg-secondary/80 focus:bg-card border p-3 md:p-4 rounded-xl text-base md:text-lg font-bold placeholder:text-foreground/40 outline-none transition-all ${!isPlaceSelected && formData.destination ? 'border-red-300 focus:ring-red-200' : 'border-border focus:ring-2 focus:ring-foreground/20'}`} value={formData.destination}
                          onChange={handleDestinationChange}
                          required
                        />
                        {!isPlaceSelected && formData.destination.length > 0 && <p className="text-xs text-red-500 mt-1 ml-1 font-bold">⚠️ 목록에서 여행지를 선택해주세요.</p>}
                        {showSuggestions && suggestions.length > 0 && (
                          <div className="absolute top-full left-0 w-full bg-card border border-border rounded-xl shadow-xl mt-2 z-50 overflow-hidden max-h-60 overflow-y-auto">
                            {suggestions.map((item, idx) => (
                              <div key={idx} className="p-4 hover:bg-secondary cursor-pointer flex items-center gap-3 text-sm font-bold text-foreground border-b border-border last:border-none" onClick={() => selectSuggestion(item.description)}><span className="text-lg">📍</span>{item.description}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        <div className="space-y-2 col-span-2 relative">
                          <label className="text-xs font-bold text-foreground/80 uppercase tracking-wider ml-1">여행일정</label>
                          <div
                            onClick={() => setShowCalendar(!showCalendar)}
                            className="w-full bg-secondary hover:bg-secondary/80 cursor-pointer border border-border p-3 md:p-4 rounded-xl font-bold text-sm md:text-base text-foreground transition-all flex items-center justify-between"
                          >
                            <span className={!formData.startDate ? "text-foreground/40" : ""}>
                              {formData.startDate && formData.endDate ? `${formData.startDate} ~ ${formData.endDate}` : "여행 날짜를 선택해주세요"}
                            </span>
                            <span className="text-xl">📅</span>
                          </div>

                          {showCalendar && (
                            <div className="absolute top-full left-0 w-full z-50 mt-2 flex justify-center animate-fade-in-up">
                              <Calendar
                                startDate={formData.startDate}
                                endDate={formData.endDate}
                                onChange={(start, end) => {
                                  setFormData({ ...formData, startDate: start, endDate: end });
                                  if (start && end) setShowCalendar(false);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-5 md:p-6 bg-secondary/50 rounded-2xl border border-border">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-xs font-bold text-foreground/60 ml-1">여행 시작 시간</label><input type="time" value={formData.arrivalTime} className="w-full bg-card border border-border p-2.5 md:p-3 rounded-xl text-xs md:text-sm font-bold text-foreground outline-none focus:border-foreground/50" onChange={e => setFormData({ ...formData, arrivalTime: e.target.value })} /></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-foreground/60 ml-1">여행 종료 시간</label><input type="time" value={formData.departureTime} className="w-full bg-card border border-border p-2.5 md:p-3 rounded-xl text-xs md:text-sm font-bold text-foreground outline-none focus:border-foreground/50" onChange={e => setFormData({ ...formData, departureTime: e.target.value })} /></div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-foreground/60 ml-1">여행 인원</label>
                          <div className="flex items-center bg-card border border-border rounded-xl overflow-hidden">
                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, travelers: Math.max(1, prev.travelers - 1) }))} className="px-4 py-3 hover:bg-secondary text-foreground font-bold">-</button>
                            <input
                              type="number"
                              min="1"
                              value={formData.travelers}
                              className="w-full text-center bg-transparent font-bold text-foreground outline-none"
                              onChange={e => setFormData({ ...formData, travelers: parseInt(e.target.value) || 1 })}
                            />
                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, travelers: prev.travelers + 1 }))} className="px-4 py-3 hover:bg-secondary text-foreground font-bold">+</button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-foreground/60 ml-1">예산 (선택)</label>
                          <input
                            type="text"
                            placeholder="예: 50만원, 1000달러"
                            value={formData.budget}
                            className="w-full bg-card border border-border p-2.5 md:p-3 rounded-xl text-xs md:text-sm font-bold text-foreground outline-none focus:border-foreground/50"
                            onChange={e => setFormData({ ...formData, budget: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="mt-6 space-y-2">
                        <label className="text-xs font-bold text-foreground/60 ml-1">기타 요구사항 (선택)</label>
                        <textarea placeholder="예: 친구와 함께하는 힐링 여행, 해산물은 못 먹어요." className="w-full bg-card border border-border p-4 rounded-xl text-sm font-medium text-foreground outline-none focus:border-foreground/50 h-24 resize-none" onChange={e => setFormData({ ...formData, otherRequirements: e.target.value })} />
                      </div>
                    </div>

                    <div className="pt-4">
                      <button disabled={loading || !isPlaceSelected} className={`w-full p-4 rounded-xl font-black text-lg shadow-lg transition-all duration-300 transform flex items-center justify-center gap-2 ${loading || !isPlaceSelected ? "bg-secondary text-foreground/40 cursor-not-allowed shadow-none" : "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200 dark:shadow-none active:scale-[0.99] hover:shadow-xl"}`}>
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
                <div className="mb-10 border-b border-border pb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-black text-foreground mb-3">{result.itinerary_data.trip_title}</h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-foreground/60">
                      <span className="bg-secondary px-3 py-1.5 rounded-lg border border-border flex items-center gap-1.5"><span className="text-rose-500">🗓️</span> {result.duration}</span>
                      <span className="bg-secondary px-3 py-1.5 rounded-lg border border-border flex items-center gap-1.5"><span className="text-rose-500">📍</span> {result.destination}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button onClick={(e) => handleShare(e, result.id)} className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-foreground text-background hover:bg-foreground/80 text-sm font-bold transition shadow-md flex items-center justify-center gap-2"><span>🔗</span> 공유하기</button>
                    <button onClick={handleLogoClick} className="flex-1 md:flex-none px-6 py-3 rounded-xl border border-border hover:bg-secondary text-sm font-bold text-foreground/70 transition">새로운 검색</button>
                  </div>
                </div>

                {/* 메인 컨텐츠 */}
                <div className="flex flex-col lg:flex-row gap-10 h-[calc(100vh-200px)] min-h-[600px]">
                  <div className={`lg:w-[45%] flex flex-col h-full ${showMobileMap ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="flex overflow-x-auto pb-4 gap-2 mb-2 scrollbar-hide px-1">
                      {result.itinerary_data.itinerary.map((day, idx) => {
                        // 날짜 계산 (시작일 + idx)
                        let weather = null;
                        if (formData.startDate) {
                          const dateObj = new Date(formData.startDate);
                          if (!isNaN(dateObj.getTime())) {
                            dateObj.setDate(dateObj.getDate() + idx);
                            const dateStr = dateObj.toISOString().split('T')[0];
                            weather = weatherData[dateStr];
                          }
                        }

                        return (
                          <button key={idx} onClick={() => setCurrentDayIndex(idx)} className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-sm flex items-center gap-2 ${currentDayIndex === idx ? "bg-foreground text-background scale-105" : "bg-card border border-border text-foreground/60 hover:bg-secondary"}`}>
                            <span>{day.day}일차</span>
                            {weather && <span className="text-xs opacity-80">{weather.icon} {weather.min}°/{weather.max}°</span>}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex-1 lg:overflow-y-auto pr-0 lg:pr-4 space-y-6 pb-24 lg:pb-10 custom-scrollbar">
                      <div className="pl-4 border-l-2 border-border space-y-8 ml-2 mt-2">
                        {result.itinerary_data.itinerary[currentDayIndex].activities.map((act, idx) => (
                          <div key={idx} className="relative group">
                            <div className="absolute -left-[23px] top-1 w-4 h-4 bg-rose-500 rounded-full ring-4 ring-card shadow-sm"></div>
                            <div className="text-xs font-bold text-foreground/40 mb-2 pl-1">{act.time}</div>

                            <div onClick={() => { setSelectedActivity(act); setShowMobileMap(true); }} className={`bg-card rounded-2xl border overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer ${selectedActivity === act ? 'border-rose-500 ring-2 ring-rose-100 dark:ring-rose-900' : 'border-border'}`}>
                              <div className="flex flex-col sm:flex-row">
                                <div className="w-full sm:w-32 h-32 sm:h-auto bg-secondary shrink-0 relative overflow-hidden">
                                  {act.photoUrl ? <img src={act.photoUrl} alt={act.place_name} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" /> : <div className="w-full h-full flex items-center justify-center text-2xl bg-secondary text-foreground/20">📍</div>}
                                </div>
                                <div className="p-5 flex-1 flex flex-col justify-between">
                                  <div>
                                    <div className="flex justify-between items-start mb-1">
                                      <h3 className="font-bold text-lg text-foreground leading-tight">{act.place_name}</h3>
                                      <span className="text-[10px] font-bold bg-secondary text-foreground/60 px-2 py-1 rounded-full shrink-0 ml-2">{act.type}</span>
                                    </div>
                                    <p className="text-sm text-foreground/60 line-clamp-2 mb-3 leading-relaxed">{act.activity_description}</p>
                                    <div className="flex gap-2 flex-wrap">
                                      {act.googleMapsUri && <a href={act.googleMapsUri} target="_blank" onClick={(e) => e.stopPropagation()} className="text-xs font-bold text-foreground/70 bg-secondary px-3 py-1.5 rounded-lg hover:bg-border transition flex items-center gap-1">🗺️ 구글맵</a>}
                                      {act.booking_url && <a href={act.booking_url} target="_blank" onClick={(e) => e.stopPropagation()} className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 transition flex items-center gap-1">🎟️ 예약하기</a>}
                                    </div>
                                  </div>

                                  {act.travel_info && <div className="mt-4 mb-2 flex items-center gap-2 text-xs text-foreground/40 pl-1"><div className="h-6 border-l border-dashed border-border"></div><div className="bg-secondary px-2 py-1 rounded border border-border flex items-center gap-1 font-bold text-foreground/60"><span>🚗</span><span>{act.travel_info.duration}</span><span className="text-foreground/20">|</span><span>{act.travel_info.distance}</span></div></div>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 bg-card border border-border p-4 rounded-2xl shadow-lg sticky bottom-0 z-20">
                      <label className="text-xs font-bold text-foreground/60 mb-2 block flex items-center gap-1"><span>🤖</span> AI에게 일정 수정을 요청해보세요</label>
                      <div className="flex gap-2">
                        <input type="text" value={modificationPrompt} onChange={(e) => setModificationPrompt(e.target.value)} placeholder="예: 점심을 초밥집으로 바꿔줘" className="flex-1 bg-secondary border-none p-3 rounded-xl text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-border transition-all" onKeyDown={(e) => e.key === 'Enter' && !modifying && handleModify()} />
                        <button onClick={handleModify} disabled={modifying || !modificationPrompt.trim()} className="bg-rose-500 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center shadow-sm">{modifying ? <span className="animate-spin">⏳</span> : "수정"}</button>
                      </div>
                    </div>
                  </div>

                  <div className={`lg:w-[55%] h-full bg-secondary lg:rounded-[2rem] overflow-hidden shadow-inner border border-border lg:sticky lg:top-24 ${showMobileMap ? 'fixed inset-0 z-50 rounded-none' : 'hidden lg:block relative'}`}>
                    {!GOOGLE_MAPS_API_KEY ? (
                      <div className="flex h-full flex-col items-center justify-center text-rose-500 gap-2 p-4 text-center">
                        <span className="text-4xl">⚠️</span>
                        <span className="font-bold">Google Maps API Key가 설정되지 않았습니다.</span>
                        <span className="text-sm text-foreground/60">.env.local 파일을 확인해주세요.</span>
                      </div>
                    ) : getMapUrl(result.itinerary_data.itinerary[currentDayIndex].activities) ? (
                      <>
                        <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen src={getMapUrl(result.itinerary_data.itinerary[currentDayIndex].activities)} className="grayscale-[20%] contrast-[1.1] hover:grayscale-0 transition-all duration-500"></iframe>
                        {showMobileMap && <button onClick={() => setShowMobileMap(false)} className="absolute top-4 right-4 bg-card text-foreground p-3 rounded-full shadow-lg font-bold z-50">✕ 닫기</button>}
                        {selectedActivity && !showMobileMap && <button onClick={() => setSelectedActivity(null)} className="absolute top-4 left-4 bg-card/90 backdrop-blur text-foreground px-4 py-2 rounded-full shadow-lg text-sm font-bold hover:bg-card transition flex items-center gap-2">🔙 전체 경로 보기</button>}
                      </>
                    ) : <div className="flex h-full flex-col items-center justify-center text-foreground/40 gap-2"><span className="text-4xl opacity-50">🗺️</span><span className="font-medium">지도 정보를 불러올 수 없습니다.</span></div>}
                  </div>

                </div>

                {/* 모바일용 지도 버튼 */}
                {!showMobileMap && (
                  <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
                    <button onClick={() => setShowMobileMap(true)} className="bg-foreground text-background px-6 py-3 rounded-full shadow-xl font-bold flex items-center gap-2 hover:scale-105 transition">🗺️ 지도 보기</button>
                  </div>
                )}

                {/* 수정 요청 바 (모바일 하단 고정) */}
                {!showMobileMap && (
                  <div className="fixed lg:hidden bottom-0 left-0 w-full bg-card border-t border-border p-4 rounded-t-2xl shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-30">
                    <div className="max-w-6xl mx-auto">
                      <label className="text-xs font-bold text-foreground/60 mb-2 block flex items-center gap-1"><span>🤖</span> AI에게 일정 수정을 요청해보세요</label>
                      <div className="flex gap-2">
                        <input type="text" value={modificationPrompt} onChange={(e) => setModificationPrompt(e.target.value)} placeholder="예: 점심을 초밥집으로 바꿔줘" className="flex-1 bg-secondary border-none p-3 rounded-xl text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-border transition-all" onKeyDown={(e) => e.key === 'Enter' && !modifying && handleModify()} />
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
      <footer className="border-t border-border py-10 mt-12 bg-secondary"><div className="max-w-7xl mx-auto px-6 text-center text-foreground/40 text-sm">© 2025 TripGen Inc. All rights reserved.</div></footer>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background text-foreground"><div className="animate-spin text-4xl">⚪</div></div>}>
      <HomeContent />
    </Suspense>
  );
}
