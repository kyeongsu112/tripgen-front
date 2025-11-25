"use client";
import { useState, useEffect } from 'react';

export default function Calendar({ startDate, endDate, onChange }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 월 변경 핸들러
    const handlePrevMonth = (e) => {
        e.preventDefault(); // 폼 제출 방지
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = (e) => {
        e.preventDefault(); // 폼 제출 방지
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // 날짜 클릭 핸들러
    const handleDateClick = (date) => {
        if (date < today) return; // 과거 날짜 클릭 방지

        const dateString = formatDate(date);

        if (!startDate || (startDate && endDate)) {
            // 새로운 시작일 설정 (이전 선택 초기화)
            onChange(dateString, "");
        } else {
            // 종료일 설정
            if (new Date(date) < new Date(startDate)) {
                // 종료일이 시작일보다 앞서면 스왑
                onChange(dateString, startDate);
            } else {
                onChange(startDate, dateString);
            }
        }
    };

    // 날짜 포맷팅 (YYYY-MM-DD)
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // 달력 데이터 생성
    const getDaysInMonth = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const days = [];

        // 시작 요일 공백 채우기
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(null);
        }

        // 날짜 채우기
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    };

    const days = getDaysInMonth();
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

    // 날짜 스타일 결정
    const getDateStyle = (date) => {
        if (!date) return "invisible";

        date.setHours(0, 0, 0, 0);
        const dateStr = formatDate(date);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(0, 0, 0, 0);

        // 과거 날짜
        if (date < today) return "text-gray-300 cursor-not-allowed";

        // 선택된 시작일
        if (start && date.getTime() === start.getTime()) {
            return `bg-rose-500 text-white font-bold ${end ? 'rounded-l-full' : 'rounded-full'} z-10 relative`;
        }

        // 선택된 종료일
        if (end && date.getTime() === end.getTime()) {
            return "bg-rose-500 text-white font-bold rounded-r-full z-10 relative";
        }

        // 범위 내 날짜
        if (start && end && date > start && date < end) {
            return "bg-rose-100 text-rose-700 font-bold";
        }

        // 오늘 날짜 (선택 안됨)
        if (date.getTime() === today.getTime()) {
            return "text-rose-500 font-bold bg-rose-50 rounded-full";
        }

        return "text-foreground hover:bg-secondary rounded-full transition-colors font-medium";
    };

    return (
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border w-full max-w-sm mx-auto select-none">
            {/* 헤더 */}
            <div className="flex justify-between items-center mb-6 px-2">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-secondary rounded-full text-foreground/60 hover:text-foreground transition">
                    «
                </button>
                <h3 className="text-lg font-bold text-foreground">
                    {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                </h3>
                <button onClick={handleNextMonth} className="p-2 hover:bg-secondary rounded-full text-foreground/60 hover:text-foreground transition">
                    »
                </button>
            </div>

            {/* 요일 */}
            <div className="grid grid-cols-7 mb-2">
                {weekDays.map(day => (
                    <div key={day} className="text-center text-xs font-bold text-foreground/40 py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-y-2">
                {days.map((date, idx) => (
                    <div key={idx} className="relative aspect-square flex items-center justify-center">
                        {/* 범위 배경 연결 효과 (시작/종료일 사이) */}
                        {date && startDate && endDate &&
                            date >= new Date(startDate) && date <= new Date(endDate) && (
                                <div className={`absolute inset-y-0 w-full bg-rose-100 
                                ${date.getTime() === new Date(startDate).getTime() ? 'left-1/2 w-1/2 rounded-l-full' : ''}
                                ${date.getTime() === new Date(endDate).getTime() ? 'right-1/2 w-1/2 rounded-r-full' : ''}
                                ${date > new Date(startDate) && date < new Date(endDate) ? 'left-0 w-full' : ''}
                            `}></div>
                            )}

                        <button
                            onClick={(e) => { e.preventDefault(); date && handleDateClick(date); }}
                            disabled={!date || date < today}
                            className={`w-10 h-10 flex items-center justify-center text-sm relative z-10 transition-all ${getDateStyle(date)}`}
                        >
                            {date ? date.getDate() : ''}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
