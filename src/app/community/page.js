"use client";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
const API_BASE_URL = "https://tripgen-server.onrender.com/api";

// 여행 링크 카드 컴포넌트
function TripLinkCard({ tripId }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/trip-preview/${tripId}`);
        if (res.data.success) {
          setPreview(res.data.data);
        }
      } catch (err) {
        console.error("Preview fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPreview();
  }, [tripId]);

  if (loading) {
    return (
      <div className="bg-secondary/50 rounded-xl p-4 animate-pulse">
        <div className="h-32 bg-secondary rounded-lg mb-2"></div>
        <div className="h-4 bg-secondary rounded w-3/4"></div>
      </div>
    );
  }

  if (!preview) return null;

  return (
    <a
      href={`/share/${tripId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all group mt-3"
    >
      <div className="relative h-32 overflow-hidden">
        <img
          src={preview.coverImage}
          alt={preview.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <h4 className="font-bold text-sm line-clamp-1">{preview.title}</h4>
          <p className="text-xs opacity-80">{preview.destination} · {preview.duration}</p>
        </div>
      </div>
    </a>
  );
}

// 댓글 컴포넌트
function CommentSection({ postId, user }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/community/${postId}/comments`);
      setComments(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (expanded) fetchComments();
  }, [expanded, fetchComments]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    try {
      const nickname = user?.user_metadata?.nickname || user?.email?.split('@')[0] || '익명';
      await axios.post(`${API_BASE_URL}/community/${postId}/comments`, {
        user_id: user?.id,
        nickname,
        content: newComment,
        is_anonymous: isAnonymous
      });
      setNewComment("");
      fetchComments();
    } catch (err) {
      alert("댓글 작성 실패");
    }
  };

  const handleDelete = async (commentId) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/community/comments/${commentId}`, {
        data: { user_id: user?.id, email: user?.email }
      });
      fetchComments();
    } catch (err) {
      alert("삭제 권한이 없습니다.");
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm font-medium text-foreground/60 hover:text-foreground flex items-center gap-2"
      >
        💬 댓글 {comments.length > 0 && `(${comments.length})`}
        <span className="text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {loading ? (
            <div className="text-center text-foreground/40 text-sm py-2">로딩 중...</div>
          ) : (
            <>
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2 text-sm">
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs overflow-hidden border border-border">
                    {comment.is_anonymous ? '🥸' : (
                      comment.avatar_url ? (
                        <img src={comment.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : '😊'
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground/80">{comment.nickname}</span>
                      <span className="text-xs text-foreground/40">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                      {user && (user.id === comment.user_id || user.email === ADMIN_EMAIL) && (
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="text-xs text-foreground/30 hover:text-red-500"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                    <p className="text-foreground/70 mt-0.5">{comment.content}</p>
                  </div>
                </div>
              ))}

              {user && (
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="댓글을 입력하세요..."
                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:border-primary text-foreground"
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  />
                  <label className="flex items-center gap-1 text-xs text-foreground/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="w-3 h-3"
                    />
                    익명
                  </label>
                  <button
                    onClick={handleSubmit}
                    className="px-3 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary/90"
                  >
                    등록
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// 메인 content에서 tripgen 링크 추출 (www 포함)
function extractTripLinks(content) {
  const regex = /https?:\/\/(?:www\.)?tripgen\.app\/share\/([a-zA-Z0-9-]+)/g;
  const matches = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

// 텍스트에서 링크 제거 (www 포함)
function removeLinks(text) {
  return text.replace(/https?:\/\/(?:www\.)?tripgen\.app\/share\/[^\s]+/g, '').trim();
}

export default function CommunityPage() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("latest");
  const [period, setPeriod] = useState("all");

  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        fetchPosts(session.user.id);
      } else {
        fetchPosts();
      }
    };
    init();
  }, []);

  const fetchPosts = async (userId = null) => {
    try {
      const params = new URLSearchParams();
      if (sort === 'popular') params.append('sort', 'popular');
      if (period !== 'all') params.append('period', period);
      const effectiveUserId = userId || user?.id;
      if (effectiveUserId) params.append('user_id', effectiveUserId);

      const res = await axios.get(`${API_BASE_URL}/community?${params.toString()}`);
      setPosts(res.data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!loading) fetchPosts();
  }, [sort, period, user?.id]);

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

  const handleLike = async (postId) => {
    if (!user) {
      if (confirm("로그인이 필요합니다. 로그인 하시겠습니까?")) router.push('/login');
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/community/${postId}/like`, { user_id: user.id });
      fetchPosts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors">
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

        {/* 정렬 & 필터 */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex bg-secondary rounded-lg p-1">
            <button
              onClick={() => setSort("latest")}
              className={`px-3 py-1.5 text-sm font-bold rounded-md transition ${sort === "latest" ? "bg-card text-foreground shadow-sm" : "text-foreground/60"}`}
            >
              🕐 최신순
            </button>
            <button
              onClick={() => setSort("popular")}
              className={`px-3 py-1.5 text-sm font-bold rounded-md transition ${sort === "popular" ? "bg-card text-foreground shadow-sm" : "text-foreground/60"}`}
            >
              🔥 인기순
            </button>
          </div>
          <div className="flex bg-secondary rounded-lg p-1">
            {[
              { key: "all", label: "전체" },
              { key: "day", label: "오늘" },
              { key: "week", label: "이번주" },
              { key: "month", label: "이번달" }
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 text-sm font-bold rounded-md transition ${period === p.key ? "bg-card text-foreground shadow-sm" : "text-foreground/60"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {isWriting && (
          <div className="bg-card p-6 rounded-2xl border border-border shadow-xl mb-12 animate-fade-in-up relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="여행 이야기를 들려주세요... (tripgen.app/share/... 링크를 붙여넣으면 카드로 표시됩니다)"
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
            <div className="text-center bg-secondary/30 rounded-3xl p-16 border-2 border-dashed border-border">
              <p className="text-5xl mb-4 opacity-30">📝</p>
              <p className="text-foreground/60 font-bold">아직 공유된 이야기가 없습니다.</p>
              <p className="text-sm text-foreground/40 mt-1">첫 번째 여행 이야기를 들려주세요!</p>
            </div>
          ) : (
            posts.map((post) => {
              const tripLinks = extractTripLinks(post.content);
              const textContent = removeLinks(post.content);

              return (
                <div key={post.id} className="bg-card p-6 md:p-8 rounded-3xl border border-border shadow-sm hover:shadow-xl transition duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border overflow-hidden ${post.is_anonymous ? 'bg-secondary border-border' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/30'}`}>
                        {post.is_anonymous ? '🥸' : (
                          post.avatar_url ? (
                            <img src={post.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : '😎'
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-foreground">{post.is_anonymous ? '익명 여행자' : post.nickname}</p>
                          {user && user.id === post.user_id && <span className="text-[10px] font-extrabold text-primary bg-rose-50 dark:bg-rose-900/30 px-1.5 rounded">ME</span>}
                        </div>
                        <p className="text-xs text-foreground/40 font-medium mt-0.5">{new Date(post.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {user && (user.id === post.user_id || user.email === ADMIN_EMAIL) && (
                      <button onClick={() => handleDelete(post.id)} className="text-xs font-bold text-foreground/30 hover:text-red-500 px-2 py-1 transition">삭제</button>
                    )}
                  </div>

                  {/* 텍스트 내용 */}
                  {textContent && (
                    <div className="pl-[52px] mb-3">
                      <p className="text-foreground/80 text-base leading-relaxed whitespace-pre-wrap">{textContent}</p>
                    </div>
                  )}

                  {/* 여행 일정 카드 */}
                  {tripLinks.length > 0 && (
                    <div className="pl-[52px]">
                      {tripLinks.map((tripId) => (
                        <TripLinkCard key={tripId} tripId={tripId} />
                      ))}
                    </div>
                  )}

                  {/* 좋아요 버튼 */}
                  <div className="pl-[52px] mt-4 flex items-center gap-4">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1.5 text-sm font-medium transition ${post.user_liked ? 'text-rose-500' : 'text-foreground/50 hover:text-rose-500'}`}
                    >
                      <span className="text-lg">{post.user_liked ? '❤️' : '🤍'}</span>
                      <span>{post.likes_count || 0}</span>
                    </button>
                  </div>

                  {/* 댓글 섹션 */}
                  <div className="pl-[52px]">
                    <CommentSection postId={post.id} user={user} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}