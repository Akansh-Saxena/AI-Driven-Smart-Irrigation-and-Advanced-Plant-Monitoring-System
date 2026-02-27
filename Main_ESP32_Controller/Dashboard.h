#ifndef DASHBOARD_H
#define DASHBOARD_H

const char* html_dashboard = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartFarmer Local Node</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-color: #0d1117;
      --card-bg: rgba(22, 27, 34, 0.7);
      --primary: #58a6ff;
      --accent: #2ea043;
      --text: #c9d1d9;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', sans-serif;
      background: var(--bg-color);
      color: var(--text);
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      background-image: radial-gradient(circle at top right, rgba(88, 166, 255, 0.1), transparent 50%);
    }
    header {
      width: 100%;
      padding: 20px;
      text-align: center;
      background: rgba(13, 17, 23, 0.8);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      position: sticky;
      top: 0;
      z-index: 100;
      box-sizing: border-box;
    }
    h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--primary);
    }
    .container {
      width: 90%;
      max-width: 600px;
      margin-top: 30px;
      display: grid;
      grid-gap: 20px;
    }
    .card {
      background: var(--card-bg);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.05);
      transition: transform 0.2s ease;
      position: relative;
      overflow: hidden;
    }
    .card::before {
      content: '';
      position: absolute;
      top: -50%; left: -50%;
      width: 200%; height: 200%;
      background: radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 60%);
      transform: rotate(45deg);
      pointer-events: none;
    }
    .card:hover {
      transform: translateY(-2px);
    }
    .metric {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .metric-label {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.7);
    }
    .metric-value {
      font-size: 1.5rem;
      font-weight: 600;
    }
    
    /* Gauge styles */
    .gauge-container {
      width: 100%;
      height: 12px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      overflow: hidden;
      margin-top: 10px;
      position: relative;
    }
    .gauge-fill {
      height: 100%;
      background: linear-gradient(90deg, #ff7b72, #d2a8ff, #58a6ff);
      border-radius: 6px;
      width: 0%;
      transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .btn {
      width: 100%;
      padding: 16px;
      border: none;
      border-radius: 12px;
      background: var(--accent);
      color: white;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.3s ease, transform 0.1s ease;
      box-shadow: 0 4px 14px 0 rgba(46, 160, 67, 0.39);
    }
    .btn:hover {
      background: #3fb950;
    }
    .btn:active {
      transform: scale(0.98);
    }
    .btn.active-state {
      background: #ff7b72;
      box-shadow: 0 4px 14px 0 rgba(255, 123, 114, 0.39);
    }
    
    .badges {
      display: flex;
      gap: 10px;
      margin-top: 15px;
      flex-wrap: wrap;
    }
    .badge {
      font-size: 0.8rem;
      padding: 4px 10px;
      border-radius: 20px;
      background: rgba(88, 166, 255, 0.1);
      color: var(--primary);
      border: 1px solid rgba(88, 166, 255, 0.2);
    }
    
    @media (min-width: 600px) {
      .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-gap: 20px;
      }
    }
  </style>
</head>
<body>

  <header>
    <h1>SmartFarmer Edge Node</h1>
  </header>

  <div class="container">
    
    <div class="card">
      <div class="metric">
        <span class="metric-label">Soil Moisture (Kalman V)</span>
        <span class="metric-value" id="moistureVal">-- %</span>
      </div>
      <div class="gauge-container">
        <div class="gauge-fill" id="moistureGauge"></div>
      </div>
      <div class="badges">
        <span class="badge" id="pumpStatusBadge">Pump: Stby</span>
        <span class="badge">90% Efficiency Mode</span>
      </div>
    </div>

    <div class="card" style="border-top: 4px solid #d2a8ff;">
      <div class="metric">
        <span class="metric-label" style="color: #d2a8ff;">✨ Edge AI (TinyML) Forecast</span>
        <span class="metric-value" id="aiForecastVal">-- %</span>
      </div>
      <p style="font-size: 0.85rem; color: rgba(255,255,255,0.5); margin: 0 0 10px 0;">
        Probability of crop wilting point in 24 hours based on localized atmospheric modeling.
      </p>
      <div class="gauge-container" style="background: rgba(210, 168, 255, 0.1);">
        <div class="gauge-fill" id="aiGauge" style="background: linear-gradient(90deg, #d2a8ff, #ff7b72);"></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="metric" style="flex-direction: column; align-items: flex-start;">
          <span class="metric-label">System State</span>
          <span class="metric-value" id="sleepStateVal" style="color: var(--primary);">Active</span>
        </div>
        <p style="font-size: 0.85rem; color: rgba(255,255,255,0.5); margin-top: 10px; line-height: 1.4;">
          Entering Deep Sleep (10µA) in <span id="sleepTimer">--</span>s
        </p>
      </div>
      
      <div class="card" style="display: flex; align-items: center;">
         <button class="btn" id="waterBtn" onclick="toggleWater()">Force Irrigation</button>
      </div>
    </div>
    
  </div>

  <script>
    let pumpActive = false;

    // Fetch live sensor data from ESP32 API
    async function fetchData() {
      try {
        const response = await fetch('/api/data');
        const data = await response.json();
        
        // Update Moisture Reading (Assuming 0-100%)
        const m = Math.max(0, Math.min(100, data.moisture_pct));
        document.getElementById('moistureVal').innerText = m.toFixed(1) + '%';
        document.getElementById('moistureGauge').style.width = m + '%';
        
        // Update AI Prediction Reading
        const aiPct = Math.max(0, Math.min(100, data.ai_wilting_prob));
        document.getElementById('aiForecastVal').innerText = aiPct.toFixed(1) + '%';
        document.getElementById('aiGauge').style.width = aiPct + '%';
        
        // Update Time till sleep
        document.getElementById('sleepTimer').innerText = data.seconds_to_sleep;
        
        // Update Pump State
        pumpActive = data.pump_active;
        updateUI();

      } catch (err) {
        console.error("Connectivity issue", err);
      }
    }

    // Toggle Manual Override
    async function toggleWater() {
      try {
        const response = await fetch('/api/pump', {
          method: 'POST',
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          body: 'state=' + (pumpActive ? '0' : '1')
        });
        const resData = await response.json();
        pumpActive = resData.pump_active;
        updateUI();
      } catch (e) {
        console.error("Actuation failed", e);
      }
    }
    
    function updateUI() {
        const btn = document.getElementById('waterBtn');
        const badge = document.getElementById('pumpStatusBadge');
        if(pumpActive) {
            btn.innerText = "Stop Irrigation";
            btn.classList.add("active-state");
            badge.innerText = "Pump: ACTIVE";
            badge.style.color = "#ff7b72";
            badge.style.borderColor = "rgba(255, 123, 114, 0.2)";
            badge.style.background = "rgba(255, 123, 114, 0.1)";
        } else {
            btn.innerText = "Force Irrigation";
            btn.classList.remove("active-state");
            badge.innerText = "Pump: Stby";
            badge.style.color = "var(--primary)";
            badge.style.borderColor = "rgba(88, 166, 255, 0.2)";
            badge.style.background = "rgba(88, 166, 255, 0.1)";
        }
    }

    // Poll every 2 seconds
    setInterval(fetchData, 2000);
    fetchData(); // initial call
  </script>
</body>
</html>
)rawliteral";

#endif
