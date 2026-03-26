"use client";

import React, { useState, useEffect } from 'react';

interface ExperimentalControlsProps {
  data?: {
    magnetic_field_ut: number;
    clinostat_rpm: number;
    ultrasonic_array_active: boolean;
  };
}

export default function ExperimentalControls({ data }: ExperimentalControlsProps) {
  // 1. State to track the 40kHz Array status, initialized via real props if available.
  const [is40kHzActive, setIs40kHzActive] = useState(data?.ultrasonic_array_active || false);
  const [loading, setLoading] = useState(false);

  // Sync state if external changes occur (like MQTT updates overriding)
  useEffect(() => {
    if (data !== undefined) {
      setIs40kHzActive(data.ultrasonic_array_active);
    }
  }, [data?.ultrasonic_array_active]);

  // 2. The API Trigger Function
  const handleAcousticToggle = async () => {
    // Optimistic UI update
    const newState = !is40kHzActive;
    setIs40kHzActive(newState);
    setLoading(true);

    try {
      // Sending the command to your established API spec
      const response = await fetch('/api/v1/control/nodes/esp32_zone_alpha/actuate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: newState ? "ENABLE_40KHZ_ARRAY" : "DISABLE_40KHZ_ARRAY",
          override_source: "DASHBOARD_UI"
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reach ESP32 Edge Node");
      }
      
      console.log(`40kHz Array ${newState ? 'Activated' : 'Deactivated'} Successfully`);

    } catch (error) {
      console.error("Actuation Error:", error);
      // Revert the toggle if the API fails
      setIs40kHzActive(!newState); 
      alert("Failed to apply 40kHz frequency. Check ESP32 connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#121212]/80 backdrop-blur-md p-6 rounded-2xl border border-gray-800 w-full h-full flex flex-col justify-between">
      {/* FIX 1: Removed "Anti-Grav Uplink" and replaced with a cleaner, scientific header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <span className="text-purple-500">🧬</span>
          <h3 className="text-gray-400 font-mono text-sm uppercase tracking-widest">Experimental Physics</h3>
        </div>
        {/* Sleek, pulsing cyan status dot */}
        <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></span>
      </div>

      <div className="flex justify-between mb-6">
        <div>
          <p className="text-gray-500 text-xs uppercase mb-1">Magnetic Field</p>
          <p className="text-white font-bold text-xl">{data ? data.magnetic_field_ut.toFixed(0) : 45022} <span className="text-sm text-gray-400">μT</span></p>
        </div>
        <div>
          <p className="text-gray-500 text-xs uppercase mb-1">Clinostat</p>
          <p className="text-cyan-400 font-bold text-xl">{data ? data.clinostat_rpm.toFixed(1) : 15.6} <span className="text-sm text-gray-400">RPM</span></p>
        </div>
      </div>

      {/* FIX 2: Wired up the toggle to the API handler */}
      <div className="flex justify-between items-center bg-[#0a0a0a] p-3 rounded-xl border border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-green-500 text-xl">🔊</span>
          <p className="text-gray-300 font-mono text-sm">40kHz Array</p>
        </div>
        
        {/* Toggle Switch */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={is40kHzActive}
            onChange={handleAcousticToggle}
            disabled={loading}
          />
          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
        </label>
      </div>
    </div>
  );
}
