"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";

const API_BASE_URL = "https://tripgen-server.onrender.com/api"; 
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function SharedTripPage() {
  const params = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [selectedActivity, setSelectedActivity] = useState(null);

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

  useEffect(() => {
    setSelectedActivity(null);
  }, [currentDayIndex]);

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900"><div className="animate-spin text-4xl">⚪</div></div>;
  if (error) return <div className="min-h-screen flex flex-col items-center justify-center text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900"><div className="text-4xl mb-2">⚠️</div><div className="font-bold">{error}</div></div>;
  if (!trip) return null;

  const currentDayPlan = trip.itinerary_data.itinerary[currentDayIndex];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100 transition-colors">
      
      {/* 헤더 */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 h-16 flex items-center transition-colors">
        <div className="max-w-7xl mx-auto px-4 w-full flex justify-between items-center">
          <div 
            className="flex items-center gap-2 cursor-pointer group" 
            onClick={() => router.push('/')}
          >
            <span className="text-2xl group-hover:scale-110 transition-transform text-rose-500">✈️</span>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">TripGen</span>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] px-2 py-1 rounded-full font-bold ml-1 tracking-wider">SHARED</span>
          </div>

          <button 
            onClick={() => router.push('/')}
            className="text-sm font-bold text-white bg-rose-500 px-5 py-2 rounded-full hover:bg-rose-600 transition shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-2"
          >
            <span>🚀</span> 나도 일정 만들기
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="animate-fade-in-up pb-20">
          
          {/* 여행 제목 및 정보 */}
          <div className="bg-white dark:bg-slate-900 p-2 mb-8 transition-colors">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3">{trip.itinerary_data.trip_title}</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400">
              <span className="bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-700 flex items-center gap-1"><span className="text-rose-500">🗓️</span> {trip.duration}</span>
              <span className="bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-700 flex items-center gap-1"><span className="text-rose-500">📍</span> {trip.destination}</span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* 왼쪽: 일정 리스트 */}
            <div className="lg:w-[45%] flex flex-col">
              {/* 날짜 탭 */}
              <div className="flex overflow-x-auto pb-4 gap-2 mb-2 scrollbar-hide sticky top-16 bg-white dark:bg-slate-900 z-10 py-2 transition-colors">
                {trip.itinerary_data.itinerary.map((day, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setCurrentDayIndex(idx)} 
                    className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-sm ${
                        currentDayIndex === idx 
                        ? "bg-black dark:bg-white text-white dark:text-black scale-105" 
                        : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    {day.day}일차
                  </button>
                ))}
              </div>

              <div className="relative border-l-2 border-slate-100 dark:border-slate-700 ml-4 space-y-8 pb-10">
                {currentDayPlan.activities.map((act, idx) => (
                  <div key={idx} className="ml-8 relative group">
                    {/* 타임라인 점 */}
                    <div className="absolute -left-[39px] top-6 w-3 h-3 bg-rose-500 rounded-full ring-4 ring-white dark:ring-slate-900 shadow-sm z-10"></div>
                    
                    {/* 시간 */}
                    <div className="text-xs font-bold text-slate-400 mb-2 pl-1">{act.time}</div>

                    {/* 장소 카드 */}
                    <div 
                        onClick={() => setSelectedActivity(act)}
                        className={`bg-white dark:bg-slate-800 rounded-2xl border overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group ${selectedActivity === act ? 'border-rose-500 ring-2 ring-rose-100 dark:ring-rose-900' : 'border-slate-200 dark:border-slate-700'}`}
                    >
                       <div className="flex flex-col sm:flex-row">
                         {/* 이미지 */}
                         <div className="w-full sm:w-32 h-32 sm:h-auto bg-slate-100 dark:bg-slate-700 shrink-0 relative overflow-hidden">
                           {act.photoUrl ? (
                             <img src={act.photoUrl} alt={act.place_name} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-2xl bg-slate-50 dark:bg-slate-700 text-slate-300">📍</div>
                           )}
                         </div>
                         
                         <div className="p-4 flex-1 flex flex-col justify-between">
                           <div>
                              <div className="flex justify-between items-start mb-1">
                                  <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight line-clamp-1">{act.place_name}</h3>
                                  <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded-full shrink-0 ml-2">{act.type}</span>
                              </div>
                              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-3">{act.activity_description}</p>
                           </div>
                           
                           {/* 버튼들 */}
                           <div className="flex flex-wrap gap-2">
                             {act.googleMapsUri && (
                               <a 
                                 href={act.googleMapsUri} 
                                 target="_blank" 
                                 rel="noopener noreferrer" 
                                 onClick={(e) => e.stopPropagation()} 
                                 className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition flex items-center gap-1"
                               >
                                 🗺️ 구글맵
                               </a>
                             )}
                             {act.booking_url && (
                               <a 
                                 href={act.booking_url} 
                                 target="_blank" 
                                 rel="noopener noreferrer" 
                                 onClick={(e) => e.stopPropagation()} 
                                 className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 transition flex items-center gap-1"
                               >
                                 🎟️ 예약하기
                               </a>
                             )}
                           </div>
                         </div>
                       </div>
                    </div>

                    {/* 이동 정보 */}
                    {act.travel_info && (
                      <div className="mt-4 mb-2 flex items-center gap-2 text-xs text-slate-400 pl-1">
                        <div className="h-6 border-l border-dashed border-slate-300 dark:border-slate-600"></div>
                        <div className="bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-100 dark:border-slate-700 flex items-center gap-1">
                          <span>🚗</span>
                          <span>{act.travel_info.duration}</span>
                          <span className="text-slate-300 dark:text-slate-600">|</span>
                          <span>{act.travel_info.distance}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 오른쪽: 지도 (Sticky) */}
            <div className="lg:w-[55%] hidden lg:block">
              <div className="sticky top-24 h-[calc(100vh-150px)] min-h-[500px] bg-slate-100 dark:bg-slate-800 rounded-[2rem] shadow-inner border border-slate-200 dark:border-slate-700 overflow-hidden relative">
                {getMapUrl(currentDayPlan.activities) ? (
                  <>
                    <iframe 
                      width="100%" 
                      height="100%" 
                      style={{ border: 0 }} 
                      loading="lazy" 
                      allowFullScreen 
                      src={getMapUrl(currentDayPlan.activities)}
                      className="grayscale-[20%] contrast-[1.1] hover:grayscale-0 transition-all duration-500"
                    ></iframe>
                    
                    {selectedActivity && (
                       <button 
                         onClick={() => setSelectedActivity(null)}
                         className="absolute top-4 left-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur text-slate-800 dark:text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold hover:bg-white dark:hover:bg-slate-700 transition flex items-center gap-2"
                       >
                         🔙 전체 경로 보기
                       </button>
                    )}
                  </>
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
    </div>
  );
}