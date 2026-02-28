// ESP32 Hardware Simulator for Live Render Dashboard Testing
// Run this file using: node esp32_simulator.js

const RENDER_API_URL = "https://ai-driven-smart-irrigation-and-advanced.onrender.com/api/telemetry";

console.log("🚀 Starting ESP32 Hardware Simulator...");
console.log(`📡 Target API: ${RENDER_API_URL}\n`);

// Simulated Hardware Variables
let x_est = 1.0; // Kalman filtered voltage (1.0V = 100% moisture, 2.5V = 0% moisture)
let isPumpActive = false;
let total_pulses = 0;

// Helper: Random variance generator
const randomVariance = (max) => (Math.random() * max * 2) - max;

// Advanced Module Trackers
let waterSavedLiters = 1450.5; // Base amount of saved water
let totalWctTokensMinted = 145; // 1 Token per 10 Liters saved

async function runLoop() {
    // 1. Simulate Sensor Readings (Moisture slowly dropping over time)
    if (isPumpActive) {
        x_est -= 0.1; // Water is flowing, soil gets wetter (voltage drops)
        total_pulses += Math.floor(10 + Math.random() * 5); // Flow sensor spins
    } else {
        x_est += 0.02 + randomVariance(0.01); // Soil naturally dries out (voltage rises)
    }

    // Cap boundaries (1.0V = 100%, 2.5V = 0%)
    if (x_est < 1.0) x_est = 1.0;
    if (x_est > 2.6) x_est = 2.6;

    // Convert voltage to percentage for payload
    let pct = ((2.5 - x_est) / 1.5) * 100;
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;

    // 2. Cycle and Soak Logic (Auto-trigger pump if bone dry)
    if (x_est > 2.5 && !isPumpActive) {
        console.log("⚠️ Soil is critically dry! Hardware auto-triggering relay.");
        isPumpActive = true;
    } else if (x_est <= 1.2 && isPumpActive) {
        console.log("✅ Soil is saturated. Hardware turning off relay.");
        isPumpActive = false;
    }

    // 3. Simulate TinyML Prediction
    let ai_prob = 15.0 + randomVariance(5);
    if (x_est > 2.0) ai_prob = 85.5 + randomVariance(10);
    else if (x_est > 1.5) ai_prob = 40.2 + randomVariance(5);

    // 4. Construct Payload (matching Arduino C++ logic)
    const payload = {
        node_id: "esp32_zone_alpha",
        soil_moisture: {
            raw_voltage: x_est + randomVariance(0.05),
            kalman_filtered_v: x_est,
            percentage: pct
        },
        actuators: {
            pump_relay_active: isPumpActive,
            flow_pulses_counted: total_pulses
        },
        tinyml_predictions: {
            et_forecast_mm_day: 4.2 + randomVariance(0.5),
            wilting_probability_24h: ai_prob
        },
        computer_vision: {
            status: ai_prob > 80 ? "Early Blight Detected" : "Healthy",
            confidence: ai_prob > 80 ? 85.0 + randomVariance(5) : 95.0 + randomVariance(4)
        },
        smfc_power: {
            raw_voltage_mv: 450 + (pct * 3.5) + randomVariance(20), // Wetter soil = happier bacteria = more millivolts
            status: (450 + (pct * 3.5)) > 600 ? "Charging Battery" : "Maintenance Mode"
        },
        web3_ledger: {
            water_saved_liters: parseFloat(waterSavedLiters.toFixed(2)),
            wct_tokens_minted: totalWctTokensMinted
        }
    };

    // Web3 Oracle Logic: If wilting prob is low, we suppress watering and save 2.5L
    if (ai_prob < 40 && !isPumpActive) {
        waterSavedLiters += 2.5;
        totalWctTokensMinted = Math.floor(waterSavedLiters / 10); // Mint rules: 1 WCT per 10 L
    }

    console.log(`[Sensor Tick] Moisture: ${pct.toFixed(1)}% | Pump: ${isPumpActive ? 'ON 🟢' : 'OFF 🔴'}`);

    // 5. Send HTTP POST to Render (just like ESP32 HTTPClient)
    try {
        const response = await fetch(RENDER_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();

            // 6. Process Cloud Response (Manual Override Web Button)
            if (data.force_pump === true) {
                console.log("🔔 WARNING: Received 'Force Irrigation' command from Render Cloud!");
                isPumpActive = true;
            }
        } else {
            console.error(`❌ HTTP POST Failed with status: ${response.status}`);
        }
    } catch (err) {
        console.error("❌ Failed to reach Render server (Make sure it hasn't spun down).", err.message);
    }

    // Wait 5 seconds before the next "Hardware Loop"
    setTimeout(runLoop, 5000);
}

// Start the simulator loop
runLoop();
