"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const API_BASE_URL = "https://tripgen-server.onrender.com/api"; 
// const API_BASE_URL = "http://localhost:8080/api"; 

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export default function CommunityPage() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isWriting, setIsWriting] = useState(false); 
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user);
      fetchPosts();
    };
    init();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/community`);
      setPosts(res.data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!user) {
      if (confirm("로그인이 필요합니다. 로그인 하시겠습니까?")) router.push('/login');
      return;
    }
    if (!content.trim()) return alert("내용을 입력해주세요.");

    try {
      const nickname = user.user_metadata?.nickname || user.email.split('@')[0];
      await axios.post(`${API_BASE_URL}/community`, {
        user_id: user.id,
        email: user.email,
        nickname: nickname,
        content,
        is_anonymous: isAnonymous
      });
      setContent("");
      setIsWriting(false); 
      fetchPosts();
      alert("공유되었습니다! 🎉");
    } catch (err) { alert("작성 실패: " + err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/community/${id}`, {
        data: { user_id: user?.id, email: user?.email }
      });
      fetchPosts();
      alert("삭제되었습니다.");
    } catch (err) { alert("삭제 권한이 없습니다."); }
  };

  const handleNav = (path) => {
      if (path === '/?view=mytrip' && !user) {
          alert("로그인이 필요합니다.");
          return;
      }
      router.push(path);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      
      {/* 헤더 (메인과 통일) */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 h-16 md:h-20 flex items-center">
        <div className="max-w-7xl mx-auto px-4 md:px-6 w-full flex justify-between items-center">
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
              <span className="text-2xl md:text-3xl text-rose-500">✈️</span>
              <span className="text-lg md:text-xl font-extrabold tracking-tight text-rose-500">TripGen</span>
            </div>
            
            {/* 데스크톱 메뉴 그룹 */}
            <div className="hidden md:flex items-center gap-4">
                <div className="flex gap-1 bg-slate-100/80 p-1.5 rounded-full border border-slate-200">
                    <button onClick={() => handleNav('/?view=home')} className="px-5 py-2 rounded-full text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-white transition-all">일정 생성</button>
                    <button onClick={() => handleNav('/?view=mytrip')} className="px-5 py-2 rounded-full text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-white transition-all">보관함</button>
                </div>
                <div className="flex gap-1 bg-slate-100/80 p-1.5 rounded-full border border-slate-200">
                    <button onClick={() => router.push('/community')} className="px-5 py-2 rounded-full text-sm font-bold bg-white text-slate-900 shadow-sm">공유게시판</button>
                    <button onClick={() => router.push('/board')} className="px-5 py-2 rounded-full text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-white transition-all">건의함</button>
                </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 모바일 메뉴 */}
            <div className="flex md:hidden gap-1 mr-1">
               <button onClick={() => handleNav('/?view=home')} className="text-xs font-bold px-2 py-1.5 rounded-lg bg-slate-100 text-slate-600">생성</button>
               <button onClick={() => handleNav('/?view=mytrip')} className="text-xs font-bold px-2 py-1.5 rounded-lg bg-slate-100 text-slate-600">보관</button>
               <button onClick={() => router.push('/community')} className="text-xs font-bold px-2 py-1.5 rounded-lg bg-black text-white">공유</button>
               <button onClick={() => router.push('/board')} className="text-xs font-bold px-2 py-1.5 rounded-lg bg-slate-100 text-slate-600">건의</button>
            </div>

            {user ? (
                <button onClick={() => router.push('/mypage')} className="flex items-center gap-2 bg-white border border-slate-200 rounded-full pl-2 pr-1 py-1 hover:shadow-md transition"><span className="text-xs font-bold text-slate-700 ml-1 hidden sm:inline">MY</span><div className="w-7 h-7 bg-slate-800 rounded-full text-white flex items-center justify-center text-[10px]">👤</div></button>
            ) : <button onClick={() => router.push('/login')} className="text-sm font-bold text-slate-700 hover:text-rose-500 transition">로그인</button>}
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-black text-slate-900 mb-2">🗣️ 여행 공유 게시판</h1>
            <p className="text-slate-500">나만의 여행 꿀팁이나 일정을 자유롭게 공유해보세요!</p>
          </div>
          <button 
            onClick={() => {
              if (!user) { if(confirm("로그인이 필요합니다.")) router.push('/login'); return; }
              setIsWriting(!isWriting);
            }}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition shadow-lg transform hover:-translate-y-1 flex items-center gap-2 ${isWriting ? 'bg-slate-200 text-slate-700' : 'bg-black text-white hover:bg-slate-800'}`}
          >
            {isWriting ? "✕ 닫기" : "✏️ 글쓰기"}
          </button>
        </div>

        {isWriting && (
          <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-xl mb-12 animate-fade-in-up relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="여행 이야기를 들려주세요..."
              className="w-full h-40 p-4 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:border-rose-500 resize-none transition mb-4 text-base"
            />
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${isAnonymous ? 'bg-slate-800 border-slate-800' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                    {isAnonymous && <span className="text-white text-xs">✓</span>}
                </div>
                <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="hidden" />
                <span className="text-sm font-bold text-slate-600">익명으로 쓰기</span>
              </label>
              <button onClick={handleSubmit} className="px-8 py-2.5 rounded-xl bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 transition shadow-md">등록하기</button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {loading ? (
            <div className="text-center text-slate-400 py-20">로딩 중...</div>
          ) : posts.length === 0 ? (
            <div className="text-center bg-slate-50 rounded-3xl p-16 border-2 border-dashed border-slate-200"><p className="text-5xl mb-4 opacity-30">📝</p><p className="text-slate-500 font-bold">아직 공유된 이야기가 없습니다.</p><p className="text-sm text-slate-400 mt-1">첫 번째 여행 이야기를 들려주세요!</p></div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border ${post.is_anonymous ? 'bg-slate-100 border-slate-200' : 'bg-rose-50 border-rose-100'}`}>{post.is_anonymous ? '🥸' : '😎'}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{post.is_anonymous ? '익명 여행자' : post.nickname}</p>
                        {user && user.id === post.user_id && <span className="text-[10px] font-extrabold text-rose-500 bg-rose-50 px-1.5 rounded">ME</span>}
                        {post.email === ADMIN_EMAIL && <span className="text-[10px] font-extrabold text-white bg-black px-1.5 rounded">ADMIN</span>}
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{new Date(post.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {user && (user.id === post.user_id || user.email === ADMIN_EMAIL) && <button onClick={() => handleDelete(post.id)} className="text-xs font-bold text-slate-300 hover:text-red-500 px-2 py-1 transition">삭제</button>}
                </div>
                <div className="pl-[52px]"><p className="text-slate-700 text-base leading-relaxed whitespace-pre-wrap">{post.content}</p></div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}