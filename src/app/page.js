"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

// 1. Supabase 클라이언트 설정
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 2. 구글 맵 API 키
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// 3. 백엔드 서버 주소 (배포된 Render 주소 입력)
const API_BASE_URL = "https://tripgen-server.onrender.com/api"; 
// 주의: 위 주소는 예시일 수 있습니다. 본인의 Render 주소가 맞는지 꼭 확인하세요!

export default function Home() {
  // --- State 관리 ---
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);

  const [activeTab, setActiveTab] = useState("home"); // home, mytrip, login
  const [myTrips, setMyTrips] = useState([]);

  const [formData, setFormData] = useState({
    destination: "", startDate: "", endDate: "", style: "", companions: ""
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  // --- 초기화 및 데이터 로드 ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user);

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      return () => subscription.unsubscribe();
    };
    checkUser();
  }, []);

  // 내 여행 목록 불러오기
  useEffect(() => {
    if (activeTab === "mytrip" && user) {
      axios.get(`${API_BASE_URL}/my-trips?user_id=${user.id}`)
        .then(res => setMyTrips(res.data.data))
        .catch(err => console.error(err));
    }
  }, [activeTab, user]);

  // --- 핸들러 함수들 ---
  
  // 이메일 로그인/가입
  const handleAuth = async (e) => {
    e.preventDefault();
    const func = isLoginMode ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await func({ email, password });
    if (error) alert(error.message);
    else { 
      if (!isLoginMode) alert("가입 성공! 로그인되었습니다.");
      setActiveTab("home"); 
    }
  };

  // 소셜 로그인 (구글)
  const handleSocialLogin = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) alert(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setActiveTab("home");
    setResult(null);
  };

  // 여행 생성 요청
  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setCurrentDayIndex(0);

    try {
      const res = await axios.post(`${API_BASE_URL}/generate-trip`, {
        ...formData,
        user_id: user ? user.id : null
      });
      setResult(res.data.data);
    } catch (err) {
      alert("생성 실패: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // [핵심] 지도 URL 생성기 (Place ID 우선, 없으면 이름 검색 + 전체 경로 연결)
  const getMapUrl = (activities) => {
    // 유효한 장소 필터링
    const validPlaces = activities.filter(a => 
      a.place_name && !a.place_name.includes("이동") && a.type !== "숙소"
    );

    if (validPlaces.length < 2) return null;

    // 장소 포맷팅 헬퍼 (ID가 있으면 ID 사용, 없으면 이름 사용)
    const formatPlace = (place) => {
      return place.place_id 
        ? `place_id:${place.place_id}` 
        : encodeURIComponent(place.place_name);
    };

    const origin = formatPlace(validPlaces[0]);
    const destination = formatPlace(validPlaces[validPlaces.length - 1]);
    
    let waypoints = "";
    if (validPlaces.length > 2) {
      const wpList = validPlaces.slice(1, -1).map(p => formatPlace(p)).join("|");
      waypoints = `&waypoints=${wpList}`;
    }

    return `https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_API_KEY}&origin=${origin}&destination=${destination}${waypoints}&mode=transit`;
  };


  // --- 화면 렌더링 ---
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {/* 네비게이션 */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex justify-between items-center">
          <span className="text-2xl font-extrabold text-blue-600 cursor-pointer" onClick={() => setActiveTab("home")}>
            ✈️ TripGen
          </span>
          
          <div className="flex gap-6">
            <button onClick={() => setActiveTab("home")} className={`font-medium ${activeTab==="home" ? "text-blue-600" : "text-gray-500"}`}>
              일정 생성
            </button>
            {user && (
              <button onClick={() => setActiveTab("mytrip")} className={`font-medium ${activeTab==="mytrip" ? "text-blue-600" : "text-gray-500"}`}>
                내 여행
              </button>
            )}
          </div>

          <div>
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 hidden sm:inline">{user.email?.split("@")[0]}님</span>
                <button onClick={handleLogout} className="text-sm text-red-500 border border-red-200 px-3 py-1 rounded hover:bg-red-50">
                  로그아웃
                </button>
              </div>
            ) : (
              <button onClick={() => setActiveTab("login")} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md transition">
                로그인 / 가입
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        
        {/* 1. 로그인 탭 */}
        {activeTab === "login" && !user && (
          <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg mt-10">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
              {isLoginMode ? "TripGen 로그인" : "회원가입"}
            </h2>
            
            {/* 이메일 폼 */}
            <form onSubmit={handleAuth} className="space-y-4">
              <input 
                type="email" placeholder="이메일 주소" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={email} onChange={e=>setEmail(e.target.value)} required 
              />
              <input 
                type="password" placeholder="비밀번호" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={password} onChange={e=>setPassword(e.target.value)} required 
              />
              <button className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition">
                {isLoginMode ? "로그인" : "가입하기"}
              </button>
            </form>

            {/* 구분선 */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">또는</span></div>
            </div>

            {/* 구글 로그인 버튼 */}
            <button 
              onClick={() => handleSocialLogin("google")}
              className="w-full border border-gray-300 p-3 rounded-lg font-bold text-gray-700 flex items-center justify-center hover:bg-gray-50 transition"
            >
              <span className="mr-2">🇬</span> Google로 계속하기
            </button>

            <p className="text-center mt-6 text-sm text-gray-500 cursor-pointer hover:text-blue-600" onClick={() => setIsLoginMode(!isLoginMode)}>
              {isLoginMode ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
            </p>
          </div>
        )}

        {/* 2. 내 여행 탭 */}
        {activeTab === "mytrip" && (
          <div className="space-y-6 animate-fade-in-up">
            <h2 className="text-2xl font-bold text-gray-800">🧳 내 여행 보관함</h2>
            {myTrips.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl shadow-sm">
                <p className="text-gray-500 mb-4">저장된 여행 일정이 없습니다.</p>
                <button onClick={() => setActiveTab("home")} className="text-blue-600 font-bold underline">첫 여행 계획하기</button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {myTrips.map(trip => (
                  <div key={trip.id} className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition cursor-pointer border border-transparent hover:border-blue-200" onClick={() => { setResult(trip); setActiveTab("home"); }}>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{trip.itinerary_data.trip_title}</h3>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <span>📍 {trip.destination}</span>
                      <span>🗓️ {trip.duration}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-3 text-right">{new Date(trip.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. 홈 (일정 생성 및 결과) 탭 */}
        {activeTab === "home" && (
          <>
            {/* 입력 폼 */}
            {!result && (
              <div className="bg-white p-8 rounded-2xl shadow-lg animate-fade-in-up">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">AI와 함께 완벽한 여행을 계획하세요</h2>
                  <p className="text-gray-500 mt-2">장소 검증부터 동선 최적화까지 한 번에</p>
                </div>
                
                <form onSubmit={handleGenerate} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">여행지</label>
                    <input placeholder="예: 도쿄, 제주도, 파리" className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" onChange={e=>setFormData({...formData, destination: e.target.value})} required />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">가는 날</label>
                      <input type="date" className="w-full border border-gray-300 p-3 rounded-xl" onChange={e=>setFormData({...formData, startDate: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">오는 날</label>
                      <input type="date" className="w-full border border-gray-300 p-3 rounded-xl" onChange={e=>setFormData({...formData, endDate: e.target.value})} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">여행 스타일</label>
                      <input placeholder="예: 맛집, 힐링, 쇼핑" className="w-full border border-gray-300 p-3 rounded-xl" onChange={e=>setFormData({...formData, style: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">동행</label>
                      <input placeholder="예: 연인, 가족, 혼자" className="w-full border border-gray-300 p-3 rounded-xl" onChange={e=>setFormData({...formData, companions: e.target.value})} />
                    </div>
                  </div>
                  
                  <button disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? "✨ AI가 최적의 경로를 계산 중입니다..." : "🚀 여행 일정 생성하기"}
                  </button>
                </form>
              </div>
            )}

            {/* 결과 화면 */}
            {result && result.itinerary_data && (
              <div className="animate-fade-in-up">
                {/* 헤더 */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b pb-4 gap-4">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">{result.itinerary_data.trip_title}</h2>
                    <p className="text-gray-500 mt-1 flex items-center gap-2">
                      <span>🗓️ {result.duration}</span>
                      <span>📍 {result.destination}</span>
                    </p>
                  </div>
                  <button onClick={() => setResult(null)} className="text-blue-600 font-bold hover:bg-blue-50 px-4 py-2 rounded-lg transition">
                    + 새 일정 만들기
                  </button>
                </div>

                {/* 날짜 네비게이션 */}
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-6">
                  <button 
                    onClick={() => setCurrentDayIndex(Math.max(0, currentDayIndex - 1))} 
                    disabled={currentDayIndex === 0} 
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg disabled:opacity-30 hover:bg-gray-200 font-bold"
                  >
                    ← 이전 날
                  </button>
                  
                  <div className="text-center">
                    <div className="text-xl font-extrabold text-blue-600">
                      Day {result.itinerary_data.itinerary[currentDayIndex].day}
                    </div>
                    <div className="text-sm text-gray-500">
                      {result.itinerary_data.itinerary[currentDayIndex].date}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setCurrentDayIndex(Math.min(result.itinerary_data.itinerary.length - 1, currentDayIndex + 1))} 
                    disabled={currentDayIndex === result.itinerary_data.itinerary.length - 1} 
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg disabled:opacity-30 hover:bg-gray-200 font-bold"
                  >
                    다음 날 →
                  </button>
                </div>

                {/* 🗺️ 지도 (Embed API) */}
                <div className="w-full h-80 bg-gray-200 rounded-2xl overflow-hidden shadow-inner mb-8 border border-gray-300 relative">
                   {getMapUrl(result.itinerary_data.itinerary[currentDayIndex].activities) ? (
                     <iframe
                       width="100%"
                       height="100%"
                       style={{ border: 0 }}
                       loading="lazy"
                       allowFullScreen
                       referrerPolicy="no-referrer-when-downgrade"
                       src={getMapUrl(result.itinerary_data.itinerary[currentDayIndex].activities)}
                     ></iframe>
                   ) : (
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-gray-100">
                        <span className="text-4xl mb-2">🗺️</span>
                        <p>경로를 표시할 장소가 부족합니다.</p>
                     </div>
                   )}
                </div>

                {/* 📋 타임라인 일정 리스트 */}
                <div className="relative border-l-2 border-blue-100 ml-4 md:ml-6 pb-10 space-y-8">
                  {result.itinerary_data.itinerary[currentDayIndex].activities.map((act, idx) => (
                    <div key={idx} className="ml-8 relative">
                      {/* 타임라인 점 */}
                      <div className="absolute -left-[41px] top-6 bg-blue-600 w-4 h-4 rounded-full border-4 border-white shadow-md z-10"></div>
                      
                      {/* 이동 정보 (이 장소로 오기까지) */}
                      {act.travel_info && (
                        <div className="mb-3 -ml-2 inline-flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                          <span className="text-xs text-blue-500">⬇️ 이동</span>
                          <span className="text-sm font-bold text-blue-800">{act.travel_info.duration}</span>
                          <span className="text-xs text-blue-600">({act.travel_info.distance})</span>
                        </div>
                      )}

                      {/* 장소 카드 */}
                      <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-xl transition duration-300 flex flex-col md:flex-row gap-5 border border-gray-100">
                        {/* 사진 */}
                        <div className="w-full md:w-40 h-40 shrink-0 bg-gray-100 rounded-lg overflow-hidden relative">
                           {act.photoUrl ? (
                             <img src={act.photoUrl} alt={act.place_name} className="w-full h-full object-cover hover:scale-105 transition duration-500" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-3xl">📍</div>
                           )}
                           {act.rating && (
                             <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                               ⭐ {act.rating}
                             </div>
                           )}
                        </div>

                        {/* 내용 */}
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="bg-gray-900 text-white px-2 py-1 rounded text-xs font-bold font-mono">{act.time}</span>
                            <span className="text-xs text-gray-500 border border-gray-200 px-2 py-0.5 rounded bg-gray-50">{act.type}</span>
                          </div>
                          
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{act.place_name}</h3>
                          <p className="text-sm text-gray-600 leading-relaxed mb-3">{act.activity_description}</p>
                          
                          {act.googleMapsUri && act.googleMapsUri !== "#" && (
                            <a 
                              href={act.googleMapsUri} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="inline-flex items-center text-sm text-blue-600 hover:underline font-medium"
                            >
                              구글 지도에서 보기 ↗
                            </a>
                          )}
                        </div>
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