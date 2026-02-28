import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic'; // Prevent Vercel/Render from caching this route statically

// Global state to hold manual pump override command from the web UI
let forcePumpOverride = false;

export async function GET() {
  try {
    // 1. Connect to MongoDB
    const client = await clientPromise;
    const db = client.db("smartfarm");
    const telemetryCollection = db.collection("telemetry_logs");

    // 2. Fetch the 100 most recent hardware readings, sorted by timestamp descending
    const data = await telemetryCollection
      .find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();

    // 3. Keep the frontend from breaking if the database is genuinely empty
    if (!data || data.length === 0) {
      return NextResponse.json([{
        timestamp: new Date().toISOString(),
        node_id: "NO_DATA",
        soil_moisture: { raw_voltage: 0, kalman_filtered_v: 0, percentage: 0 },
        atmosphere: { temperature_c: 0, humidity_pct: 0 },
        actuators: { pump_relay_active: false, flow_pulses_counted: 0 },
        tinyml_predictions: { et_forecast_mm_day: 0, wilting_probability_24h: 0 }
      }], { headers: { 'Cache-Control': 'no-store, max-age=0' } });
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error("Database GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch from database" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // 1. Structure the incoming data safely
    const newTelemetry = {
      timestamp: new Date().toISOString(),
      node_id: data.node_id || "esp32_unknown",
      soil_moisture: {
        raw_voltage: data.soil_moisture?.raw_voltage || 0,
        kalman_filtered_v: data.soil_moisture?.kalman_filtered_v || 0,
        percentage: data.soil_moisture?.percentage || 0
      },
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
      },
      computer_vision: {
        status: data.computer_vision?.status || "Calibration Pending",
        confidence: data.computer_vision?.confidence || 0.0
      },
      smfc_power: {
        raw_voltage_mv: data.smfc_power?.raw_voltage_mv || 0.0,
        status: data.smfc_power?.status || "Offline"
      },
      web3_ledger: {
        water_saved_liters: data.web3_ledger?.water_saved_liters || 0.0,
        wct_tokens_minted: data.web3_ledger?.wct_tokens_minted || 0
      }
    };

    // 2. Insert directly into MongoDB Atlas
    const client = await clientPromise;
    const db = client.db("smartfarm");
    const telemetryCollection = db.collection("telemetry_logs");

    await telemetryCollection.insertOne(newTelemetry);

    console.log(`[MongoDB Insert] Node: ${newTelemetry.node_id} | Moisture: ${newTelemetry.soil_moisture.percentage.toFixed(1)}%`);

    // 3. Send manual actuation override back to the physical IoT device
    const responsePayload = {
      status: "success",
      force_pump: forcePumpOverride
    };

    // 4. Reset the state once command is sent
    if (forcePumpOverride) forcePumpOverride = false;

    return NextResponse.json(responsePayload, { status: 200 });

  } catch (error) {
    console.error("Database POST Error:", error);
    return NextResponse.json({ error: "Failed to process telemetry insertion" }, { status: 400 });
  }
}
