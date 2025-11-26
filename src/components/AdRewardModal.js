"use client";
import { useState, useEffect } from 'react';

export default function AdRewardModal({ isOpen, onClose, onSuccess, userId }) {
    const [adWatched, setAdWatched] = useState(false);
    const [timer, setTimer] = useState(30);

    useEffect(() => {
        if (!isOpen) {
            setAdWatched(false);
            setTimer(30);
            return;
        }

        // 30초 타이머
        const interval = setInterval(() => {
            setTimer((prev) => {
                if (prev <= 1) {
                    setAdWatched(true);
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isOpen]);

    const handleClaim = async () => {
        try {
            const res = await fetch('/api/redeem-ad-credit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId })
            });

            const data = await res.json();

            if (res.ok) {
                alert(`✅ 광고 크레딧을 획득했습니다! (보유: ${data.credits}개, 오늘 남은 횟수: ${data.dailyRemaining}회)`);
                onSuccess();
                onClose();
            } else {
                alert(data.error || '크레딧 획득 실패');
            }
        } catch (err) {
            console.error(err);
            alert('크레딧 획득 실패');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border-2 border-rose-500/20 p-6 sm:p-8 rounded-2xl max-w-md w-full shadow-2xl">
                <h2 className="text-2xl font-bold mb-4 text-center">🎁 광고 시청으로 1회 추가!</h2>
                <p className="text-sm text-center text-foreground/60 mb-4">
                    광고를 30초 시청하면 1회 추가 생성권을 받을 수 있습니다
                </p>

                {/* AdSense 광고 영역 */}
                <div className="bg-gradient-to-br from-rose-500/10 to-purple-500/10 h-64 rounded-xl mb-4 flex flex-col items-center justify-center border-2 border-dashed border-foreground/20">
                    <div className="text-6xl mb-4">📺</div>
                    <p className="text-foreground/60 text-sm">광고 영역</p>
                    <p className="text-foreground/40 text-xs mt-2">AdSense 승인 후 광고가 표시됩니다</p>
                    {/* 
          <ins className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-XXXXXXX"
            data-ad-slot="XXXXXXX"
            data-ad-format="auto"></ins>
          */}
                </div>

                {adWatched ? (
                    <button
                        onClick={handleClaim}
                        className="w-full bg-gradient-to-r from-rose-500 to-purple-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition shadow-lg"
                    >
                        ✅ 크레딧 받기
                    </button>
                ) : (
                    <div className="text-center py-3 text-foreground/60 bg-secondary rounded-xl">
                        ⏱️ {timer}초 후 크레딧을 받을 수 있습니다...
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="w-full mt-3 text-sm text-foreground/40 hover:text-foreground/60 transition py-2"
                >
                    닫기
                </button>
            </div>
        </div>
    );
}
