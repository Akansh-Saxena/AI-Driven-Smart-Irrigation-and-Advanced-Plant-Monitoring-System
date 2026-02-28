"use client";

import { useEffect, useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { HistoricalChart } from "@/components/HistoricalChart";
import { Droplet, Thermometer, Wind, Activity, BrainCircuit, Droplets } from "lucide-react";
import { motion } from "framer-motion";

interface TelemetryData {
  timestamp: string;
  node_id: string;
  soil_moisture: {
    raw_voltage: number;
    kalman_filtered_v: number;
    percentage: number;
  };
  atmosphere: {
    temperature_c: number;
    humidity_pct: number;
  };
  actuators: {
    pump_relay_active: boolean;
    flow_pulses_counted: number;
  };
  tinyml_predictions: {
    et_forecast_mm_day: number;
    wilting_probability_24h: number;
  };
}

export default function Home() {
  const [history, setHistory] = useState<TelemetryData[] | null>(null);
  const [isForcingPump, setIsForcingPump] = useState(false);

  useEffect(() => {
    // Poll the Next.js API every 2 seconds to fetch the latest MongoDB Array
    const fetchTelemetry = async () => {
      try {
        const res = await fetch("/api/telemetry");
        const json = await res.json();
        setHistory(json);
      } catch (err) {
        console.error("Failed to fetch telemetry", err);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!history || !Array.isArray(history) || history.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white font-sans text-center">
        <div className="animate-pulse flex flex-col items-center max-w-md">
          <BrainCircuit className="w-12 h-12 text-blue-500 mb-4 animate-bounce" />
          <h2 className="text-xl font-semibold">Initializing Cyber-Physical Link...</h2>
          {history && !Array.isArray(history) && (
            <p className="text-red-400 mt-4 text-sm font-mono border border-red-500/30 bg-red-500/10 p-4 rounded-lg">
              Database Connection Error: Waiting for Render MONGODB_URI Environment Variable to finish deploying...
            </p>
          )}
        </div>
      </div>
    );
  }

  const handleForceIrrigation = () => {
    setIsForcingPump(true);
    // In a real app, POST to /api/control here
    setTimeout(() => setIsForcingPump(false), 3000);
  };

  const data = history[0]; // Extract the absolute latest reading for the top dashboard cards

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-blue-500/30">

      {/* Dynamic Background Glows based on state */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 transition-colors duration-1000 ${data.tinyml_predictions.wilting_probability_24h > 50 ? 'bg-red-500' : 'bg-blue-500'}`} />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px] mix-blend-screen" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">

        {/* Header Region */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 border-b border-white/10 pb-6 gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 tracking-tight">
              Aero-Agri Command Center
            </h1>
            <p className="text-zinc-400 mt-2 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              Node Link Active: <span className="font-mono text-zinc-300">{data.node_id}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-zinc-500 font-mono">{new Date(data.timestamp).toLocaleString()}</p>
          </div>
        </header>

        {/* Real-time Telemetry Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Soil Moisture"
            value={data.soil_moisture.percentage.toFixed(1)}
            unit="%"
            icon={Droplet}
            colorClass="text-blue-400"
          />
          <MetricCard
            title="Atmosphere Temp"
            value={data.atmosphere.temperature_c.toFixed(1)}
            unit="°C"
            icon={Thermometer}
            colorClass="text-orange-400"
          />
          <MetricCard
            title="Relative Humidity"
            value={data.atmosphere.humidity_pct.toFixed(1)}
            unit="%"
            icon={Wind}
            colorClass="text-teal-400"
          />
          <MetricCard
            title="Flow Rate (Pulses)"
            value={data.actuators.flow_pulses_counted}
            icon={Activity}
            colorClass="text-emerald-400"
          />
        </div>

        {/* AI & Actuation Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Neural Network Forecast Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`col-span-1 lg:col-span-2 rounded-2xl p-8 border backdrop-blur-md relative overflow-hidden
              ${data.tinyml_predictions.wilting_probability_24h > 50
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-indigo-500/10 border-indigo-500/20'}`}
          >
            <div className="flex items-center gap-3 mb-6">
              <BrainCircuit className={data.tinyml_predictions.wilting_probability_24h > 50 ? 'text-red-400' : 'text-indigo-400'} />
              <h2 className="text-2xl font-semibold">Edge AI (TinyML) Forecast</h2>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1">
                <p className="text-zinc-400 mb-2">24-Hour Wilting Probability</p>
                <div className="flex items-end gap-2">
                  <span className={`text-6xl font-black ${data.tinyml_predictions.wilting_probability_24h > 50 ? 'text-red-400' : 'text-indigo-400'}`}>
                    {data.tinyml_predictions.wilting_probability_24h.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-black/40 h-3 rounded-full mt-4 overflow-hidden relative">
                  <motion.div
                    className={`absolute top-0 left-0 h-full rounded-full ${data.tinyml_predictions.wilting_probability_24h > 50 ? 'bg-red-500' : 'bg-indigo-500'}`}
                    animate={{ width: `${data.tinyml_predictions.wilting_probability_24h}%` }}
                    transition={{ type: "spring", stiffness: 50 }}
                  />
                </div>
              </div>

              <div className="flex-1 bg-black/20 rounded-xl p-4 border border-white/5">
                <p className="text-sm text-zinc-400 mb-2">Evapotranspiration (ET) Target</p>
                <p className="text-3xl font-bold text-white mb-1">{data.tinyml_predictions.et_forecast_mm_day.toFixed(2)} mm/day</p>
                <p className="text-xs text-zinc-500">Calculated via OpenWeatherMap API & Local Sensors</p>
              </div>
            </div>
          </motion.div>

          {/* Manual Control Center */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="col-span-1 rounded-2xl bg-zinc-900/80 border border-white/10 p-8 flex flex-col justify-between relative overflow-hidden"
          >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />

            <div>
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <Droplets className="text-blue-400" />
                Network Actuation
              </h2>
              <p className="text-sm text-zinc-400 mb-6">Bypass TinyML forecasting and force water delivery mechanisms.</p>

              <div className="mb-6 p-4 rounded-xl bg-black/50 border border-white/5 flex items-center justify-between">
                <span className="text-zinc-300">Pump Solenoid</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${data.actuators.pump_relay_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-500'}`}>
                  {data.actuators.pump_relay_active ? 'Active Flow' : 'Standby'}
                </span>
              </div>
            </div>

            <button
              onClick={handleForceIrrigation}
              disabled={isForcingPump}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all active:scale-95 shadow-lg relative overflow-hidden group
                ${isForcingPump || data.actuators.pump_relay_active
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
                  : 'bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white shadow-blue-500/20 hover:shadow-emerald-500/40 border border-white/10'}`}
            >
              {/* Button shine effect */}
              {!(isForcingPump || data.actuators.pump_relay_active) && (
                <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
              )}
              {isForcingPump ? 'Transmitting Command...' : (data.actuators.pump_relay_active ? 'Irrigation in Progress' : 'Force Irrigation Cycle')}
            </button>
          </motion.div>

        </div>

        {/* Database Historical Chart */}
        <HistoricalChart data={history} />

      </main>

      {/* Basic shine animation keyframe added to global styles implicitly via inline class if needed, or tailwind config */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes shine {
          100% { left: 125%; }
        }
        .animate-shine { animation: shine 1.5s infinite; }
      `}} />
    </div>
  );
}
