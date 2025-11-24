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
  const [isWriting, setIsWriting] = useState(false); // 글쓰기 모드 토글
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
      await axios.post(`${API_BASE_URL}/community`, {
        user_id: user.id,
        email: user.email,
        nickname: user.user_metadata?.nickname,
        content,
        is_anonymous: isAnonymous
      });
      setContent("");
      setIsWriting(false); // 작성 후 닫기
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
    } catch (err) { alert("삭제 권한이 없습니다."); }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      
      {/* 헤더 */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 h-16 md:h-20 flex items-center">
        <div className="max-w-4xl mx-auto px-6 w-full flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-2xl md:text-3xl text-rose-500">✈️</span>
            <span className="text-xl font-bold text-rose-500 tracking-tight">TripGen</span>
            <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-1 rounded-full font-bold ml-1 tracking-wider">COMMUNITY</span>
          </div>
          <button onClick={() => router.push('/')} className="text-sm font-bold text-slate-500 hover:text-slate-900 transition">홈으로 가기</button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-slate-900">🗣️ 여행 공유</h1>
          {/* 글쓰기 버튼 (누르면 폼 열림) */}
          <button 
            onClick={() => {
              if (!user) { if(confirm("로그인이 필요합니다.")) router.push('/login'); return; }
              setIsWriting(!isWriting);
            }}
            className={`px-5 py-2.5 rounded-full font-bold text-sm transition shadow-md ${isWriting ? 'bg-slate-200 text-slate-700' : 'bg-rose-500 text-white hover:bg-rose-600'}`}
          >
            {isWriting ? "취소" : "✏️ 글쓰기"}
          </button>
        </div>

        {/* 글쓰기 폼 (isWriting일 때만 등장) */}
        {isWriting && (
          <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-lg mb-10 animate-fade-in-up">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="나만의 여행 꿀팁이나 일정을 공유해보세요!"
              className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500 resize-none bg-slate-50 focus:bg-white transition mb-4"
            />
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${isAnonymous ? 'bg-slate-800 border-slate-800' : 'border-slate-300 bg-white'}`}>
                    {isAnonymous && <span className="text-white text-xs">✓</span>}
                </div>
                <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="hidden" />
                <span className="text-sm font-bold text-slate-500">익명으로 쓰기</span>
              </label>
              <button onClick={handleSubmit} className="px-6 py-2 rounded-xl bg-black text-white font-bold text-sm hover:bg-slate-800 transition">등록</button>
            </div>
          </div>
        )}

        {/* 게시글 목록 */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center text-slate-400 py-10">불러오는 중...</div>
          ) : posts.length === 0 ? (
            <div className="text-center bg-slate-50 rounded-2xl p-10 border border-dashed border-slate-200"><p className="text-4xl mb-2">📝</p><p className="text-slate-500 font-medium">첫 번째 여행 이야기를 들려주세요!</p></div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition duration-200">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl border ${post.is_anonymous ? 'bg-slate-100 border-slate-200' : 'bg-rose-50 border-rose-100'}`}>
                      {post.is_anonymous ? '🥸' : '😎'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        {post.is_anonymous ? '익명 여행자' : post.nickname}
                        {/* 본인 표시 */}
                        {user && user.id === post.user_id && <span className="text-rose-500 text-[10px] border border-rose-200 px-1.5 rounded">ME</span>}
                        {/* 관리자 표시 */}
                        {post.email === ADMIN_EMAIL && <span className="bg-black text-white text-[10px] px-1.5 py-0.5 rounded font-bold">ADMIN</span>}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400">
                        {new Date(post.created_at).toLocaleDateString()} {new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                  {/* 삭제 버튼 */}
                  {user && (user.id === post.user_id || user.email === ADMIN_EMAIL) && (
                    <button onClick={() => handleDelete(post.id)} className="text-xs font-bold text-slate-300 hover:text-red-500 px-2 py-1">삭제</button>
                  )}
                </div>
                <div className="pl-[52px]">
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}