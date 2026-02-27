# Smart Irrigation System: Cyber-Physical Architecture API Spec

This document details the REST API endpoints and data structures used for communication between the internal agricultural microcontrollers (edge nodes) and the centralized visualization dashboards (AR interfaces and Mobile Apps).

## 1. Edge Node Telemetry Upload (POST)
**Endpoint:** `/api/v1/telemetry/nodes/{node_id}`
**Method:** POST
**Description:** The ESP32 device uploads highly filtered environmental data and actuator states.
**Frequency:** Every 10 seconds (RTOS controlled).

**Payload Structure (JSON):**
```json
{
  "timestamp": "2026-02-27T12:00:00Z",
  "node_id": "esp32_zone_alpha",
  "soil_moisture": {
    "raw_voltage": 1.45,
    "kalman_filtered_v": 1.47,
    "percentage": 58.2
  },
  "atmosphere": {
    "temperature_c": 32.4,
    "humidity_pct": 45.1
  },
  "actuators": {
    "pump_relay_active": false,
    "flow_pulses_counted": 1240
  },
  "tinyml_predictions": {
    "et_forecast_mm_day": 4.2,
    "wilting_probability_24h": 0.12
  }
}
```

## 2. AR Dashboard Real-Time Retrieval (GET)
**Endpoint:** `/api/v1/telemetry/nodes/{node_id}/latest`
**Method:** GET
**Description:** Fetches the most recent Kalman-filtered telemetry payload. Used heavily by the Unity3D mobile application to physically scale the 3D augmented reality water reservoirs hovering over the crops.

**Response Structure (JSON):**
```json
{
    "status": "success",
    "data": {
        // Echo of the above POST telemetry payload...
    }
}
```

## 3. Human (AR/BCI) Override Command (POST)
**Endpoint:** `/api/v1/control/nodes/{node_id}/actuate`
**Method:** POST
**Description:** When a user taps the floating virtual AR button, or when the NeuroSky BCI detects sustained "Attention > 80", a highly-prioritized command is sent to manually force the physical relays, overriding the internal TinyML drought prediction model.

**Payload Structure (JSON):**
```json
{
  "command": "FORCE_WATER_CYCLE",
  "duration_seconds": 120,
  "override_source": "BCI_NEUROSKY_AUTH_USER_1",
  "auth_token": "Bearer yXg..."
}
```

**ESP32 Handling:**
The ESP32 Core 0 async network loop continuously polls a persistent MQTT topic (e.g., `farm/nodes/alpha/rx`) or listens for HTTP callbacks. Upon receiving `FORCE_WATER_CYCLE`, it immediately transitions the primary state machine on Core 1 to HIGH, activating `RELAY_PIN 26` while entirely bypassing the `isRainingExpected` boolean checks.

---
*Architectural Note: For massive rural scale deployments (e.g., hundreds of sensors across fragmented agricultural zones), the HTTP JSON structures map directly down to sub-gigahertz LoRaWAN byte payloads to preserve the stringent duty cycle limitations of the 868MHz/915MHz bands.*
