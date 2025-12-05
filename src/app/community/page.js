"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
//const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
const API_BASE_URL = "https://tripgen-server.onrender.com/api";

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

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors">

      {/* ✨ 헤더 (다크모드 적용) */}
      <Header user={user} activeTab="community" />

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-black text-foreground mb-2">🗣️ 여행 공유 게시판</h1>
            <p className="text-foreground/60">나만의 여행 꿀팁이나 일정을 자유롭게 공유해보세요!</p>
          </div>
          <button
            onClick={() => {
              if (!user) { if (confirm("로그인이 필요합니다.")) router.push('/login'); return; }
              setIsWriting(!isWriting);
            }}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition shadow-lg transform hover:-translate-y-1 flex items-center gap-2 ${isWriting ? 'bg-secondary text-foreground' : 'bg-primary text-white hover:bg-primary/90'}`}
          >
            {isWriting ? "✕ 닫기" : "✏️ 글쓰기"}
          </button>
        </div>

        {isWriting && (
          <div className="bg-card p-6 rounded-2xl border border-border shadow-xl mb-12 animate-fade-in-up relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="여행 이야기를 들려주세요..."
              className="w-full h-40 p-4 rounded-xl border border-border bg-secondary/50 focus:bg-card focus:outline-none focus:border-primary resize-none transition mb-4 text-base text-foreground placeholder:text-foreground/40"
            />
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${isAnonymous ? 'bg-foreground border-foreground' : 'border-border bg-card group-hover:border-foreground/50'}`}>
                  {isAnonymous && <span className="text-background text-xs">✓</span>}
                </div>
                <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="hidden" />
                <span className="text-sm font-bold text-foreground/70">익명으로 쓰기</span>
              </label>
              <button onClick={handleSubmit} className="px-8 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition shadow-md">등록하기</button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {loading ? (
            <div className="text-center text-foreground/40 py-20">로딩 중...</div>
          ) : posts.length === 0 ? (
            <div className="text-center bg-secondary/30 rounded-3xl p-16 border-2 border-dashed border-border"><p className="text-5xl mb-4 opacity-30">📝</p><p className="text-foreground/60 font-bold">아직 공유된 이야기가 없습니다.</p><p className="text-sm text-foreground/40 mt-1">첫 번째 여행 이야기를 들려주세요!</p></div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-card p-6 md:p-8 rounded-3xl border border-border shadow-sm hover:shadow-xl transition duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border ${post.is_anonymous ? 'bg-secondary border-border' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/30'}`}>{post.is_anonymous ? '🥸' : '😎'}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground">{post.is_anonymous ? '익명 여행자' : post.nickname}</p>
                        {user && user.id === post.user_id && <span className="text-[10px] font-extrabold text-primary bg-rose-50 dark:bg-rose-900/30 px-1.5 rounded">ME</span>}
                        {post.email === ADMIN_EMAIL && <span className="text-[10px] font-extrabold text-white bg-black dark:bg-white dark:text-black px-1.5 rounded">ADMIN</span>}
                      </div>
                      <p className="text-xs text-foreground/40 font-medium mt-0.5">{new Date(post.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {user && (user.id === post.user_id || user.email === ADMIN_EMAIL) && <button onClick={() => handleDelete(post.id)} className="text-xs font-bold text-foreground/30 hover:text-red-500 px-2 py-1 transition">삭제</button>}
                </div>
                <div className="pl-[52px]"><p className="text-foreground/80 text-base leading-relaxed whitespace-pre-wrap">{post.content}</p></div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}