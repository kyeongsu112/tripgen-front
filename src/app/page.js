"use client";
import { useState } from "react";
import axios from "axios";

export default function Home() {
  // --- 상태 관리 ---
  // 1. 탭 상태 (home, mytrip)
  const [activeTab, setActiveTab] = useState("home");

  // 2. 입력 폼 상태 (시작일, 종료일 분리)
  const [formData, setFormData] = useState({
    destination: "",
    startDate: "",
    endDate: "",
    style: "",
    companions: "",
  });

  // 3. 결과 및 화면 표시 상태
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentDayIndex, setCurrentDayIndex] = useState(0); // 현재 보고 있는 날짜 (0일차, 1일차...)

  // --- 핸들러 ---
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 날짜 유효성 검사
    if (formData.startDate > formData.endDate) {
      alert("종료일이 시작일보다 빠를 수 없습니다.");
      return;
    }

    setLoading(true);
    setResult(null);
    setCurrentDayIndex(0); // 결과 나오면 1일차부터 보여주기

    try {
      const response = await axios.post("https://tripgen-server.onrender.com/api/generate-trip", formData);
      if (response.data.success) {
        setResult(response.data.data);
      }
    } catch (error) {
      alert("서버 오류가 발생했습니다.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 날짜 이동 버튼 핸들러
  const handlePrevDay = () => {
    if (currentDayIndex > 0) setCurrentDayIndex(currentDayIndex - 1);
  };

  const handleNextDay = () => {
    if (result && currentDayIndex < result.itinerary_data.itinerary.length - 1) {
      setCurrentDayIndex(currentDayIndex + 1);
    }
  };

  // --- UI 렌더링 ---
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      
      {/* 1. 상단 네비게이션 (탭) */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-extrabold text-blue-600 mr-8 cursor-pointer" onClick={() => window.location.reload()}>
                ✈️ TripGen
              </span>
              <div className="hidden md:flex space-x-8">
                <button 
                  onClick={() => setActiveTab("home")}
                  className={`${activeTab === "home" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-900"} px-1 pt-1 text-sm font-medium h-16`}
                >
                  일정 생성
                </button>
                <button 
                  onClick={() => setActiveTab("mytrip")}
                  className={`${activeTab === "mytrip" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-900"} px-1 pt-1 text-sm font-medium h-16`}
                >
                  내 여행 보관함
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 2. 메인 콘텐츠 영역 */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        
        {/* 탭 1: 일정 생성 화면 */}
        {activeTab === "home" && (
          <>
            {/* 입력 폼 */}
            {!result && (
              <div className="bg-white rounded-2xl shadow-lg p-8 mb-10 animate-fade-in-up">
                <h2 className="text-xl font-bold mb-6 text-gray-800">여행 정보를 입력해주세요</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 여행지 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">어디로 떠나시나요?</label>
                    <input name="destination" placeholder="예: 파리, 도쿄" className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" onChange={handleChange} required />
                  </div>

                  {/* 날짜 선택 (Date Picker) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">가는 날</label>
                      <input type="date" name="startDate" className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" onChange={handleChange} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">오는 날</label>
                      <input type="date" name="endDate" className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" onChange={handleChange} required />
                    </div>
                  </div>

                  {/* 스타일 및 동행 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">스타일</label>
                      <input name="style" placeholder="예: 휴양, 박물관" className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" onChange={handleChange} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">동행</label>
                      <input name="companions" placeholder="예: 부모님, 혼자" className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" onChange={handleChange} />
                    </div>
                  </div>
                  
                  <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg disabled:bg-gray-400">
                    {loading ? "📅 날짜에 맞춰 일정을 짜고 있어요..." : "🚀 여행 일정 생성하기"}
                  </button>
                </form>
              </div>
            )}

            {/* 결과 화면 (일별 이동 기능 포함) */}
            {result && result.itinerary_data && (
              <div className="animate-fade-in-up">
                {/* 제목 및 다시하기 버튼 */}
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">{result.itinerary_data.trip_title}</h2>
                  <button onClick={() => setResult(null)} className="text-sm text-gray-500 underline hover:text-blue-600">
                    새 일정 만들기
                  </button>
                </div>

                {/* Day Navigation Control */}
                <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm mb-6">
                  <button 
                    onClick={handlePrevDay} 
                    disabled={currentDayIndex === 0}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                  >
                    ← 이전 날
                  </button>

                  <div className="text-center">
                    <div className="text-lg font-extrabold text-blue-600">
                      Day {result.itinerary_data.itinerary[currentDayIndex].day}
                    </div>
                    <div className="text-sm text-gray-500">
                      {result.itinerary_data.itinerary[currentDayIndex].date || "날짜 정보 없음"}
                    </div>
                  </div>

                  <button 
                    onClick={handleNextDay} 
                    disabled={currentDayIndex === result.itinerary_data.itinerary.length - 1}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                  >
                    다음 날 →
                  </button>
                </div>

                {/* 현재 선택된 날짜의 일정 리스트 */}
                <div className="space-y-6">
                  {result.itinerary_data.itinerary[currentDayIndex].activities.map((act, idx) => (
                    <div key={idx} className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col md:flex-row hover:shadow-lg transition">
                      {/* 이미지 */}
                      {act.photoUrl ? (
                        <div className="md:w-40 h-40 md:h-auto relative shrink-0">
                          <img src={act.photoUrl} alt={act.place_name} className="w-full h-full object-cover" />
                          {act.rating && (
                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                              ⭐ {act.rating}
                            </div>
                          )}
                        </div>
                      ) : (
                         <div className="md:w-40 h-40 bg-gray-100 flex items-center justify-center text-3xl shrink-0">📍</div>
                      )}

                      {/* 내용 */}
                      <div className="p-5 flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                            {act.time}
                          </span>
                          <span className="text-xs text-gray-400 border px-2 py-0.5 rounded">{act.type}</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{act.place_name}</h3>
                        <p className="text-gray-600 text-sm mb-3">{act.activity_description}</p>
                        
                        {act.googleMapsUri && act.googleMapsUri !== "#" && (
                          <a href={act.googleMapsUri} target="_blank" rel="noreferrer" className="text-blue-500 text-sm hover:underline">
                            구글 지도 보기
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </>
        )}

        {/* 탭 2: 내 여행 보관함 (UI만 구현) */}
        {activeTab === "mytrip" && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🧳</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">내 여행 보관함</h2>
            <p className="text-gray-500">저장된 여행 일정을 이곳에서 확인할 수 있습니다.</p>
            <p className="text-gray-400 text-sm mt-2">(DB 연동 기능 개발 중...)</p>
          </div>
        )}

      </main>
    </div>
  );
}