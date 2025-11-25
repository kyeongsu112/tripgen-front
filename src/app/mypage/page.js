"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

// --- 설정 ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 배포 주소 (Render)
const API_BASE_URL = "https://tripgen-server.onrender.com/api";
// const API_BASE_URL = "http://localhost:8080/api"; // 로컬 테스트 시 주석 해제

export default function MyPage() {
  const [user, setUser] = useState(null);
  const [limitInfo, setLimitInfo] = useState(null);
  const [myTrips, setMyTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  // 닉네임 관련 State
  const [nickname, setNickname] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [newNickname, setNewNickname] = useState("");

  // 프로필 사진 관련 State
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // 닉네임 & 사진 불러오기
      const meta = session.user.user_metadata;
      const savedNickname = meta?.nickname || session.user.email.split('@')[0];
      setNickname(savedNickname);
      setNewNickname(savedNickname);

      if (meta?.avatar_url) {
        // 캐시 방지를 위해 시간 쿼리 추가
        setAvatarUrl(`${meta.avatar_url}?t=${new Date().getTime()}`);
      }

      // 사용량 정보 로드
      const { data: limit } = await supabase.from('user_limits').select('*').eq('user_id', session.user.id).single();
      setLimitInfo(limit || { tier: 'free', usage_count: 0 });

      fetchMyTrips(session.user.id);
    };
    checkUser();
  }, []);

  const fetchMyTrips = async (userId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/my-trips?user_id=${userId}`);
      setMyTrips(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 프로필 사진 업로드
  const handleAvatarUpload = async (event) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/profile_${Date.now()}.${fileExt}`;

      // 1. Storage 업로드
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. URL 가져오기
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      // 3. Auth 정보 업데이트
      const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      if (updateError) throw updateError;

      // 4. 상태 갱신
      setAvatarUrl(publicUrl);
      router.refresh();
      alert("프로필 사진이 변경되었습니다! 📸");

    } catch (error) {
      alert('업로드 실패: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // 닉네임 변경
  const handleUpdateProfile = async () => {
    if (!newNickname.trim()) {
      alert("닉네임을 입력해주세요.");
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({
        data: { nickname: newNickname }
      });
      if (error) throw error;

      setNickname(newNickname);
      setIsEditing(false);
      router.refresh();
      alert("닉네임이 변경되었습니다! ✨");
    } catch (err) {
      alert("업데이트 실패: " + err.message);
    }
  };

  const handleDelete = async (tripId) => {
    if (!confirm("정말 이 여행 일정을 삭제하시겠습니까?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/trip/${tripId}`, {
        data: { user_id: user.id }
      });
      setMyTrips(myTrips.filter(t => t.id !== tripId));
      alert("삭제되었습니다.");
    } catch (err) {
      alert("삭제 실패: " + err.message);
    }
  };

  const handleShare = (tripId) => {
    const shareUrl = `${window.location.origin}/share/${tripId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("공유 링크가 복사되었습니다! 🔗");
    }).catch(() => alert("복사 실패"));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleWithdrawal = async () => {
    if (!confirm("정말로 탈퇴하시겠습니까?\n모든 여행 기록이 삭제되며 복구할 수 없습니다.")) return;
    try {
      await axios.delete(`${API_BASE_URL}/auth/delete`, {
        data: { user_id: user.id, email: user.email }
      });
      await supabase.auth.signOut();
      alert("회원 탈퇴가 완료되었습니다.");
      router.push('/');
    } catch (err) {
      console.error(err);
      alert("탈퇴 처리에 실패했습니다.");
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground dark:bg-slate-900"><div className="animate-spin text-4xl">⚪</div></div>;

  const tier = limitInfo?.tier || 'free';
  let maxLimit = 3;
  let tierName = "Free Plan";
  let badgeColor = "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";

  if (tier === 'pro') { maxLimit = 30; tierName = "Pro Plan"; badgeColor = "bg-purple-100 text-purple-700"; }
  else if (tier === 'admin') { maxLimit = Infinity; tierName = "Admin"; badgeColor = "bg-black text-white dark:bg-white dark:text-black"; }

  const percentage = tier === 'admin' ? 0 : Math.min((limitInfo?.usage_count / maxLimit) * 100, 100);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100 transition-colors">

      {/* ✨ 헤더 (다크모드 적용) */}
      <Header user={user} activeTab="mypage" />

      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        <div className="mb-8 md:mb-10">
          <h1 className="text-2xl md:text-4xl font-black text-foreground mb-2 md:mb-3">마이페이지</h1>
          <p className="text-foreground/60 text-sm md:text-lg font-medium">나의 여행 기록과 계정 정보를 관리하세요.</p>
        </div>

        {/* 프로필 섹션 */}
        <div className="bg-card rounded-3xl border border-border p-6 md:p-8 mb-8 md:mb-12 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">

            {/* 프로필 사진 업로드 */}
            <div className="relative group">
              <label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-background shadow-md bg-secondary flex items-center justify-center relative">
                  {uploading ? (
                    <span className="text-xs font-bold text-foreground/40">UP..</span>
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl md:text-4xl">👤</span>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xl">📷</span>
                  </div>
                </div>
              </label>
              <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
            </div>

            <div className="flex-1">
              {/* 닉네임 수정 */}
              <div className="flex items-center gap-3 mb-1 min-h-[36px]">
                {isEditing ? (
                  <div className="flex items-center gap-2 animate-fade-in">
                    <input
                      type="text"
                      value={newNickname}
                      onChange={(e) => setNewNickname(e.target.value)}
                      className="border border-border rounded-lg px-3 py-1 text-base md:text-lg font-bold text-foreground outline-none focus:border-rose-500 bg-transparent w-32 md:w-40"
                      autoFocus
                    />
                    <button onClick={handleUpdateProfile} className="w-8 h-8 flex items-center justify-center bg-rose-500 text-white rounded-full hover:bg-rose-600 transition shadow-sm">✓</button>
                    <button onClick={() => { setIsEditing(false); setNewNickname(nickname); }} className="w-8 h-8 flex items-center justify-center bg-secondary text-foreground rounded-full hover:bg-border transition">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <h1 className="text-lg md:text-2xl font-bold text-foreground flex items-center gap-2">
                      안녕하세요, <span className="text-rose-500">{nickname}</span>님!
                    </h1>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-foreground/40 hover:text-rose-500 transition opacity-0 group-hover:opacity-100 bg-secondary p-1 rounded-full"
                    >
                      ✏️
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1">
                <span className={`px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border border-transparent ${badgeColor}`}>
                  {tierName}
                </span>
                <p className="text-foreground/60 text-xs md:text-sm font-medium">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={handleLogout} className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-secondary hover:bg-border text-foreground font-bold transition text-sm md:text-base">로그아웃</button>
            <button className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold shadow-lg shadow-rose-200 dark:shadow-none transition text-sm md:text-base">프로필 수정</button>
          </div>
        </div>

        <div className="bg-card px-6 py-3 rounded-xl border border-border w-full md:w-64 mb-8 md:mb-12">
          <div className="flex justify-between text-xs font-bold text-foreground/60 mb-2">
            <span>이번 달 생성</span>
            <span>{limitInfo?.usage_count} / {tier === 'admin' ? '∞' : maxLimit}</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <div className="bg-rose-500 h-2 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
          </div>
        </div>

        {/* 내 여행 목록 */}
        <div className="space-y-6 md:space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">내 여행 보관함 <span className="text-rose-500 ml-1 text-base md:text-lg">{myTrips.length}</span></h2>
            <button onClick={() => router.push('/')} className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 md:px-5 md:py-2.5 rounded-full text-xs md:text-sm font-bold transition shadow-md">
              + 새 여행 만들기
            </button>
          </div>

          {loading ? (
            <div className="py-20 text-center text-foreground/40 font-bold animate-pulse">데이터를 불러오는 중입니다...</div>
          ) : myTrips.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-3xl p-12 md:p-24 text-center bg-secondary/50">
              <div className="text-4xl md:text-5xl mb-4 opacity-20">🗺️</div>
              <p className="text-foreground/60 font-medium mb-6 text-sm md:text-base">아직 저장된 여행 일정이 없습니다.</p>
              <button onClick={() => router.push('/')} className="text-rose-500 font-bold hover:underline text-sm md:text-base">첫 번째 여행을 계획해보세요</button>
            </div>
          ) : (
            <div className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3">
              {myTrips.map(trip => {
                const coverImage = getTripCoverImage(trip);
                return (
                  <div key={trip.id} className="group cursor-pointer relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1" onClick={() => router.push(`/?view=home&tripId=${trip.id}`)}>
                    <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
                      <img src={coverImage} alt={trip.destination} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80" }} />
                      <div className="absolute top-3 left-3 bg-card/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm text-foreground">{trip.duration}</div>
                    </div>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg md:text-xl text-foreground truncate pr-2 group-hover:text-rose-500 transition-colors">{trip.itinerary_data.trip_title}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-foreground/60 font-medium">
                        <span className="flex items-center gap-1"><span>📍</span> {trip.destination}</span>
                        <span className="w-1 h-1 rounded-full bg-border"></span>
                        <span>{new Date(trip.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="px-5 pb-5 flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); handleShare(trip.id); }} className="flex-1 bg-secondary hover:bg-border text-foreground py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">🔗 공유</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(trip.id); }} className="flex-1 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">🗑️ 삭제</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-24 pt-10 border-t border-border flex justify-center">
          <button
            onClick={handleWithdrawal}
            className="text-xs text-foreground/40 hover:text-red-500 hover:underline transition"
          >
            회원 탈퇴하기
          </button>
        </div>

      </main >

      <footer className="py-8 text-center text-foreground/40 text-xs border-t border-border">
        © 2025 TripGen Inc. All rights reserved.
      </footer>
    </div >
  );
}