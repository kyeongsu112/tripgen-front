"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "next/navigation";

// 배포 환경에 맞게 주소 설정
const API_BASE_URL = "https://tripgen-server.onrender.com/api"; 
// const API_BASE_URL = "http://localhost:8080/api"; // 로컬 테스트용

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function SharedTripPage() {
  const params = useParams();
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

  // ✨ [핵심] 메인 페이지와 동일한 지도 URL 생성 함수 추가
  const getMapUrl = (activities) => {
    if (!activities) return null;
    // 이동이나 숙소 제외하고 유효한 장소만 필터링
    const validPlaces = activities.filter(a => a.place_name && !a.place_name.includes("이동"));
    
    // 장소가 2개 미만이면 경로 표시 불가
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin text-4xl">✈️</div></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">{error}</div>;
  if (!trip) return null;

  const currentDayPlan = trip.itinerary_data.itinerary[currentDayIndex];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-blue-100">
      {/* 헤더 */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✈️</span>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">TripGen</span>
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold ml-2">Shared View</span>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="animate-fade-in-up pb-20">
          {/* 여행 제목 및 정보 */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">{trip.itinerary_data.trip_title}</h2>
            <p className="text-slate-500 flex items-center gap-2">
              <span>🗓️ {trip.duration}</span>
              <span className="text-slate-300">|</span>
              <span>📍 {trip.destination}</span>
              <span className="text-slate-300">|</span>
              <span>👥 {trip.companions}</span>
              <span className="text-slate-300">|</span>
              <span>🎨 {trip.style}</span>
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* 왼쪽: 일정 리스트 (타임라인) */}
            <div className="lg:w-1/2">
              {/* 날짜 네비게이션 */}
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 sticky top-20 z-10">
                <button 
                  onClick={() => setCurrentDayIndex(Math.max(0, currentDayIndex - 1))} 
                  disabled={currentDayIndex === 0} 
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 disabled:opacity-30 transition font-bold text-slate-600"
                >
                  ←
                </button>
                <div className="text-center">
                  <div className="font-extrabold text-blue-600 text-lg">DAY {currentDayPlan.day}</div>
                  <div className="text-xs text-slate-400 font-medium">{currentDayPlan.date}</div>
                </div>
                <button 
                  onClick={() => setCurrentDayIndex(Math.min(trip.itinerary_data.itinerary.length-1, currentDayIndex + 1))} 
                  disabled={currentDayIndex === trip.itinerary_data.itinerary.length-1} 
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 disabled:opacity-30 transition font-bold text-slate-600"
                >
                  →
                </button>
              </div>

              <div className="relative border-l-2 border-slate-200 ml-6 space-y-8">
                {currentDayPlan.activities.map((act, idx) => (
                  <div key={idx} className="ml-8 relative group">
                    {/* 타임라인 점 */}
                    <div className="absolute -left-[39px] top-6 bg-white border-4 border-blue-500 w-5 h-5 rounded-full z-10"></div>
                    
                    {/* 이동 정보 */}
                    {act.travel_info && (
                      <div className="mb-4 -ml-2 inline-flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-xs font-medium text-slate-600">
                        <span>👣</span>
                        <span>{act.travel_info.duration} 이동</span>
                        <span className="text-slate-400">({act.travel_info.distance})</span>
                      </div>
                    )}

                    {/* 장소 카드 */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition duration-300 flex flex-col sm:flex-row gap-5">
                       {/* 이미지 영역 */}
                       <div className="w-full sm:w-32 h-32 shrink-0 bg-slate-100 rounded-xl overflow-hidden relative">
                         {act.photoUrl ? (
                           <img src={act.photoUrl} alt={act.place_name} className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-2xl">📍</div>
                         )}
                         {act.rating && (
                           <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                             ⭐ {act.rating}
                           </div>
                         )}
                       </div>
                       
                       <div className="flex-1">
                         <div className="flex items-center gap-2 mb-2">
                            <span className="bg-slate-900 text-white px-2 py-0.5 rounded-md text-xs font-bold font-mono">{act.time}</span>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{act.type}</span>
                         </div>
                         <h3 className="text-lg font-bold text-slate-800 mb-2 leading-tight">{act.place_name}</h3>
                         <p className="text-sm text-slate-500 leading-relaxed mb-3">{act.activity_description}</p>
                         
                         {/* ✨ [핵심] 지도 보기 & 예약 링크 버튼 추가 */}
                         <div className="flex flex-wrap gap-2 mt-2">
                           {act.googleMapsUri && (
                             <a href={act.googleMapsUri} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-500 hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                               🗺️ 지도 보기
                             </a>
                           )}
                           
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
                {getMapUrl(currentDayPlan.activities) ? (
                  <iframe 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    loading="lazy" 
                    allowFullScreen 
                    src={getMapUrl(currentDayPlan.activities)}
                  ></iframe>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-slate-400 bg-slate-50">
                    <span className="text-4xl mb-2">🗺️</span>
                    <span>지도 정보를 불러올 수 없습니다.</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}