"use client";

import React, { useState, useEffect } from 'react';

export default function WeatherAnalytics() {
  // Defaulting to the primary operational zone for your deployment
  const [location, setLocation] = useState("Bareilly"); 
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  // REAL OPENWEATHER API KEY
  const API_KEY = "4a0dbc8c837d0d8d04c943f79a8954dc";

  useEffect(() => {
    setIsClient(true);
  }, []);

  const currentDate = isClient ? new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '';

  // 1. SEARCH & FETCH: OpenWeatherMap Geocoding + Weather
  const fetchWeatherForLand = async (searchCity: string) => {
    setLoading(true);
    setError(null);
    try {
      // Step A: Geocoding API (City to Lat/Lon)
      const geoRes = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${searchCity}&limit=1&appid=${API_KEY}`);
      const geoData = await geoRes.json();
      
      if (!geoData || geoData.length === 0) {
        throw new Error("Location not found. Please check the city name.");
      }

      const lat = geoData[0].lat;
      const lon = geoData[0].lon;
      const resolvedCity = geoData[0].name;

      // Step B: Current Weather API (Metric Units for °C)
      const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
      const currentData = await weatherRes.json();

      // Step C: 5-Day Forecast API (Metric Units)
      const forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
      const forecastData = await forecastRes.json();

      // Extracting a daily summary (OpenWeather returns 3-hour intervals, we pick one per day)
      const dailyForecast = forecastData.list.filter((reading: any) => reading.dt_txt.includes("12:00:00"));

      setWeatherData({
        city: resolvedCity,
        lat: lat.toFixed(4),
        lon: lon.toFixed(4),
        current: currentData,
        forecast: dailyForecast
      });
    } catch (err: any) {
      console.error("Orbital Sync Error:", err);
      setError(err.message);
    }
    setLoading(false);
  };

  // Initial load
  useEffect(() => {
    fetchWeatherForLand(location);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. PDF GENERATION: Snapshot the Analytics
  const generatePDFReport = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const element = document.getElementById('analytics-report-area');
    if (!element) return;
    
    const opt: any = {
      margin:       0.5,
      filename:     `Agri_Report_${weatherData?.city}_${new Date().getTime()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      // Explicitly typed 'as const' to resolve TypeScript mismatches during Render production builds
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' as const } 
    };
    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="weather-dashboard bg-[#121212] p-6 rounded-xl border border-[#00f2ff] text-white my-6 mx-auto w-full max-w-6xl">
      {/* Search Bar for Any Land */}
      <div className="flex gap-4 mb-6">
        <input 
          type="text" 
          placeholder="Search land/city (e.g., Pune, Delhi)..." 
          className="p-3 rounded bg-gray-900 text-white w-full border border-[#00f2ff] focus:outline-none focus:ring-2 focus:ring-cyan-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setLocation((e.target as HTMLInputElement).value);
              fetchWeatherForLand((e.target as HTMLInputElement).value);
            }
          }}
        />
        <button 
          onClick={generatePDFReport}
          className="bg-[#00f2ff] text-black px-6 py-2 rounded font-bold hover:bg-cyan-400 transition whitespace-nowrap"
        >
          📄 GENERATE PDF
        </button>  
      </div>

      {error && <p className="text-red-500 mb-4 font-bold">❌ {error}</p>}

      {/* Area to be captured in the PDF */}
      <div id="analytics-report-area" className="p-6 bg-[#0a0a0a] rounded border border-gray-800">
        {loading ? (
          <p className="text-[#00f2ff] animate-pulse font-mono">📡 Syncing Live Orbital Weather via OpenWeatherMap...</p>
        ) : weatherData && (
          <>
            <div className="header border-b border-gray-800 pb-4 mb-6 flex justify-between items-end flex-wrap gap-4">
              <div>
                <h2 className="text-3xl font-bold text-white tracking-wide">Zone: {weatherData.city}</h2>
                <p className="text-gray-400 font-mono text-sm mt-1">LAT: {weatherData.lat} | LON: {weatherData.lon}</p>
              </div>
              <div className="text-right">
                <p className="text-[#00f2ff] font-mono">{currentDate}</p>
                <p className="text-gray-500 text-xs">Source: OpenWeather API</p>
              </div>
            </div>

            {/* Current Conditions */}
            <h4 className="text-gray-400 uppercase tracking-widest text-xs mb-3">Live Telemetry (Pre-Cultivation)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="metric-box bg-gray-900 p-4 rounded border-l-4 border-orange-500">
                <p className="text-gray-500 text-sm">Temperature</p>
                <h3 className="text-3xl font-bold">{weatherData.current.main.temp}°C</h3>
                <p className="text-xs text-gray-400 mt-1">Feels like: {weatherData.current.main.feels_like}°C</p>
              </div>
              <div className="metric-box bg-gray-900 p-4 rounded border-l-4 border-blue-500">
                <p className="text-gray-500 text-sm">Humidity</p>
                <h3 className="text-3xl font-bold">{weatherData.current.main.humidity}%</h3>
              </div>
              <div className="metric-box bg-gray-900 p-4 rounded border-l-4 border-cyan-400">
                <p className="text-gray-500 text-sm">Atmospheric Condition</p>
                <h3 className="text-xl font-bold capitalize mt-1">{weatherData.current.weather[0].description}</h3>
              </div>
              <div className="metric-box bg-gray-900 p-4 rounded border-l-4 border-gray-400">
                <p className="text-gray-500 text-sm">Wind Speed</p>
                <h3 className="text-3xl font-bold">{weatherData.current.wind.speed} <span className="text-lg">m/s</span></h3>
              </div>
            </div>

            {/* Cultivation Forecast */}
            <h4 className="text-gray-400 uppercase tracking-widest text-xs mb-3">5-Day Trajectory (Post-Cultivation)</h4>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {weatherData.forecast.map((day: any, index: number) => {
                const dateObj = new Date(day.dt * 1000);
                const dayName = dateObj.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
                
                return (
                  <div key={index} className="bg-gray-900 p-4 rounded border border-gray-800 text-center">
                    <p className="text-[#00f2ff] font-bold text-sm mb-2">{dayName}</p>
                    <img 
                      src={`https://openweathermap.org/img/wn/${day.weather[0].icon}.png`} 
                      alt="weather icon" 
                      className="mx-auto w-12 h-12"
                    />
                    <p className="text-xl font-bold text-white">{Math.round(day.main.temp)}°C</p>
                    <p className="text-xs text-gray-400 capitalize mt-1">{day.weather[0].main}</p>
                    <p className="text-xs text-blue-400 mt-1">Rain: {day.pop > 0 ? (day.pop * 100).toFixed(0) : 0}%</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
