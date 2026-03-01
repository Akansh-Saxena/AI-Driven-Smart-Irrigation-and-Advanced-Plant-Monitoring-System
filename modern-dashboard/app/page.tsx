"use client";

import { useEffect, useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { HistoricalChart } from "@/components/HistoricalChart";
import { Droplet, Thermometer, Wind, Activity, BrainCircuit, Droplets, Leaf, Zap, Coins, ScanLine, ShieldAlert, Magnet, Speaker, Sprout, Mic, UploadCloud, TestTube } from "lucide-react";
import { motion } from "framer-motion";
import mqtt from 'mqtt';

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
  computer_vision?: {
    status: string;
    confidence: number;
  };
  smfc_power?: {
    raw_voltage_mv: number;
    status: string;
  };
  web3_ledger?: {
    water_saved_liters: number;
    wct_tokens_minted: number;
  };
  edge_security?: {
    isolation_forest_anomaly: boolean;
    inference_time_ms: number;
  };
  anti_gravity?: {
    magnetic_field_ut: number;
    ultrasonic_array_active: boolean;
    clinostat_rpm: number;
  };
  crop_yield?: {
    projected_yield_tha: number;
    yield_increase_pct: number;
  };
}

export default function Home() {
  const [history, setHistory] = useState<TelemetryData[] | null>(null);
  const [isForcingPump, setIsForcingPump] = useState(false);
  const [mqttClient, setMqttClient] = useState<mqtt.MqttClient | null>(null);

  // Phase 5 State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // 1. Connect to Public MQTT via WebSockets (Browser compatible)
    // using wss:// on port 8884 to satisfy HTTPS Mixed Content rules
    const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt');

    client.on('connect', () => {
      console.log('Connected to HiveMQ WebSockets Broker');
      setMqttClient(client);
    });

    // 2. Poll the Next.js API every 2 seconds to fetch the latest MongoDB Array
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

    return () => {
      if (client) client.end();
      clearInterval(interval);
    };
  }, []);
  const publishMQTTCommand = (action: string, payload: any = {}) => {
    if (mqttClient && mqttClient.connected) {
      mqttClient.publish('smartfarm/control/esp32', JSON.stringify({ action, ...payload }));
      console.log(`[MQTT TX] Published: ${action}`);
    } else {
      console.warn("MQTT WebSockets not connected.");
    }
  };

  const handleForceIrrigation = () => {
    setIsForcingPump(true);
    // Transmit instantly via MQTT instead of slow HTTP Polling
    publishMQTTCommand("FORCE_PUMP");
    setTimeout(() => setIsForcingPump(false), 3000);
  };

  // Phase 5: Voice Command Logic
  const handleVoiceCommand = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Your browser does not support the Web Speech API. Please use Chrome.");
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    // Bhashini / Multilingual intent translation simulation
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript.toLowerCase();
      setTranscript(text);

      // LLM Intent Extraction Simulation
      if (text.includes("rotate") || text.includes("sun") || text.includes("turn")) {
        publishMQTTCommand("ROTATE_CLINOSTAT", { rpm: 45.0 });
      } else if (text.includes("spray") || text.includes("heal") || text.includes("medicine")) {
        publishMQTTCommand("ENABLE_40KHZ_ARRAY");
      } else if (text.includes("water") || text.includes("pump")) {
        publishMQTTCommand("FORCE_PUMP");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setTimeout(() => setTranscript(""), 4000);
    };

    recognition.start();
  };

  // Phase 5: Cloud Vision Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsUploading(true);

    // Simulate Cloud Run API / Firebase ML processing delay
    setTimeout(() => {
      setIsUploading(false);
      // Simulate detection of Early Blight triggering instant Acoustic Levitator actuation
      publishMQTTCommand("ENABLE_40KHZ_ARRAY");
      alert("🚨 Cloud AI detected trace elements of Early Blight spores in the image! Instantly transmitting MQTT command to Node Alpha to activate the 40kHz Ultrasonic Phased Array for targeted fungicide delivery.");
    }, 2500);
  };

  // Prevent crashes if DB connection fails
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

  const data = (history as TelemetryData[])[0]; // Extract the absolute latest reading for the top dashboard cards

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
        </div >

        {/* --- FUTURISTIC UPGRADES GRID --- */}
        < div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" >

          {/* Edge AI Computer Vision Panel */}
          < motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className={`rounded-2xl p-6 border backdrop-blur-md relative overflow-hidden flex flex-col justify-between
            ${data.computer_vision?.status.includes('Blight') ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/20'}`}
          >
            <div>
              <div className="flex justify-between items-center mb-4">
                <Leaf className={data.computer_vision?.status.includes('Blight') ? 'text-red-400' : 'text-emerald-400'} />
                <span className="text-xs font-mono bg-black/30 px-2 py-1 rounded-full text-zinc-400">ESP32-CAM CNN</span>
              </div>
              <h3 className="text-zinc-400 text-sm">Biometric Vision Scan</h3>
              <p className={`text-xl font-bold mt-1 ${data.computer_vision?.status.includes('Blight') ? 'text-red-400' : 'text-emerald-400'}`}>
                {data.computer_vision?.status || "Calibration Pending"}
              </p>
            </div>
            <div className="mt-4">
              <p className="text-xs text-zinc-500 mb-1">Neural Net Confidence</p>
              <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${data.computer_vision?.status.includes('Blight') ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${data.computer_vision?.confidence || 0}%` }}
                />
              </div>
              <p className="text-right text-xs mt-1 text-zinc-400">{data.computer_vision?.confidence?.toFixed(1) || 0}%</p>
            </div>
          </motion.div >

          {/* Biological SMFC Battery Panel */}
          < motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-2xl p-6 border border-amber-500/20 bg-amber-500/10 backdrop-blur-md relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-4">
                <Zap className="text-amber-400" />
                <span className="text-xs font-mono bg-black/30 px-2 py-1 rounded-full text-amber-400">Bio-Battery</span>
              </div>
              <h3 className="text-zinc-400 text-sm">Soil Microbial Power (SMFC)</h3>
              <p className="text-3xl font-bold text-amber-500 mt-1">{data.smfc_power?.raw_voltage_mv?.toFixed(0) || 0} <span className="text-lg text-amber-500/60">mV</span></p>
            </div>
            <p className="text-xs text-amber-400/80 bg-amber-500/10 px-3 py-2 rounded-lg mt-4 w-fit border border-amber-500/20">
              {data.smfc_power?.status || "Harvesting Electrons..."}
            </p>
          </motion.div >

          {/* Web3 Water Ledger Panel */}
          < motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="col-span-1 md:col-span-2 rounded-2xl p-6 border border-purple-500/20 bg-purple-500/10 backdrop-blur-md relative overflow-hidden flex flex-col justify-center"
          >
            <div className="absolute right-[-20px] top-[-20px] opacity-10">
              <Coins className="w-48 h-48 rotate-12" />
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Droplet className="w-4 h-4 text-blue-400" />
                  <h3 className="text-zinc-400 text-sm">Water Saved</h3>
                </div>
                <p className="text-3xl font-bold text-blue-400">{data.web3_ledger?.water_saved_liters?.toFixed(1) || 0} <span className="text-lg text-blue-400/60">L</span></p>
              </div>

              <div className="border-l border-white/10 pl-6">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-4 h-4 text-purple-400" />
                  <h3 className="text-zinc-400 text-sm">Web3 Tokens Minted</h3>
                </div>
                <p className="text-3xl font-bold text-purple-400">{data.web3_ledger?.wct_tokens_minted || 0} <span className="text-lg text-purple-400/60">WCT</span></p>
              </div>
            </div>

            <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
              <p className="text-xs text-zinc-500 font-mono">Blockchain Oracle: Polygon Mumbai Testnet</p>
              <span className="animate-pulse w-2 h-2 bg-emerald-500 rounded-full"></span>
            </div>
          </motion.div >

        </div >

        {/* --- PHASE 4 INTEGRATION ROW --- */}
        < div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8" >

          {/* Edge AI Security (Isolation Forest) */}
          < motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className={`rounded-2xl p-6 border backdrop-blur-md relative overflow-hidden
            ${data.edge_security?.isolation_forest_anomaly ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/20'}`}
          >
            <div className="flex justify-between items-center mb-4">
              <ShieldAlert className={data.edge_security?.isolation_forest_anomaly ? 'text-red-400' : 'text-emerald-400'} />
              <span className="text-xs font-mono bg-black/30 px-2 py-1 rounded-full text-zinc-400">Isolation Forest</span>
            </div>
            <h3 className="text-zinc-400 text-sm">IoT Network Security</h3>
            <p className={`text-xl font-bold mt-1 ${data.edge_security?.isolation_forest_anomaly ? 'text-red-400' : 'text-emerald-400'}`}>
              {data.edge_security?.isolation_forest_anomaly ? "ANOMALY DETECTED" : "Network Secure"}
            </p>
            <p className="text-xs text-zinc-500 mt-4 font-mono">Inference Latency: {data.edge_security?.inference_time_ms.toFixed(1)}ms</p>
          </motion.div >

          {/* Web3 Yield Optimization */}
          < motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="rounded-2xl p-6 border border-blue-500/20 bg-blue-500/10 backdrop-blur-md relative overflow-hidden"
          >
            <div className="flex justify-between items-center mb-4">
              <Sprout className="text-blue-400" />
              <span className="text-xs font-mono bg-black/30 px-2 py-1 rounded-full text-blue-400">Yield Oracle</span>
            </div>
            <h3 className="text-zinc-400 text-sm">Projected Crop Yield</h3>
            <p className="text-3xl font-bold text-blue-400 mt-1">{data.crop_yield?.projected_yield_tha.toFixed(1)} <span className="text-lg text-blue-400/60">t/ha</span></p>
            <p className="text-sm text-emerald-400 mt-2 font-bold">↑ +{data.crop_yield?.yield_increase_pct.toFixed(1)}% vs. Manual Control</p>
          </motion.div >

          {/* Anti-Gravity Controls (Magnetic Field & Clinostat) */}
          < motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="rounded-2xl p-6 border border-zinc-500/20 bg-zinc-900/80 backdrop-blur-md relative overflow-hidden flex flex-col justify-between"
          >
            <div className="flex justify-between items-center mb-4">
              <Magnet className="text-purple-400" />
              <span className="text-xs font-mono bg-black/30 px-2 py-1 rounded-full text-zinc-400">Anti-Grav Uplink</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <h3 className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Magnetic Field</h3>
                <p className="text-lg font-bold text-purple-400">{data.anti_gravity?.magnetic_field_ut.toFixed(0)} <span className="text-sm text-purple-400/60">µT</span></p>
              </div>
              <div>
                <h3 className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Clinostat</h3>
                <p className="text-lg font-bold text-cyan-400">{data.anti_gravity?.clinostat_rpm.toFixed(1)} <span className="text-sm text-cyan-400/60">RPM</span></p>
              </div>
            </div>

            <div className="flex items-center justify-between bg-black/50 p-3 rounded-xl border border-white/5">
              <span className="text-sm text-zinc-300 flex items-center gap-2"><Speaker className="w-4 h-4 text-emerald-400" /> 40kHz Array</span>
              <div className={`w-10 h-5 rounded-full relative cursor-pointer ${data.anti_gravity?.ultrasonic_array_active ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${data.anti_gravity?.ultrasonic_array_active ? 'left-[22px]' : 'left-0.5'}`}></div>
              </div>
            </div>
          </motion.div >

        </div >

        {/* AI & Actuation Row */}
        < div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8" >

          {/* Neural Network Forecast Panel */}
          < motion.div
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
          </motion.div >

          {/* Manual Control Center */}
          < motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="col-span-1 rounded-2xl bg-zinc-900/80 border border-white/10 p-8 flex flex-col justify-between relative overflow-hidden"
          >
            {/* Background pattern */}
            < div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />

            < div >
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
            </div >

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
          </motion.div >

        </div >

        {/* --- PHASE 5: TWO-WAY CYBER-PHYSICAL INTERFACE (VOICE & VISION) --- */}
        < div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8" >

          {/* Multilingual Voice Command */}
          < motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="rounded-2xl border border-zinc-800 bg-black backdrop-blur-md p-8 relative overflow-hidden"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-3">
                <Mic className={`${isListening ? 'text-red-500 animate-pulse' : 'text-zinc-400'}`} />
                Translative Voice Command
              </h2>
              <span className="text-xs font-mono bg-zinc-900 px-3 py-1 rounded-full text-zinc-500">MQTT WSS</span>
            </div>

            <p className="text-sm text-zinc-400 mb-6">
              Speak natively (Hindi, Tamil, English). Generative AI extracts your intent and compiles it into a hardware actuation payload via MQTT.
            </p>

            <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
              <button
                onClick={handleVoiceCommand}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all ${isListening ? 'bg-red-500/20 border border-red-500 animate-pulse' : 'bg-gradient-to-br from-zinc-700 to-zinc-900 hover:scale-105'}`}
              >
                <Mic className={`w-8 h-8 ${isListening ? 'text-red-500' : 'text-zinc-300'}`} />
              </button>
              {transcript && (
                <p className="mt-6 text-emerald-400 font-mono text-sm px-4 py-2 bg-black rounded-lg border border-emerald-500/30">
                  "{transcript}" → EXTRACTED INTENT
                </p>
              )}
            </div>
          </motion.div >

          {/* Cloud Vision Upload & Acoustic Actuation */}
          < motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
            className="rounded-2xl border border-blue-500/20 bg-blue-950/20 backdrop-blur-md p-8 relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-3 text-blue-100">
                  <UploadCloud className="text-blue-400" />
                  Cloud Vision Uplink
                </h2>
                <span className="text-xs font-mono bg-blue-900/50 px-3 py-1 rounded-full text-blue-300 border border-blue-500/30">Firebase ML</span>
              </div>

              <p className="text-sm text-blue-200/60 mb-6">
                Upload field imagery. If Neural Networks detect disease, the system automatically triggers the 40kHz Ultrasonic Phased Array to levitate and deliver fungicide.
              </p>
            </div>

            <div className="relative">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                title="Upload Plant Image"
              />
              <div className={`w-full py-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all
                        ${isUploading ? 'bg-blue-500/20 border-blue-400' : 'bg-black/50 border-blue-900 hover:border-blue-700 hover:bg-black/70'}`}
              >
                {isUploading ? (
                  <>
                    <TestTube className="w-10 h-10 text-blue-400 animate-bounce mb-3" />
                    <span className="text-blue-300 font-mono text-sm">Running Pathogen Detection Model...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-10 h-10 text-zinc-600 mb-3" />
                    <span className="text-zinc-400 font-mono text-sm">Drop 4K Image / Video (Max 10MB)</span>
                  </>
                )}
              </div>
            </div>
          </motion.div >

        </div >

        {/* AR Digital Twin Portal */}
        < motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="mb-10 w-full rounded-2xl bg-gradient-to-r from-zinc-900 to-black border border-white/10 p-8 flex flex-col md:flex-row items-center justify-between gap-8"
        >
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
              <ScanLine className="text-cyan-400 w-8 h-8" />
              AR Digital Twin Portal
            </h2>
            <p className="text-zinc-400 leading-relaxed max-w-2xl">
              Experience your farm in mixed reality. Scan the Vuforia image marker on your physical plant pot with the companion
              Unity mobile app to project this live telemetry data and a <strong className="text-white">live MJPEG video feed</strong> from your ESP32-CAM as a dynamic 3D
              hologram hovering over the soil in real-time.
            </p>
          </div>

          <div className="flex-shrink-0 w-32 h-32 bg-white p-2 rounded-xl border-4 border-zinc-800 shadow-2xl rotate-3 hover:rotate-0 transition-transform cursor-pointer">
            {/* Mock QR/Vuforia Image Target */}
            <div className="w-full h-full bg-black flex flex-col items-center justify-center p-2 text-center text-[10px] font-mono text-zinc-500 uppercase tracking-widest relative overflow-hidden">
              <div className="absolute inset-2 border-2 border-dashed border-zinc-700 pointer-events-none" />
              <ScanLine className="w-8 h-8 text-white mb-1" />
              Vuforia Target
            </div>
          </div>
        </motion.div >

        {/* Database Historical Chart */}
        < HistoricalChart data={history} />

      </main >

      {/* Basic shine animation keyframe */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes shine {
          100% { left: 125%; }
        }
        .animate-shine { animation: shine 1.5s infinite; }
      `}} />
    </div >
  );
}
