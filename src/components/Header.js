"use client";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";

export default function Header({ user, onLogoClick, activeTab, showUserControls = true }) {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();

    const handleLogoClick = () => {
        if (onLogoClick) {
            onLogoClick();
        } else {
            router.push('/');
        }
    };

    const handleNav = (path) => {
        if (path === '/?view=mytrip' && !user) {
            alert("로그인이 필요한 서비스입니다.");
            return;
        }
        router.push(path);
    };

    return (
        <nav className="sticky top-0 z-50 bg-navbar/80 backdrop-blur-md border-b border-navbar-border h-16 md:h-20 flex items-center transition-colors">
            <div className="max-w-7xl mx-auto px-4 md:px-6 w-full flex justify-between items-center">
                <div className="flex items-center gap-4 md:gap-8">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={handleLogoClick}>
                        <span className="text-2xl md:text-3xl text-rose-500">✈️</span>
                        <span className="text-lg md:text-xl font-extrabold tracking-tight text-rose-500">TripGen</span>
                    </div>

                    {/* 데스크톱 메뉴 */}
                    <div className="hidden md:flex items-center gap-4">
                        {/* 그룹 1: 일정 */}
                        <div className="flex gap-1 bg-background/60 p-1.5 rounded-full border border-border">
                            <button onClick={() => router.push('/?view=home')} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "home" ? "bg-card text-primary shadow-sm" : "text-foreground/50 hover:text-foreground"}`}>일정 생성</button>
                            <button onClick={() => handleNav('/?view=mytrip')} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "mytrip" ? "bg-card text-primary shadow-sm" : "text-foreground/50 hover:text-foreground"}`}>보관함</button>
                        </div>
                        {/* 그룹 2: 커뮤니티 */}
                        <div className="flex gap-1 bg-background/60 p-1.5 rounded-full border border-border">
                            <button onClick={() => router.push('/community')} className="px-5 py-2 rounded-full text-sm font-bold text-foreground/60 hover:text-foreground hover:bg-card transition-all">공유게시판</button>
                            <button onClick={() => router.push('/board')} className="px-5 py-2 rounded-full text-sm font-bold text-foreground/60 hover:text-foreground hover:bg-card transition-all">건의함</button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* ✨ 다크모드 토글 버튼 */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full bg-secondary text-foreground/70 hover:bg-border transition"
                        title="테마 변경"
                    >
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>

                    {/* 모바일 메뉴 */}
                    <div className="flex md:hidden gap-1 mr-1">
                        <button onClick={() => router.push('/?view=home')} className={`text-xs font-bold px-2 py-1.5 rounded-lg ${activeTab === "home" ? "bg-primary text-white" : "bg-secondary text-foreground/70"}`}>생성</button>
                        <button onClick={() => handleNav('/?view=mytrip')} className={`text-xs font-bold px-2 py-1.5 rounded-lg ${activeTab === "mytrip" ? "bg-primary text-white" : "bg-secondary text-foreground/70"}`}>보관</button>
                        <button onClick={() => router.push('/community')} className="text-xs font-bold px-2 py-1.5 rounded-lg bg-secondary text-foreground/70">공유</button>
                        <button onClick={() => router.push('/board')} className="text-xs font-bold px-2 py-1.5 rounded-lg bg-secondary text-foreground/70">건의</button>
                    </div>

                    {showUserControls && (
                        user ? (
                            <div className="flex items-center gap-2 md:gap-3">
                                <button onClick={() => router.push('/mypage')} className="flex items-center gap-2 bg-card border border-border rounded-full pl-2 pr-1 py-1 hover:shadow-md transition duration-200">
                                    <span className="text-xs font-bold text-foreground/80 ml-1 hidden sm:inline">MY</span>
                                    <div className="w-7 h-7 bg-primary rounded-full text-white flex items-center justify-center text-[10px]">👤</div>
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => router.push('/login')} className="text-sm font-bold text-foreground/80 hover:text-rose-500 transition px-2">로그인</button>
                        )
                    )}
                </div>
            </div>
        </nav>
    );
}
