"use client";
import { useState, useEffect, use } from "react"; // use 추가됨
import axios from "axios";
import { useRouter } from "next/navigation";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
// Render 주소 확인
const API_BASE_URL = "https://tripgen-server.onrender.com/api";

// params를 비동기로 처리하는 최신 방식 적용
export default function SharedTripPage({ params: paramsPromise }) {
  // React.use()로 params 언래핑 (Next.js 15+ 호환)
  const params = use(paramsPromise);
  const router = useRouter();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  useEffect(() => {
    if (params?.id) {
      fetchTrip(params.id);
    }
  }, [params]);

  const fetchTrip = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/public/trip/${id}`);
      if (res.data.success) {
        setTrip(res.data.data);
      } else {
        throw new Error("데이터 없음");
      }
    } catch (err) {
      alert("존재하지 않거나 삭제된 여행 일정입니다.");
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  // 지도 URL 생성 (메인과 동일 로직)
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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500 font-bold">일정을 불러오는 중... ✈️</div>;
  if (!trip) return null;

  const dayPlan = trip.itinerary_data.itinerary[currentDayIndex];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-10">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-2xl">✈️</span>
            <span className="font-extrabold text-xl text-blue-600">TripGen</span>
          </div>
          <button onClick={() => router.push('/')} className="text-sm font-bold text-gray-600 border px-4 py-2 rounded-lg hover:bg-gray-50 transition">
            나도 일정 만들기
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{trip.itinerary_data.trip_title}</h1>
          <div className="text-gray-500 flex justify-center items-center gap-3 text-sm">
            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold">📍 {trip.destination}</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span>🗓️ {trip.duration}</span>
          </div>
        </div>

        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm mb-6">
          <button onClick={() => setCurrentDayIndex(Math.max(0, currentDayIndex - 1))} disabled={currentDayIndex === 0} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 font-bold">←</button>
          <div className="text-center"><div className="font-bold text-blue-600 text-xl">DAY {dayPlan.day}</div><div className="text-sm text-gray-500">{dayPlan.date}</div></div>
          <button onClick={() => setCurrentDayIndex(Math.min(trip.itinerary_data.itinerary.length - 1, currentDayIndex + 1))} disabled={currentDayIndex === trip.itinerary_data.itinerary.length - 1} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 font-bold">→</button>
        </div>

        <div className="w-full h-80 bg-gray-200 rounded-2xl overflow-hidden shadow-inner mb-8 border border-gray-300 relative">
           {getMapUrl(dayPlan.activities) ? (
             <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen src={getMapUrl(dayPlan.activities)}></iframe>
           ) : <div className="flex h-full flex-col items-center justify-center text-gray-500"><span className="text-4xl mb-2">🗺️</span><span>경로 정보가 부족합니다.</span></div>}
        </div>

        <div className="space-y-4">
          {dayPlan.activities.map((act, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm flex gap-5 border border-gray-100">
               <div className="w-24 h-24 shrink-0 bg-gray-100 rounded-xl overflow-hidden relative">
                   {act.photoUrl ? <img src={act.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">📍</div>}
               </div>
               <div className="flex-1">
                 <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">{act.time}</span>
                    <span className="text-xs text-gray-500 border px-1 rounded">{act.type}</span>
                 </div>
                 <h3 className="font-bold text-lg text-gray-900">{act.place_name}</h3>
                 <p className="text-sm text-gray-600 mt-1 leading-relaxed">{act.activity_description}</p>
                 {act.travel_info && <div className="mt-3 inline-flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg text-xs text-gray-600"><span className="font-bold text-blue-600">⬇️ {act.travel_info.duration}</span><span>({act.travel_info.distance})</span></div>}
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}