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

// 배포 주소 (Render)
const API_BASE_URL = "https://tripgen-server.onrender.com/api"; 
// const API_BASE_URL = "http://localhost:8080/api"; 

// 관리자 이메일 확인
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

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
    
    // 로그인 여부 상관없이 작성 가능 (익명 허용)
    if (!content.trim()) return alert("내용을 입력해주세요.");

    try {
      await axios.post(`${API_BASE_URL}/board`, {
        user_id: user?.id || null,    // 로그인했으면 ID, 아니면 null
        email: user?.email || null,   // 로그인했으면 이메일, 아니면 null
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
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      // 삭제 요청 (백엔드에서 본인/관리자 여부 체크)
      await axios.delete(`${API_BASE_URL}/board/${id}`, {
        data: { 
            user_id: user?.id,
            email: user?.email 
        }
      });
      fetchPosts();
      alert("삭제되었습니다.");
    } catch (err) {
      alert("삭제 권한이 없습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      
      {/* 헤더 (메인 페이지와 디자인 통일) */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 h-16 md:h-20 flex items-center">
        <div className="max-w-4xl mx-auto px-6 w-full flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-2xl md:text-3xl text-rose-500">✈️</span>
            <span className="text-lg md:text-xl font-extrabold tracking-tight text-slate-900">TripGen</span>
            <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-1 rounded-full font-bold ml-1 tracking-wider">BOARD</span>
          </div>
          <button 
            onClick={() => router.push('/')} 
            className="text-sm font-bold text-slate-500 hover:text-slate-900 transition"
          >
            홈으로 가기
          </button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-slate-900 mb-2">📢 건의함</h1>
          <p className="text-slate-500 font-medium">
            로그인 없이 자유롭게 의견을 남겨주세요.<br/>
            작성자는 익명으로 안전하게 보호됩니다.
          </p>
        </div>

        {/* 입력 폼 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-10 focus-within:ring-2 focus-within:ring-rose-100 transition-all">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="서비스 이용 중 불편한 점이나 바라는 점을 자유롭게 적어주세요..."
            className="w-full h-32 p-4 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:border-rose-500 resize-none transition-colors placeholder:text-slate-400 text-sm"
          />
          <div className="flex justify-end mt-3">
            <button 
              onClick={handleSubmit}
              disabled={!content.trim()}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all transform active:scale-95 ${
                !content.trim() 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-black text-white hover:bg-slate-800 shadow-md'
              }`}
            >
              의견 보내기 🚀
            </button>
          </div>
        </div>

        {/* 게시글 목록 */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center text-slate-400 py-10 flex flex-col items-center gap-2">
              <div className="animate-spin text-2xl">⚪</div>
              <span>의견을 불러오는 중...</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center bg-slate-50 rounded-2xl p-10 border border-dashed border-slate-200">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-slate-500 font-medium">아직 등록된 건의사항이 없습니다.<br/>첫 번째 의견을 남겨주세요!</p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition duration-200 group">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    {/* 익명 프로필 아이콘 */}
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-xl border border-slate-200">
                      🥸
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        익명 사용자
                        
                        {/* ✨ [추가됨] 본인 글 표시 */}
                        {user && user.id === post.user_id && (
                           <span className="text-rose-500 text-xs font-extrabold">(나)</span>
                        )}

                        {/* 관리자 표시 */}
                        {post.email === ADMIN_EMAIL && (
                           <span className="bg-black text-white text-[10px] px-1.5 py-0.5 rounded font-bold">ADMIN</span>
                        )}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400">
                        {new Date(post.created_at).toLocaleDateString()} {new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                  
                  {/* ✨ [삭제 버튼] 본인 글이거나 관리자일 때만 표시 */}
                  {user && (user.id === post.user_id || user.email === ADMIN_EMAIL) && (
                    <button 
                      onClick={() => handleDelete(post.id)} 
                      className="text-xs font-bold text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      삭제
                    </button>
                  )}
                </div>
                <div className="pl-[52px]">
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl rounded-tl-none border border-slate-100">
                    {post.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
      
      <footer className="py-10 mt-12 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-400">© 2025 TripGen Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}