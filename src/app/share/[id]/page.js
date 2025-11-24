"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";

// 배포 주소 (Render)
const API_BASE_URL = "https://tripgen-server.onrender.com/api"; 
// const API_BASE_URL = "http://localhost:8080/api"; 

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function SharedTripPage() {
  const params = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  useEffect(() => {
    if (params.id) {
      axios.get(`${API_BASE_URL}/public/trip/${params.id}`)
        .then(res => {
          setTrip(res.data.data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setError("일정을 불러올 수 없습니다.");
          setLoading(false);
        });
    }
  }, [params.id]);

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

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="animate-spin text-4xl mb-4">⚪</div>
      <p className="text-slate-500 font-medium">여행 일정을 불러오는 중...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-slate-800">
      <div className="text-4xl mb-4">⚠️</div>
      <p className="font-bold text-lg">{error}</p>
      <button onClick={() => router.push('/')} className="mt-4 text-rose-500 hover:underline font-medium">홈으로 돌아가기</button>
    </div>
  );

  if (!trip) return null;

  const currentDayPlan = trip.itinerary_data.itinerary[currentDayIndex];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      
      {/* ✨ 헤더: 메인 페이지와 통일된 디자인 */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 h-20 flex items-center">
        <div className="max-w-7xl mx-auto px-6 w-full flex justify-between items-center">
          {/* 로고 */}
          <div 
            className="flex items-center gap-2 cursor-pointer group" 
            onClick={() => router.push('/')}
          >
            <span className="text-3xl text-rose-500 group-hover:scale-110 transition-transform">✈️</span>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-rose-500 tracking-tight leading-none">TripGen</span>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider">SHARED VIEW</span>
            </div>
          </div>

          {/* CTA 버튼 */}
          <button 
            onClick={() => router.push('/')}
            className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
          >
            <span>🚀</span>
            <span>나도 일정 만들기</span>
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="animate-slide-up pb-20">
          
          {/* ✨ 여행 제목 및 정보 섹션 */}
          <div className="mb-10 border-b border-slate-100 pb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
              {trip.itinerary_data.trip_title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500">
              <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                <span className="text-rose-500">📅</span> {trip.duration}
              </span>
              <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                <span className="text-rose-500">📍</span> {trip.destination}
              </span>
              <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                <span className="text-rose-500">👥</span> {trip.companions}
              </span>
              <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                <span className="text-rose-500">🎨</span> {trip.style}
              </span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-10">
            
            {/* 왼쪽: 일정 리스트 (타임라인) */}
            <div className="lg:w-[45%]">
              {/* Day 탭 네비게이션 */}
              <div className="flex overflow-x-auto pb-4 gap-2 mb-6 scrollbar-hide sticky top-24 bg-white z-10 py-2">
                {trip.itinerary_data.itinerary.map((day, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setCurrentDayIndex(idx)} 
                    className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-sm ${
                      currentDayIndex === idx 
                      ? "bg-black text-white shadow-md transform scale-105" 
                      : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    {day.day}일차
                    <span className="ml-2 text-[10px] opacity-70 font-normal">{day.date}</span>
                  </button>
                ))}
              </div>

              <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-10">
                {currentDayPlan.activities.map((act, idx) => (
                  <div key={idx} className="ml-8 relative group">
                    {/* 타임라인 점 */}
                    <div className="absolute -left-[39px] top-6 w-3 h-3 bg-rose-500 rounded-full ring-4 ring-white shadow-sm z-10"></div>
                    
                    {/* 시간 표시 */}
                    <div className="text-xs font-bold text-slate-400 mb-2 pl-1">{act.time}</div>

                    {/* 장소 카드 */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                       <div className="flex flex-col sm:flex-row">
                         {/* 이미지 영역 */}
                         <div className="w-full sm:w-32 h-32 sm:h-auto bg-slate-100 shrink-0 relative overflow-hidden">
                           {act.photoUrl ? (
                             <img src={act.photoUrl} alt={act.place_name} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-2xl text-slate-300 bg-slate-50">📍</div>
                           )}
                           {act.rating && (
                             <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-md font-bold flex items-center gap-1">
                               ⭐ {act.rating}
                             </div>
                           )}
                         </div>
                         
                         <div className="p-5 flex-1 flex flex-col justify-between">
                           <div>
                             <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-lg text-slate-900 leading-tight">{act.place_name}</h3>
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full shrink-0 ml-2">{act.type}</span>
                             </div>
                             <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-4">{act.activity_description}</p>
                           </div>
                           
                           <div className="flex flex-wrap gap-2">
                             {act.googleMapsUri && (
                               <a href={act.googleMapsUri} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition flex items-center gap-1">
                                 🗺️ 지도
                               </a>
                             )}
                             
                             {act.booking_url && (
                               <a href={act.booking_url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition flex items-center gap-1">
                                 🎟️ 예약하기
                               </a>
                             )}
                           </div>
                         </div>
                       </div>
                    </div>

                    {/* 이동 정보 (카드 아래) */}
                    {act.travel_info && (
                      <div className="mt-4 mb-2 flex items-center gap-2 text-xs text-slate-400 pl-1">
                        <div className="h-8 border-l border-dashed border-slate-300"></div>
                        <div className="bg-slate-50 px-2 py-1 rounded border border-slate-100 flex items-center gap-1">
                          <span>🚗</span>
                          <span>{act.travel_info.duration}</span>
                          <span className="text-slate-300">|</span>
                          <span>{act.travel_info.distance}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 오른쪽: 지도 (Sticky & Rounded) */}
            <div className="lg:w-[55%] hidden lg:block">
              <div className="sticky top-28 h-[calc(100vh-150px)] min-h-[500px] bg-slate-100 rounded-[2rem] shadow-inner border border-slate-200 overflow-hidden">
                {getMapUrl(currentDayPlan.activities) ? (
                  <iframe 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    loading="lazy" 
                    allowFullScreen 
                    src={getMapUrl(currentDayPlan.activities)}
                    className="grayscale-[20%] contrast-[1.1] hover:grayscale-0 transition-all duration-500"
                  ></iframe>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-slate-400 gap-2">
                    <span className="text-4xl opacity-50">🗺️</span>
                    <span className="font-medium">지도 정보를 불러올 수 없습니다.</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
      
      <footer className="border-t border-slate-100 py-10 mt-12 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
          <div>© 2025 TripGen Inc. All rights reserved.</div>
          <div className="flex gap-6 font-medium">
            <span className="hover:text-slate-600 cursor-pointer">서비스 소개</span>
            <span className="hover:text-slate-600 cursor-pointer">이용약관</span>
            <span className="hover:text-slate-600 cursor-pointer">개인정보처리방침</span>
          </div>
        </div>
      </footer>
    </div>
  );
}