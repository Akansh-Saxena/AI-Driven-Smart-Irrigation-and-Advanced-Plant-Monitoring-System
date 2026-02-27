#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include "Dashboard.h"
#include "model.h" // Neural network weights for TinyML

// --- HARDWARE PIN CONFIGURATION ---
#define MOISTURE_PIN 34     
#define RELAY_PIN 26        
#define FLOW_SENSOR_PIN 25  

// --- KALMAN FILTER & EFFICIENCY VARIABLES ---
// RTC_DATA_ATTR saves these variables in RTC memory during Deep Sleep
RTC_DATA_ATTR float x_est = 0;   
RTC_DATA_ATTR float p_est = 1;   
RTC_DATA_ATTR int total_pulses = 0; 
RTC_DATA_ATTR int bootCount = 0;

float q_var = 0.01;  
float r_var = 0.1;   
bool isPumpActive = false;

// --- TIME TO SLEEP CONSTANTS ---
#define uS_TO_S_FACTOR 1000000ULL  // Conversion factor for micro seconds to seconds
#define TIME_TO_SLEEP  600         // ESP32 will sleep for 10 minutes (600 seconds)
#define AWAKE_TIME     30000       // ESP32 stays awake for 30 seconds to serve UI / run pumps

unsigned long awakeStartTime;

// --- WEB SERVER & AP SETUP ---
AsyncWebServer server(80);
const char* ssid = "SmartFarmer_Alpha";
const char* password = "admin"; // Highly accessible local network

void IRAM_ATTR flowSensorInterrupt() {
  total_pulses++;
}

void setup() {
  Serial.begin(115200);
  awakeStartTime = millis();
  ++bootCount;
  
  pinMode(MOISTURE_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); 

  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), flowSensorInterrupt, FALLING);

  // 1. Establish Local Wi-Fi Access Point (100% Offline Accessibility)
  WiFi.softAP(ssid, password);
  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP address: "); Serial.println(IP);

  // 2. Setup Async Web Routes
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send_P(200, "text/html", html_dashboard);
  });

  server.on("/api/data", HTTP_GET, [](AsyncWebServerRequest *request){
    // Calculate remaining seconds until deep sleep
    int seconds_remaining = (AWAKE_TIME - (millis() - awakeStartTime)) / 1000;
    if(seconds_remaining < 0) seconds_remaining = 0;
    
    // Map kalman voltage roughly to percentage (assuming 1.0V is 100%, 2.5V is 0%)
    float pct = map(x_est * 1000, 1000, 2500, 100, 0);
    pct = constrain(pct, 0, 100);

    // DUMMY AI INFERENCE: Simulate a TinyML calculation reading the local variables and weights
    // In production, this would call eloquent_tinyml functions like: tf.predict(input_array)
    // We simulate a high wilting probability if voltage is high AND pump is off.
    float ai_prob = 15.0; // Baseline 15%
    if (x_est > 2.0) ai_prob = 85.5; 
    else if (x_est > 1.5) ai_prob = 40.2;

    String json = "{\"moisture_pct\":" + String(pct) + ", \"seconds_to_sleep\":" + String(seconds_remaining) + ", \"pump_active\":" + String(isPumpActive) + ", \"ai_wilting_prob\":" + String(ai_prob) + "}";
    request->send(200, "application/json", json);
  });

  server.on("/api/pump", HTTP_POST, [](AsyncWebServerRequest *request){
    if(request->hasParam("state", true)){
      AsyncWebParameter* p = request->getParam("state", true);
      isPumpActive = (p->value() == "1");
      digitalWrite(RELAY_PIN, isPumpActive ? HIGH : LOW);
      
      // If user forces the pump, keep the ESP32 awake for another 30 seconds
      awakeStartTime = millis(); 
    }
    String json = "{\"status\":\"success\", \"pump_active\":" + String(isPumpActive) + "}";
    request->send(200, "application/json", json);
  });

  server.begin();

  // 3. Configure Wakeup Timer
  esp_sleep_enable_timer_wakeup(TIME_TO_SLEEP * uS_TO_S_FACTOR);
}

void loop() {
  // --- 1. SENSOR POLLING & KALMAN FILTERING ---
  int raw_adc = analogRead(MOISTURE_PIN);
  float raw_voltage = (raw_adc / 4095.0) * 3.3;
  
  float p_pred = p_est + q_var;
  float k_gain = p_pred / (p_pred + r_var);
  x_est = x_est + k_gain * (raw_voltage - x_est);
  p_est = (1 - k_gain) * p_pred;

  // --- 2. CYCLE AND SOAK LOGIC ---
  // Only turn on if soil is bone dry AND the user hasn't toggled the Web UI state
  if (x_est > 2.5 && !isPumpActive) { 
      isPumpActive = true;
      digitalWrite(RELAY_PIN, HIGH);
  }

  // --- 3. DEEP SLEEP DECISION (>90% Efficiency Metric) ---
  // If the pump is off, and we've been awake long enough to serve the Dashboard (30s),
  // immediately shut down the massive Wi-Fi radio and dual-cores to drop to 10µA.
  if ((millis() - awakeStartTime) > AWAKE_TIME && !isPumpActive) {
      Serial.println("Entering Deep Sleep to conserve battery...");
      Serial.flush(); 
      esp_deep_sleep_start();
  }

  delay(100); // 10Hz tick rate while awake
}
