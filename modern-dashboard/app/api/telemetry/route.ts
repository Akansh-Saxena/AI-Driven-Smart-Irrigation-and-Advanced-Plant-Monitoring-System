import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Prevent Vercel/Render from caching this route statically

// A simple in-memory store for the latest telemetry data (resets if the Render server sleeps).
// For a production app, this should be replaced with a database like MongoDB or Supabase.
let latestTelemetry: any = {
  timestamp: new Date().toISOString(),
  node_id: "esp32_zone_alpha",
  soil_moisture: {
    raw_voltage: 2.1,
    kalman_filtered_v: 2.05,
    percentage: 35.0
  },
  atmosphere: {
    temperature_c: 28.5,
    humidity_pct: 60.0
  },
  actuators: {
    pump_relay_active: false,
    flow_pulses_counted: 0
  },
  tinyml_predictions: {
    et_forecast_mm_day: 5.2,
    wilting_probability_24h: 75.0
  }
};

// Global state to hold manual pump override command from the web UI
let forcePumpOverride = false;

export async function GET() {
  // Check if we haven't received data in a while (e.g., 5 minutes = 300000ms)
  const lastUpdate = new Date(latestTelemetry.timestamp).getTime();
  const now = new Date().getTime();
  if (now - lastUpdate > 300000 && latestTelemetry.node_id !== "OFFLINE_WARNING") {
    // Optional: Flag data as stale if the ESP32 hasn't pinged recently
    // console.warn("Node hasn't reported in 5 minutes");
  }

  return NextResponse.json(latestTelemetry, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Access-Control-Allow-Origin': '*', // Useful if you ping this API from other domains
    },
  });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Update the global state with the new incoming data
    latestTelemetry = {
      timestamp: new Date().toISOString(),
      node_id: data.node_id || "esp32_unknown",
      soil_moisture: {
        raw_voltage: data.soil_moisture?.raw_voltage || 0,
        kalman_filtered_v: data.soil_moisture?.kalman_filtered_v || 0,
        percentage: data.soil_moisture?.percentage || 0
      },
      // If the ESP32 doesn't send atmosphere data, keep the old values or mock them
      atmosphere: {
        temperature_c: data.atmosphere?.temperature_c || 32.5,
        humidity_pct: data.atmosphere?.humidity_pct || 45.0
      },
      actuators: {
        pump_relay_active: data.actuators?.pump_relay_active || false,
        flow_pulses_counted: data.actuators?.flow_pulses_counted || 0
      },
      tinyml_predictions: {
        et_forecast_mm_day: data.tinyml_predictions?.et_forecast_mm_day || 4.5,
        wilting_probability_24h: data.tinyml_predictions?.wilting_probability_24h || 15.0
      }
    };

    console.log(`[Telemetry Received] Node: ${latestTelemetry.node_id} | Moisture: ${latestTelemetry.soil_moisture.percentage.toFixed(1)}%`);

    // We respond with instructions back to the ESP32 (e.g. telling it to turn the pump on manually)
    // Eventually, your page.tsx button could set this `forcePumpOverride` variable to true!
    const responsePayload = {
      status: "success",
      force_pump: forcePumpOverride
    };

    // If we just told the ESP32 to force the pump, reset the manual override flag
    if (forcePumpOverride) forcePumpOverride = false;

    return NextResponse.json(responsePayload, { status: 200 });

  } catch (error) {
    console.error("Failed to parse incoming telemetry:", error);
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
}
