"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const API_BASE_URL = "https://tripgen-server.onrender.com/api"; 

export default function Home() {
  const [user, setUser] = useState(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [myTrips, setMyTrips] = useState([]);
  const [formData, setFormData] = useState({ destination: "", startDate: "", endDate: "", style: "", companions: "" });
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
      const res = await axios.post(`${API_BASE_URL}/generate-trip`, { ...formData, user_id: user?.id });
      setResult(res.data.data);
    } catch (err) {
      alert("생성 실패: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // [추가됨] 공유 기능
  const handleShare = (tripId) => {
    const shareUrl = `${window.location.origin}/trip/${tripId}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => alert("📋 링크가 복사되었습니다!\n친구에게 공유해보세요."))
      .catch(() => alert("복사 실패. URL: " + shareUrl));
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
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab("home")}>
              <span className="text-2xl">✈️</span><span className="text-xl font-extrabold text-slate-900">TripGen</span>
            </div>
            <div className="hidden md:flex gap-1 bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setActiveTab("home")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab==="home" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>일정 생성</button>
              {user && <button onClick={() => setActiveTab("mytrip")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab==="mytrip" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>보관함</button>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isUserLoading ? <div className="w-24 h-9 bg-slate-200 rounded animate-pulse"></div> : user ? (
              <>
                {user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && <button onClick={() => router.push('/admin')} className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-full font-bold">관리자</button>}
                <button onClick={() => router.push('/mypage')} className="text-sm font-bold text-slate-600 hover:text-blue-600">마이페이지</button>
              </>
            ) : <button onClick={() => router.push('/login')} className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-blue-700 shadow-lg">로그인</button>}
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {activeTab === "mytrip" && user && (
          <div className="space-y-8 animate-fade-in-up">
            <h2 className="text-2xl font-bold text-slate-800">🧳 내 여행 보관함</h2>
            {myTrips.length === 0 ? <div className="text-center py-20 text-slate-400">저장된 여행이 없습니다.</div> : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {myTrips.map(trip => (
                  <div key={trip.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition cursor-pointer" onClick={() => { setResult(trip); setActiveTab("home"); }}>
                    <h3 className="font-bold text-lg text-slate-800 mb-1">{trip.itinerary_data.trip_title}</h3>
                    <p className="text-sm text-slate-500 mb-4">📍 {trip.destination} | {trip.duration}</p>
                    <div className="text-xs text-slate-400">{new Date(trip.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "home" && (
          <>
            {!result && (
              <div className="max-w-3xl mx-auto animate-fade-in-up">
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-extrabold text-slate-900 mb-4">어디로 <span className="text-blue-600">떠나시나요?</span></h2>
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                  <form onSubmit={handleGenerate} className="space-y-8">
                    <input placeholder="여행지 (예: 오사카)" className="w-full bg-slate-50 border p-4 rounded-xl" onChange={e=>setFormData({...formData, destination: e.target.value})} required />
                    <div className="grid grid-cols-2 gap-6">
                      <input type="date" className="w-full bg-slate-50 border p-4 rounded-xl" onChange={e=>setFormData({...formData, startDate: e.target.value})} required />
                      <input type="date" className="w-full bg-slate-50 border p-4 rounded-xl" onChange={e=>setFormData({...formData, endDate: e.target.value})} required />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <input placeholder="스타일 (예: 맛집)" className="w-full bg-slate-50 border p-4 rounded-xl" onChange={e=>setFormData({...formData, style: e.target.value})} />
                      <input placeholder="동행 (예: 연인)" className="w-full bg-slate-50 border p-4 rounded-xl" onChange={e=>setFormData({...formData, companions: e.target.value})} />
                    </div>
                    <button disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-teal-500 text-white p-5 rounded-xl font-bold text-lg shadow-lg disabled:opacity-50">{loading ? "✨ AI가 일정을 생성 중..." : "🚀 여행 일정 생성하기"}</button>
                  </form>
                </div>
              </div>
            )}

            {result && result.itinerary_data && (
              <div className="animate-fade-in-up pb-20">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 mb-8 flex justify-between items-center">
                  <div><h2 className="text-2xl font-bold">{result.itinerary_data.trip_title}</h2><p className="text-slate-500">{result.duration} | {result.destination}</p></div>
                  <div className="flex gap-2">
                    {/* [추가됨] 공유 버튼 */}
                    <button onClick={() => handleShare(result.id)} className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100">공유</button>
                    <button onClick={() => setResult(null)} className="text-sm font-bold text-slate-500 bg-slate-100 px-4 py-2 rounded-lg hover:bg-slate-200">새 일정</button>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="lg:w-1/2">
                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 sticky top-20 z-10">
                      <button onClick={() => setCurrentDayIndex(Math.max(0, currentDayIndex - 1))} disabled={currentDayIndex === 0} className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 disabled:opacity-30 font-bold">←</button>
                      <div className="text-center"><div className="font-bold text-blue-600 text-lg">DAY {result.itinerary_data.itinerary[currentDayIndex].day}</div><div className="text-xs text-slate-400">{result.itinerary_data.itinerary[currentDayIndex].date}</div></div>
                      <button onClick={() => setCurrentDayIndex(Math.min(result.itinerary_data.itinerary.length-1, currentDayIndex + 1))} disabled={currentDayIndex===result.itinerary_data.itinerary.length-1} className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 disabled:opacity-30 font-bold">→</button>
                    </div>
                    <div className="relative border-l-2 border-slate-200 ml-6 space-y-8">
                      {result.itinerary_data.itinerary[currentDayIndex].activities.map((act, idx) => (
                        <div key={idx} className="ml-8 relative group">
                          <div className="absolute -left-[39px] top-6 bg-white border-4 border-blue-500 w-5 h-5 rounded-full z-10"></div>
                          {act.travel_info && <div className="mb-4 -ml-2 inline-flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-xs text-slate-600"><span>👣</span><span>{act.travel_info.duration} 이동</span></div>}
                          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg flex gap-5">
                             <div className="w-24 h-24 shrink-0 bg-slate-100 rounded-xl overflow-hidden relative">
                               {act.photoUrl ? <img src={act.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">📍</div>}
                             </div>
                             <div className="flex-1">
                               <div className="flex gap-2 mb-2"><span className="bg-slate-900 text-white px-2 py-0.5 rounded-md text-xs font-bold">{act.time}</span><span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{act.type}</span></div>
                               <h3 className="font-bold text-slate-800 mb-2">{act.place_name}</h3>
                               <p className="text-sm text-slate-500 line-clamp-2">{act.activity_description}</p>
                               {act.googleMapsUri && <a href={act.googleMapsUri} target="_blank" className="text-xs font-bold text-blue-500 hover:underline mt-2 inline-block">지도 보기 ↗</a>}
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="lg:w-1/2">
                    <div className="sticky top-24 h-[500px] bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
                      {getMapUrl(result.itinerary_data.itinerary[currentDayIndex].activities) ? (
                        <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen src={getMapUrl(result.itinerary_data.itinerary[currentDayIndex].activities)}></iframe>
                      ) : <div className="flex h-full items-center justify-center text-slate-400">지도 정보 없음</div>}
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