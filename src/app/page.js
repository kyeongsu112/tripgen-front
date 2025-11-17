"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 구글 맵 키 (화면 표시용)
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function Home() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  const [activeTab, setActiveTab] = useState("home");
  const [myTrips, setMyTrips] = useState([]);
  
  const [formData, setFormData] = useState({ destination: "", startDate: "", endDate: "", style: "", companions: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  // 백엔드 주소 (배포 시 Render 주소로 변경되어 있어야 함!)
  const API_BASE_URL = "https://tripgen-server.onrender.com/api"; 

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user);
      supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
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

  const handleAuth = async (e) => {
    e.preventDefault();
    const func = isLoginMode ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await func({ email, password });
    if (error) alert(error.message);
    else { setActiveTab("home"); alert(isLoginMode ? "로그인 성공!" : "가입 성공!"); }
  };

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

  // [업그레이드] 정확한 Place ID 기반 지도 경로 URL
  const getMapUrl = (activities) => {
    // Place ID가 있는 장소들만 골라내기
    const validPlaces = activities.filter(a => a.place_id);
    if (validPlaces.length < 2) return null;

    const origin = `place_id:${validPlaces[0].place_id}`;
    const destination = `place_id:${validPlaces[validPlaces.length - 1].place_id}`;
    
    // 경유지 (중간 장소들)
    let waypoints = "";
    if (validPlaces.length > 2) {
      const waypointsIds = validPlaces.slice(1, -1).map(p => `place_id:${p.place_id}`).join("|");
      waypoints = `&waypoints=${encodeURIComponent(waypointsIds)}`;
    }

    return `https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_API_KEY}&origin=${origin}&destination=${destination}${waypoints}&mode=transit`;
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex justify-between items-center">
          <span className="text-2xl font-bold text-blue-600 cursor-pointer" onClick={() => setActiveTab("home")}>✈️ TripGen</span>
          <div className="flex gap-6">
            <button onClick={() => setActiveTab("home")} className={activeTab === "home" ? "text-blue-600 font-bold" : "text-gray-500"}>일정 생성</button>
            {user && <button onClick={() => setActiveTab("mytrip")} className={activeTab === "mytrip" ? "text-blue-600 font-bold" : "text-gray-500"}>내 여행</button>}
          </div>
          {user ? <button onClick={() => supabase.auth.signOut()} className="text-sm text-red-500">로그아웃</button> : <button onClick={() => setActiveTab("login")} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">로그인</button>}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {activeTab === "login" && !user && (
          <div className="max-w-sm mx-auto bg-white p-8 rounded-2xl shadow text-center">
            <h2 className="text-xl font-bold mb-4">{isLoginMode ? "로그인" : "회원가입"}</h2>
            <form onSubmit={handleAuth} className="space-y-3">
              <input type="email" placeholder="이메일" className="w-full border p-2 rounded" value={email} onChange={e=>setEmail(e.target.value)} required />
              <input type="password" placeholder="비밀번호" className="w-full border p-2 rounded" value={password} onChange={e=>setPassword(e.target.value)} required />
              <button className="w-full bg-blue-600 text-white p-2 rounded font-bold">{isLoginMode ? "로그인" : "가입하기"}</button>
            </form>
            <button onClick={() => setIsLoginMode(!isLoginMode)} className="text-sm text-gray-500 mt-4 underline">
              {isLoginMode ? "회원가입으로 전환" : "로그인으로 전환"}
            </button>
          </div>
        )}

        {activeTab === "mytrip" && (
          <div className="grid gap-4">
            <h2 className="text-2xl font-bold">🧳 내 여행 보관함</h2>
            {myTrips.map(trip => (
              <div key={trip.id} className="bg-white p-5 rounded-xl shadow hover:bg-gray-50 cursor-pointer" onClick={() => { setResult(trip); setActiveTab("home"); }}>
                <h3 className="font-bold">{trip.itinerary_data.trip_title}</h3>
                <p className="text-sm text-gray-500">{trip.duration} | {trip.destination}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "home" && (
          <>
            {!result && (
              <div className="bg-white p-8 rounded-2xl shadow-lg">
                <h2 className="text-xl font-bold mb-6">새로운 여행을 떠나볼까요?</h2>
                <form onSubmit={handleGenerate} className="space-y-4">
                  <input placeholder="여행지 (예: 후쿠오카)" className="w-full border p-3 rounded-xl" onChange={e=>setFormData({...formData, destination: e.target.value})} required />
                  <div className="flex gap-4">
                    <input type="date" className="w-full border p-3 rounded-xl" onChange={e=>setFormData({...formData, startDate: e.target.value})} required />
                    <input type="date" className="w-full border p-3 rounded-xl" onChange={e=>setFormData({...formData, endDate: e.target.value})} required />
                  </div>
                  <div className="flex gap-4">
                    <input placeholder="스타일 (예: 먹방)" className="w-full border p-3 rounded-xl" onChange={e=>setFormData({...formData, style: e.target.value})} />
                    <input placeholder="동행 (예: 가족)" className="w-full border p-3 rounded-xl" onChange={e=>setFormData({...formData, companions: e.target.value})} />
                  </div>
                  <button disabled={loading} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold text-lg shadow-md hover:bg-blue-700 transition">
                    {loading ? "🚗 경로 계산 및 일정 최적화 중..." : "🚀 검증된 일정 생성하기"}
                  </button>
                </form>
              </div>
            )}

            {result && result.itinerary_data && (
              <div className="animate-fade-in">
                <div className="flex justify-between items-end mb-6">
                  <h2 className="text-3xl font-bold">{result.itinerary_data.trip_title}</h2>
                  <button onClick={() => setResult(null)} className="text-blue-600 font-bold">새로 만들기</button>
                </div>

                {/* 날짜 컨트롤 */}
                <div className="flex justify-between bg-white p-4 rounded-xl shadow-sm mb-6 items-center">
                  <button onClick={() => setCurrentDayIndex(Math.max(0, currentDayIndex - 1))} disabled={currentDayIndex===0} className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50">←</button>
                  <div className="text-center">
                    <div className="font-bold text-blue-600 text-xl">Day {result.itinerary_data.itinerary[currentDayIndex].day}</div>
                    <div className="text-sm text-gray-500">{result.itinerary_data.itinerary[currentDayIndex].date}</div>
                  </div>
                  <button onClick={() => setCurrentDayIndex(Math.min(result.itinerary_data.itinerary.length-1, currentDayIndex + 1))} disabled={currentDayIndex===result.itinerary_data.itinerary.length-1} className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50">→</button>
                </div>

                {/* 🗺️ 지도 영역 */}
                <div className="w-full h-80 bg-gray-200 rounded-2xl overflow-hidden shadow-inner mb-8 border border-gray-300">
                  {getMapUrl(result.itinerary_data.itinerary[currentDayIndex].activities) ? (
                    <iframe width="100%" height="100%" style={{border:0}} loading="lazy" allowFullScreen
                      src={getMapUrl(result.itinerary_data.itinerary[currentDayIndex].activities)}>
                    </iframe>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">경로를 표시할 장소 정보가 부족합니다.</div>
                  )}
                </div>

                {/* 📋 일정 리스트 (이동 정보 포함) */}
                <div className="space-y-0 pb-20 relative border-l-2 border-gray-200 ml-4 md:ml-6">
                  {result.itinerary_data.itinerary[currentDayIndex].activities.map((act, idx) => (
                    <div key={idx} className="mb-8 ml-6 relative">
                      {/* 타임라인 점 */}
                      <div className="absolute -left-[33px] bg-blue-600 w-4 h-4 rounded-full border-4 border-white shadow-sm"></div>
                      
                      {/* ⬇️ 이동 정보 카드 (이 장소로 오기까지 걸린 시간) */}
                      {act.travel_info && (
                        <div className="mb-4 bg-blue-50 p-3 rounded-lg inline-block border border-blue-100 shadow-sm">
                          <span className="text-blue-800 font-bold text-sm">⬇️ {act.travel_info.duration} 소요</span>
                          <span className="text-blue-600 text-xs ml-2">({act.travel_info.distance})</span>
                        </div>
                      )}

                      {/* 장소 카드 */}
                      <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition flex flex-col sm:flex-row gap-4">
                        {act.photoUrl ? (
                          <img src={act.photoUrl} className="w-full sm:w-32 h-32 object-cover rounded-lg bg-gray-100" alt={act.place_name} />
                        ) : (
                          <div className="w-full sm:w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">📍</div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-gray-900 text-white px-2 py-1 rounded text-xs font-bold">{act.time}</span>
                            <span className="text-xs text-gray-500 border px-1 rounded">{act.type}</span>
                            {act.rating && <span className="text-xs text-yellow-600 font-bold">⭐ {act.rating}</span>}
                          </div>
                          <h3 className="text-lg font-bold text-gray-900">{act.place_name}</h3>
                          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{act.activity_description}</p>
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