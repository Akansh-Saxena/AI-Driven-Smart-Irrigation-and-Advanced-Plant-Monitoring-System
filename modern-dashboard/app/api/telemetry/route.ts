import { NextResponse } from 'next/server';

// Simulating the structural payload expected from Architecture_API_Spec.md
export async function GET() {
  // Generate slightly fluctuating mock data to simulate live sensors
  const baseMoisture = 65.0;
  const baseTemp = 32.5;
  const baseHumid = 45.0;
  
  const randomVariance = () => (Math.random() * 2) - 1;

  const payload = {
    timestamp: new Date().toISOString(),
    node_id: "esp32_zone_alpha",
    soil_moisture: {
      raw_voltage: 1.45 + randomVariance() * 0.1,
      kalman_filtered_v: 1.47 + randomVariance() * 0.05,
      percentage: Math.max(0, Math.min(100, baseMoisture + randomVariance() * 5))
    },
    atmosphere: {
      temperature_c: baseTemp + randomVariance(),
      humidity_pct: baseHumid + randomVariance() * 2
    },
    actuators: {
      pump_relay_active: Math.random() > 0.8, // Radomly active 20% of the time for demo
      flow_pulses_counted: Math.floor(1000 + Math.random() * 500)
    },
    tinyml_predictions: {
      et_forecast_mm_day: 4.2 + randomVariance(),
      wilting_probability_24h: Math.max(0, Math.min(100, 15 + randomVariance() * 10))
    }
  };

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
