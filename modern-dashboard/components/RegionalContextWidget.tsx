"use client";

import React, { useState, useEffect } from 'react';

export default function RegionalContextWidget() {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Using Bareilly coordinates from your map (25.4358, 81.8463)
  const API_KEY = "4a0dbc8c837d0d8d04c943f79a8954dc";
  const LAT = 25.4358;
  const LON = 81.8463;

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=metric&appid=${API_KEY}`);
        const data = await res.json();
        setWeatherData(data);
        setLoading(false);
      } catch (err) {
        console.error("Weather fetch failed", err);
        setLoading(false);
      }
    };
    fetchWeather();
  }, []);

  return (
    <div className="bg-[#121212]/80 backdrop-blur-md p-5 rounded-2xl border border-gray-800 w-full h-full flex flex-col justify-between">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <span className="text-orange-500">🗺️</span> Regional Context
        </h3>
        <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded border border-blue-800">OpenWeather</span>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm animate-pulse text-center my-auto">Syncing Orbital Weather...</p>
      ) : weatherData ? (
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <h1 className="text-4xl text-white font-bold">{Math.round(weatherData.main.temp)}°C</h1>
            <p className="text-gray-400 mb-1 capitalize">{weatherData.weather[0].description}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-gray-900 p-2 rounded-xl">
              <p className="text-gray-500 text-xs">Humidity</p>
              <p className="text-white font-bold">{weatherData.main.humidity}%</p>
            </div>
            <div className="bg-gray-900 p-2 rounded-xl">
              <p className="text-gray-500 text-xs">Wind</p>
              <p className="text-white font-bold">{weatherData.wind.speed} m/s</p>
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-gray-800">
             <p className="text-gray-500 text-xs mb-1">Regional ET Adjustment</p>
             {/* Simple ET calculation placeholder based on temp */}
             <p className="text-blue-400 font-bold">
               {((weatherData.main.temp * 0.15) + 1.2).toFixed(2)} mm/day
             </p>
          </div>
        </div>
      ) : (
        <p className="text-red-500 text-sm">Offline: Failed to sync.</p>
      )}
    </div>
  );
}
