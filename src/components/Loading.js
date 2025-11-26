"use client";
import React from 'react';

const Loading = () => {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative w-24 h-24 mb-4">
                {/* Plane Icon */}
                <div className="absolute inset-0 animate-fly-plane text-primary">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-16 h-16 transform rotate-45"
                    >
                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                </div>
                {/* Cloud 1 */}
                <div className="absolute top-1/2 left-0 w-8 h-8 text-white/50 animate-cloud-drift-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                        <path fillRule="evenodd" d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.25-10.5z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>
            <h2 className="text-xl font-bold text-foreground animate-pulse">
                Preparing your journey...
            </h2>
            <style jsx>{`
        @keyframes fly-plane {
          0% { transform: translate(-20px, 20px) rotate(0deg); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translate(20px, -20px) rotate(0deg); opacity: 0; }
        }
        .animate-fly-plane {
          animation: fly-plane 2s infinite ease-in-out;
        }
        @keyframes cloud-drift-1 {
            0% { transform: translateX(20px); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateX(-20px); opacity: 0; }
        }
        .animate-cloud-drift-1 {
            animation: cloud-drift-1 3s infinite linear;
        }
      `}</style>
        </div>
    );
};

export default Loading;
