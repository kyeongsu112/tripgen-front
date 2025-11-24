"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import axios from "axios";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
// 배포 주소 (Render)
const API_BASE_URL = "https://tripgen-server.onrender.com/api";
// const API_BASE_URL = "http://localhost:8080/api";

export default function AdminPage() {
  const [trips, setTrips] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("trips"); // 'trips' | 'users'
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && user.email === ADMIN_EMAIL) {
        fetchData();
      } else {
        alert("관리자만 접근 가능합니다.");
        router.push("/");
      }
      setLoading(false);
    };
    checkAdmin();
  }, []);

  const fetchData = async () => {
    // 1. 여행 기록 가져오기
    const { data: tripsData } = await supabase
      .from("trip_plans")
      .select("*")
      .order("created_at", { ascending: false });
    if (tripsData) setTrips(tripsData);

    // 2. 사용자 이용 현황 가져오기(API 호출)
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/users`);
      setUsers(res.data.data);
    } catch (err) {
      console.error("사용자 정보 로드 실패:", err);
    }
  };

  // 등급 변경 핸들러
  const handleUpdateTier = async (userId, currentTier) => {
    const newTier = currentTier === "free" ? "pro" : "free";
    if (!confirm(`해당 사용자의 등급을 '${newTier.toUpperCase()}'로 변경할까요?`))
      return;

    try {
      await axios.put(`${API_BASE_URL}/admin/user/tier`, {
        target_user_id: userId,
        new_tier: newTier,
      });
      alert("등급이 변경되었습니다.");
      fetchData(); // 데이터 리프레시
    } catch (err) {
      alert("변경 실패: " + err.message);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="animate-spin text-4xl">🔒</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors">
      {/* 헤더 */}
      <nav className="sticky top-0 z-50 bg-navbar/80 backdrop-blur-md border-b border-navbar-border h-20 flex items-center transition-colors">
        <div className="max-w-7xl mx-auto px-6 w-full flex justify-between items-center">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push("/")}
          >
            <span className="text-3xl text-rose-500">🎛️</span>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-rose-500 tracking-tight leading-none">
                TripGen
              </span>
              <span className="text-[10px] font-bold text-foreground/50 tracking-wider">
                ADMIN DASHBOARD
              </span>
            </div>
          </div>
          <button
            onClick={() => router.push("/")}
            className="text-sm font-bold text-foreground/60 hover:text-foreground transition"
          >
            메인으로
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* 상단 요약 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 text-foreground">
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <p className="text-sm font-bold text-foreground/50 mb-1">누적 생성 여행</p>
            <p className="text-3xl font-black text-foreground">{trips.length}</p>
          </div>
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <p className="text-sm font-bold text-foreground/50 mb-1">
              등록된 사용자
            </p>
            <p className="text-3xl font-black text-foreground">{users.length}</p>
          </div>
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground/50 mb-1">현재 관리자</p>
              <p className="text-sm font-bold text-foreground truncate max-w-[150px]">
                {ADMIN_EMAIL}
              </p>
            </div>
            <div className="w-10 h-10 bg-primary/90 text-white rounded-full flex items-center justify-center text-lg">
              👑
            </div>
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div className="flex gap-2 mb-6 border-b border-border pb-1">
          <button
            onClick={() => setActiveTab("trips")}
            className={`px-6 py-3 text-sm font-bold rounded-t-lg transition-all ${
              activeTab === "trips"
                ? "border-b-2 border-primary text-primary"
                : "text-foreground/50 hover:text-foreground"
            }`}
          >
            여행 기록 관리
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-6 py-3 text-sm font-bold rounded-t-lg transition-all ${
              activeTab === "users"
                ? "border-b-2 border-primary text-primary"
                : "text-foreground/50 hover:text-foreground"
            }`}
          >
            사용자 등급 관리
          </button>
        </div>

        {/* 탭1: 여행 기록 리스트 */}
        {activeTab === "trips" && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-background/60 border-b border-border">
                  <tr>
                    <th className="p-5 text-xs font-bold text-foreground/60 uppercase tracking-wider">
                      생성일
                    </th>
                    <th className="p-5 text-xs font-bold text-foreground/60 uppercase tracking-wider">
                      여행지
                    </th>
                    <th className="p-5 text-xs font-bold text-foreground/60 uppercase tracking-wider">
                      기간
                    </th>
                    <th className="p-5 text-xs font-bold text-foreground/60 uppercase tracking-wider">
                      컨셉
                    </th>
                    <th className="p-5 text-xs font-bold text-foreground/60 uppercase tracking-wider">
                      사용자 ID
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {trips.map((trip) => (
                    <tr
                      key={trip.id}
                      className="hover:bg-background/60 transition-colors"
                    >
                      <td className="p-5 text-sm text-foreground/70 whitespace-nowrap">
                        {new Date(trip.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-5 font-bold text-foreground">{trip.destination}</td>
                      <td className="p-5 text-sm text-foreground/70">{trip.duration}</td>
                      <td className="p-5 text-sm">
                        <span className="bg-secondary text-foreground/70 px-2 py-1 rounded-md text-xs font-bold">
                          {trip.style || "-"}
                        </span>
                      </td>
                      <td className="p-5 text-xs text-foreground/50 font-mono whitespace-nowrap">
                        {trip.user_id ? trip.user_id.slice(0, 8) + "..." : "(비회원)"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {trips.length === 0 && (
              <div className="p-10 text-center text-foreground/50">데이터가 없습니다.</div>
            )}
          </div>
        )}

        {/* 탭2: 사용자 등급 관리 리스트 */}
        {activeTab === "users" && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-background/60 border-b border-border">
                  <tr>
                    <th className="p-5 text-xs font-bold text-foreground/60 uppercase tracking-wider">
                      사용자 ID (UUID)
                    </th>
                    <th className="p-5 text-xs font-bold text-foreground/60 uppercase tracking-wider text-center">
                      사용 횟수
                    </th>
                    <th className="p-5 text-xs font-bold text-foreground/60 uppercase tracking-wider text-center">
                      현재 등급
                    </th>
                    <th className="p-5 text-xs font-bold text-foreground/60 uppercase tracking-wider text-center">
                      등급 관리
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {users.map((u) => (
                    <tr
                      key={u.user_id}
                      className="hover:bg-background/60 transition-colors"
                    >
                      <td className="p-5 text-xs font-mono text-foreground/60">
                        {u.user_id}
                      </td>
                      <td className="p-5 text-center font-bold text-foreground/80">
                        {u.usage_count}회
                      </td>
                      <td className="p-5 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                            u.tier === "pro"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                              : "bg-secondary text-foreground/70 border border-border/80"
                          }`}
                        >
                          {u.tier}
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <button
                          onClick={() => handleUpdateTier(u.user_id, u.tier)}
                          className={`text-xs px-4 py-2 rounded-lg font-bold transition shadow-sm ${
                            u.tier === "free"
                              ? "bg-primary text-white hover:bg-primary/90"
                              : "bg-card border border-border text-foreground/70 hover:text-foreground hover:bg-background/60"
                          }`}
                        >
                          {u.tier === "free" ? "PRO로 등급 업" : "FREE로 강등"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.length === 0 && (
              <div className="p-10 text-center text-foreground/50">사용자 데이터 없음</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
