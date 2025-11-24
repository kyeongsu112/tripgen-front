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

export default function BoardPage() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
    if (!content.trim()) return alert("내용을 입력해주세요.");
    try {
      await axios.post(`${API_BASE_URL}/board`, {
        user_id: user?.id || null,
        email: user?.email || null,
        content: content,
      });
      setContent("");
      fetchPosts();
      alert("소중한 의견 감사합니다! 🙏");
    } catch (err) {
      alert("작성 실패");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("정말 삭제하시겠어요?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/board/${id}`, {
        data: { user_id: user?.id, email: user?.email },
      });
      fetchPosts();
      alert("삭제되었습니다.");
    } catch (err) {
      alert("삭제 권한이 없습니다.");
    }
  };

  const handleNav = (path) => {
    if (path === "/?view=mytrip" && !user) {
      alert("로그인이 필요해요.");
      return;
    }
    router.push(path);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors">
      {/* 헤더 */}
      <nav className="sticky top-0 z-50 bg-navbar/80 backdrop-blur-md border-b border-navbar-border h-16 md:h-20 flex items-center">
        <div className="max-w-7xl mx-auto px-4 md:px-6 w-full flex justify-between items-center">
          <div className="flex items-center gap-4 md:gap-8">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => router.push("/")}
            >
              <span className="text-2xl md:text-3xl text-rose-500">🌐</span>
              <span className="text-lg md:text-xl font-extrabold tracking-tight text-rose-500">
                TripGen
              </span>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <div className="flex gap-1 bg-background/60 p-1.5 rounded-full border border-border">
                <button
                  onClick={() => handleNav("/?view=home")}
                  className="px-5 py-2 rounded-full text-sm font-bold text-foreground/60 hover:text-foreground hover:bg-card transition-all"
                >
                  일정 생성
                </button>
                <button
                  onClick={() => handleNav("/?view=mytrip")}
                  className="px-5 py-2 rounded-full text-sm font-bold text-foreground/60 hover:text-foreground hover:bg-card transition-all"
                >
                  보관함
                </button>
              </div>
              <div className="flex gap-1 bg-background/60 p-1.5 rounded-full border border-border">
                <button
                  onClick={() => router.push("/community")}
                  className="px-5 py-2 rounded-full text-sm font-bold text-foreground/60 hover:text-foreground hover:bg-card transition-all"
                >
                  공유게시판
                </button>
                <button className="px-5 py-2 rounded-full text-sm font-bold bg-card text-foreground shadow-sm">
                  건의함
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex md:hidden gap-1 mr-1">
              <button
                onClick={() => handleNav("/?view=home")}
                className="text-xs font-bold px-2 py-1.5 rounded-lg bg-secondary text-foreground/70"
              >
                생성
              </button>
              <button
                onClick={() => handleNav("/?view=mytrip")}
                className="text-xs font-bold px-2 py-1.5 rounded-lg bg-secondary text-foreground/70"
              >
                보관
              </button>
              <button
                onClick={() => router.push("/community")}
                className="text-xs font-bold px-2 py-1.5 rounded-lg bg-secondary text-foreground/70"
              >
                공유
              </button>
              <button className="text-xs font-bold px-2 py-1.5 rounded-lg bg-primary text-white">
                건의
              </button>
            </div>

            {user ? (
              <button
                onClick={() => router.push("/mypage")}
                className="flex items-center gap-2 bg-card border border-border rounded-full pl-2 pr-1 py-1 hover:shadow-md transition"
              >
                <span className="text-xs font-bold text-foreground/80 ml-1 hidden sm:inline">
                  MY
                </span>
                <div className="w-7 h-7 bg-primary rounded-full text-white flex items-center justify-center text-[10px]">
                  👤
                </div>
              </button>
            ) : (
              <button
                onClick={() => router.push("/login")}
                className="text-sm font-bold text-foreground/80 hover:text-rose-500 transition"
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-foreground mb-2">익명 건의함</h1>
          <p className="text-foreground/70 font-medium">
            로그인 여부와 상관없이 의견을 남겨주세요.
            <br />
            작성자는 익명으로 안전하게 보호돼요.
          </p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm mb-10 transition-all focus-within:ring-2 focus-within:ring-rose-100">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="서비스 개선을 위한 의견을 적어주세요..."
            className="w-full h-32 p-4 rounded-xl border border-border bg-background focus:bg-card focus:outline-none focus:border-rose-500 resize-none transition-colors placeholder:text-foreground/60 text-sm"
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={handleSubmit}
              disabled={!content.trim()}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all transform active:scale-95 ${
                !content.trim()
                  ? "bg-secondary text-foreground/50 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary/90 shadow-md"
              }`}
            >
              익명으로 보내기
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center text-foreground/60 py-10 flex flex-col items-center gap-2">
              <div className="animate-spin text-2xl">⚪</div>
              <span>의견을 불러오는 중...</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center bg-background rounded-2xl p-10 border border-dashed border-border">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-foreground/70 font-medium">
                아직 등록된 건의사항이 없습니다.
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition duration-200 group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-xl border border-border">
                      🥸
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground flex items-center gap-2">
                        익명 사용자
                        {post.email === ADMIN_EMAIL && (
                          <span className="bg-black text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                            ADMIN
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] font-bold text-foreground/60">
                        {new Date(post.created_at).toLocaleDateString()}{" "}
                        {new Date(post.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  {user &&
                    (user.id === post.user_id || user.email === ADMIN_EMAIL) && (
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="text-xs font-bold text-foreground/50 hover:text-rose-500 bg-background hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        삭제
                      </button>
                    )}
                </div>
                <div className="pl-[52px]">
                  <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap bg-background p-4 rounded-xl rounded-tl-none border border-border">
                    {post.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
      <footer className="py-10 mt-12 border-t border-border text-center">
        <p className="text-xs text-foreground/60">
          © 2025 TripGen Inc. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
