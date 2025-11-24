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

export default function BoardPage() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
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
      const res = await axios.get(`${API_BASE_URL}/board`);
      setPosts(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      if (confirm("로그인이 필요합니다. 로그인 페이지로 이동할까요?")) router.push('/login');
      return;
    }
    if (!content.trim()) return alert("내용을 입력해주세요.");

    try {
      await axios.post(`${API_BASE_URL}/board`, {
        user_id: user.id,
        email: user.email,
        content: content
      });
      setContent("");
      fetchPosts(); // 목록 새로고침
      alert("소중한 의견 감사합니다! 💌");
    } catch (err) {
      alert("작성 실패: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("삭제하시겠습니까?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/board/${id}`, {
        data: { user_id: user.id }
      });
      fetchPosts();
    } catch (err) {
      alert("삭제 실패 (본인 글만 삭제 가능합니다)");
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      {/* 헤더 */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 h-20 flex items-center">
        <div className="max-w-4xl mx-auto px-6 w-full flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-3xl text-rose-500">✈️</span>
            <span className="text-xl font-bold text-rose-500 tracking-tight">TripGen</span>
          </div>
          <button onClick={() => router.push('/')} className="text-sm font-bold text-slate-500 hover:text-slate-900">
            홈으로 가기
          </button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">📢 건의함</h1>
          <p className="text-slate-500">서비스 이용 중 불편한 점이나 바라는 점을 자유롭게 남겨주세요.</p>
        </div>

        {/* 입력 폼 */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-10">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={user ? "여기에 의견을 적어주세요..." : "로그인 후 작성할 수 있습니다."}
            className="w-full h-32 p-4 rounded-xl border border-slate-300 focus:outline-none focus:border-rose-500 resize-none bg-white"
            disabled={!user}
          />
          <div className="flex justify-end mt-3">
            <button 
              onClick={handleSubmit}
              disabled={!user || !content.trim()}
              className={`px-6 py-2.5 rounded-full font-bold text-sm transition ${!user || !content.trim() ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-rose-500 text-white hover:bg-rose-600 shadow-md'}`}
            >
              의견 보내기 🚀
            </button>
          </div>
        </div>

        {/* 게시글 목록 */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center text-slate-400 py-10">불러오는 중...</div>
          ) : posts.length === 0 ? (
            <div className="text-center text-slate-400 py-10">아직 등록된 건의사항이 없습니다. 첫 번째 의견을 남겨주세요!</div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm">👤</div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{post.email ? post.email.split('@')[0] : '익명'}</p>
                      <p className="text-[10px] text-slate-400">{new Date(post.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {user && user.id === post.user_id && (
                    <button onClick={() => handleDelete(post.id)} className="text-xs text-slate-300 hover:text-red-500">삭제</button>
                  )}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}