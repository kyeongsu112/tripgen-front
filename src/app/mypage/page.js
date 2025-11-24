"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// --- 설정 ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const API_BASE_URL = "https://tripgen-server.onrender.com/api"; 

export default function MyPage() {
  const [user, setUser] = useState(null);
  const [limitInfo, setLimitInfo] = useState(null);
  const [myTrips, setMyTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 닉네임 관련
  const [nickname, setNickname] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [newNickname, setNewNickname] = useState("");

  // ✨ 프로필 사진 관련 State
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
      
      // 닉네임 불러오기
      const savedNickname = session.user.user_metadata?.nickname || session.user.email.split('@')[0];
      setNickname(savedNickname);
      setNewNickname(savedNickname);

      // ✨ 저장된 프로필 사진 URL 불러오기
      if (session.user.user_metadata?.avatar_url) {
        setAvatarUrl(session.user.user_metadata.avatar_url);
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

  // ✨ 프로필 사진 업로드 핸들러
  const handleAvatarUpload = async (event) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('이미지를 선택해주세요.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`; // 유니크한 파일명 생성
      const filePath = `${fileName}`;

      // 1. Supabase Storage에 업로드
      const { error: uploadError } = await supabase.storage
        .from('avatars') // 아까 만든 버킷 이름
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. 공개 URL 가져오기
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // 3. 유저 메타데이터 업데이트
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;

      // 4. 화면 갱신
      setAvatarUrl(publicUrl);
      alert("프로필 사진이 변경되었습니다! 📸");

    } catch (error) {
      alert('업로드 실패: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

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
      alert("닉네임이 변경되었습니다!");
    } catch (err) {
      alert("업데이트 실패: " + err.message);
    }
  };

  const handleDelete = async (e, tripId) => {
    e.stopPropagation();
    if (!confirm("정말 이 여행 일정을 삭제하시겠습니까?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/trip/${tripId}`, {
        data: { user_id: user.id }
      });
      setTrips(trips.filter(t => t.id !== tripId));
      alert("삭제되었습니다.");
    } catch (err) {
      alert("삭제 실패: " + err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleWithdrawal = async () => {
    if (!confirm("정말로 탈퇴하시겠습니까?\n모든 여행 기록이 삭제되며 복구할 수 없습니다.")) return;
    try {
      await axios.delete(`${API_BASE_URL}/auth/delete`, { data: { user_id: user.id } });
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
    } catch (e) {}
    return `https://source.unsplash.com/featured/?${encodeURIComponent(trip.destination)},travel`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-spin text-4xl">⚪</div></div>;

  const tier = limitInfo?.tier || 'free';
  let maxLimit = 3;
  let tierName = "Free Plan";
  let badgeColor = "bg-slate-100 text-slate-600";

  if (tier === 'pro') { maxLimit = 30; tierName = "Pro Plan"; badgeColor = "bg-purple-100 text-purple-700"; }
  else if (tier === 'admin') { maxLimit = Infinity; tierName = "Admin"; badgeColor = "bg-black text-white"; }

  const percentage = tier === 'admin' ? 0 : Math.min((limitInfo?.usage_count / maxLimit) * 100, 100);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      
      {/* 헤더 */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 h-20 flex items-center">
        <div className="max-w-6xl mx-auto px-6 w-full flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-3xl text-rose-500">✈️</span>
            <span className="text-xl font-bold text-rose-500 tracking-tight">TripGen</span>
          </div>
          <button onClick={() => router.push('/')} className="text-sm font-bold text-slate-500 hover:text-slate-900 transition">
            홈으로 가기
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        
        {/* 프로필 섹션 (카드형) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 mb-12 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6 w-full md:w-auto">
            
            {/* ✨ 프로필 사진 업로드 영역 */}
            <div className="relative group">
              <label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md bg-slate-100 flex items-center justify-center relative">
                  {uploading ? (
                    <span className="text-xs font-bold text-slate-400">업로드..</span>
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">👤</span>
                  )}
                  
                  {/* 호버 시 카메라 아이콘 표시 */}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xl">📷</span>
                  </div>
                </div>
              </label>
              <input 
                id="avatar-upload" 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarUpload} 
                className="hidden" 
                disabled={uploading}
              />
            </div>

            <div className="flex-1">
              {/* 닉네임 수정 UI */}
              <div className="flex items-center gap-3 mb-1 min-h-[36px]">
                {isEditing ? (
                  <div className="flex items-center gap-2 animate-fade-in">
                    <input 
                      type="text" 
                      value={newNickname} 
                      onChange={(e) => setNewNickname(e.target.value)}
                      className="border border-slate-300 rounded-lg px-3 py-1 text-lg font-bold text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 w-40"
                      autoFocus
                    />
                    <button onClick={handleUpdateProfile} className="w-8 h-8 flex items-center justify-center bg-rose-500 text-white rounded-full hover:bg-rose-600 transition shadow-sm" title="저장">✓</button>
                    <button onClick={() => { setIsEditing(false); setNewNickname(nickname); }} className="w-8 h-8 flex items-center justify-center bg-slate-200 text-slate-600 rounded-full hover:bg-slate-300 transition" title="취소">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                      안녕하세요, <span className="text-rose-500">{nickname}</span>님!
                    </h1>
                    <button 
                      onClick={() => setIsEditing(true)} 
                      className="text-slate-400 hover:text-rose-500 transition opacity-0 group-hover:opacity-100 bg-slate-50 p-1 rounded-full"
                      title="닉네임 변경"
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
                <p className="text-slate-400 text-sm font-medium">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col items-end gap-4">
             <div className="bg-slate-50 px-6 py-3 rounded-xl border border-slate-100 w-full md:w-64">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                  <span>이번 달 생성</span>
                  <span>{limitInfo?.usage_count} / {tier === 'admin' ? '∞' : maxLimit}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-rose-500 h-2 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                </div>
             </div>
             
             <button onClick={handleLogout} className="text-sm font-bold text-slate-400 hover:text-slate-800 underline decoration-2 underline-offset-4 transition">
                로그아웃
             </button>
          </div>
        </div>

        {/* 내 여행 목록 */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">내 여행 보관함 <span className="text-rose-500 ml-1 text-lg">{myTrips.length}</span></h2>
            <button onClick={() => router.push('/')} className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-slate-800 transition shadow-md">
              + 새 여행 만들기
            </button>
          </div>
          
          {myTrips.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-24 text-center bg-slate-50/50">
              <div className="text-5xl mb-4 opacity-20">🗺️</div>
              <p className="text-slate-500 font-medium mb-6">아직 저장된 여행 일정이 없습니다.</p>
              <button onClick={() => router.push('/')} className="text-rose-500 font-bold hover:underline">
                첫 번째 여행을 계획해보세요
              </button>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {myTrips.map(trip => {
                const coverImage = getTripCoverImage(trip);
                return (
                  <div key={trip.id} className="group cursor-pointer relative" onClick={() => router.push(`/share/${trip.id}`)}>
                    <div className="relative aspect-[4/3] bg-slate-100 rounded-2xl overflow-hidden mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300">
                       <img 
                          src={coverImage} 
                          alt={trip.destination} 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                          onError={(e) => {e.target.src = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80"}}
                       />
                       <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm text-slate-900">
                          {trip.duration}
                       </div>
                       
                       <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-start justify-end p-3">
                          <button 
                            onClick={(e) => handleDelete(e, trip.id)}
                            className="bg-white text-rose-500 p-2 rounded-full shadow-lg hover:scale-110 transition hover:bg-rose-500 hover:text-white"
                            title="삭제"
                          >
                            🗑️
                          </button>
                       </div>
                    </div>
                    
                    <div className="px-1">
                      <h3 className="font-bold text-lg text-slate-900 truncate mb-1 group-hover:text-rose-500 transition-colors">{trip.itinerary_data.trip_title}</h3>
                      <div className="flex justify-between items-center text-sm">
                        <p className="text-slate-500 font-medium flex items-center gap-1">
                          <span>📍</span> {trip.destination}
                        </p>
                        <p className="text-slate-400 text-xs">{new Date(trip.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 회원 탈퇴 섹션 */}
        <div className="mt-24 pt-10 border-t border-slate-100 flex justify-center">
           <button 
             onClick={handleWithdrawal}
             className="text-xs text-slate-400 hover:text-red-500 hover:underline transition"
           >
             회원 탈퇴하기
           </button>
        </div>

      </main>
    </div>
  );
}