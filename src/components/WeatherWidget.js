"use client";
import { useState, useEffect } from "react";
import axios from "axios";

export default function WeatherWidget({ destination }) {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!destination) return;

        const fetchWeather = async () => {
            setLoading(true);
            setError(null);
            try {
                // 1. Geocoding to get coordinates
                const geoRes = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=ko&format=json`);

                if (!geoRes.data.results || geoRes.data.results.length === 0) {
                    throw new Error("Location not found");
                }

                const { latitude, longitude, name } = geoRes.data.results[0];

                // 2. Fetch Weather Data
                const weatherRes = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);

                setWeather({
                    temp: weatherRes.data.current.temperature_2m,
                    code: weatherRes.data.current.weather_code,
                    max: weatherRes.data.daily.temperature_2m_max[0],
                    min: weatherRes.data.daily.temperature_2m_min[0],
                    name: name
                });
            } catch (err) {
                console.error("Weather fetch error:", err);
                setError("날씨 정보를 불러올 수 없습니다.");
            } finally {
                setLoading(false);
            }
        };

        // Debounce weather fetch to avoid excessive calls if destination changes rapidly
        const timer = setTimeout(() => {
            fetchWeather();
        }, 1000);

        return () => clearTimeout(timer);
    }, [destination]);

    if (!destination) return null;

    // WMO Weather Codes mapping to emojis
    const getWeatherIcon = (code) => {
        if (code === 0) return "☀️"; // Clear sky
        if (code >= 1 && code <= 3) return "⛅"; // Partly cloudy
        if (code >= 45 && code <= 48) return "🌫️"; // Fog
        if (code >= 51 && code <= 67) return "dg"; // Drizzle/Rain
        if (code >= 71 && code <= 77) return "❄️"; // Snow
        if (code >= 80 && code <= 82) return "🌧️"; // Rain showers
        if (code >= 95 && code <= 99) return "⛈️"; // Thunderstorm
        return "🌡️";
    };

    return (
        <div className="animate-fade-in-up mt-4">
            {loading ? (
                <div className="text-xs text-foreground/40 font-bold animate-pulse">날씨 확인 중...</div>
            ) : error ? (
                <div className="text-xs text-red-400 font-bold">{error}</div>
            ) : weather ? (
                <div className="bg-card/50 border border-border rounded-xl p-4 flex items-center justify-between shadow-sm backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">{getWeatherIcon(weather.code)}</span>
                        <div>
                            <p className="text-xs font-bold text-foreground/60">{weather.name} 현재 날씨</p>
                            <div className="flex items-end gap-1">
                                <span className="text-2xl font-black text-foreground">{weather.temp}°</span>
                                <span className="text-xs font-bold text-foreground/60 mb-1">
                                    (최고 {weather.max}° / 최저 {weather.min}°)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
