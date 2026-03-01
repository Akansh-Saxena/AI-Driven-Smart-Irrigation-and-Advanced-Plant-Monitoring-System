#include <WiFi.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include "model.h" // Neural network weights for TinyML

// --- HARDWARE PIN CONFIGURATION ---
#define MOISTURE_PIN 34     
#define RELAY_PIN 26        
#define FLOW_SENSOR_PIN 25  
#define CLINOSTAT_PIN 27
#define ARRAY_40KHZ_PIN 14

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
#define TIME_TO_SLEEP  10          // 10 seconds sleep for testing purposes (increase to 600s/10min for production)
#define AWAKE_TIME     10000       // Stays awake for 10 seconds to allow sensor reading and POST request

unsigned long awakeStartTime;

// --- CLOUD CONFIGURATION ---
// IMPORTANT: REPLACE THIS WITH YOUR ACTUAL HOME OR PHONE HOTSPOT WI-FI DETAILS!
const char* ssid = "Danger";
const char* password = "sairamSR@4555";

// Your live Render API URL
const char* serverName = "https://ai-driven-smart-irrigation-and-advanced.onrender.com/api/telemetry";

const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

WiFiClient espClient;
PubSubClient mqttClient(espClient);

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.print("MQTT Command Received [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(message);

  if (message.indexOf("FORCE_PUMP") >= 0) {
    isPumpActive = true;
    digitalWrite(RELAY_PIN, HIGH);
    awakeStartTime = millis(); // Stay awake longer to pump
    Serial.println(">>> ACTIVATING WATER PUMP");
  } else if (message.indexOf("ROTATE_CLINOSTAT") >= 0) {
    digitalWrite(CLINOSTAT_PIN, HIGH);
    Serial.println(">>> ROTATING CLINOSTAT AT 45 RPM");
  } else if (message.indexOf("ENABLE_40KHZ_ARRAY") >= 0) {
    digitalWrite(ARRAY_40KHZ_PIN, HIGH);
    Serial.println(">>> FIRING 40kHz ULTRASONIC ARRAY FOR TARGETED LEVITATION/MEDICINE");
  }
}

void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Attempting MQTT connection...");
    // Create a random client ID
    String clientId = "ESP32-Farm-";
    clientId += String(random(0xffff), HEX);
    
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("Connected to HiveMQ Broker!");
      mqttClient.subscribe("smartfarm/control/esp32"); // The Command Topic
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" try again in 2 seconds");
      delay(2000);
    }
  }
}

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

  pinMode(CLINOSTAT_PIN, OUTPUT);
  digitalWrite(CLINOSTAT_PIN, LOW);

  pinMode(ARRAY_40KHZ_PIN, OUTPUT);
  digitalWrite(ARRAY_40KHZ_PIN, LOW);

  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), flowSensorInterrupt, FALLING);

  // 1. Connect to Internet Wi-Fi (Client Mode)
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");
  int attempts = 0;
  while(WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if(WiFi.status() == WL_CONNECTED) {
    Serial.println("");
    Serial.print("Connected! IP address: ");
    Serial.println(WiFi.localIP());
    
    // Configure MQTT Broker
    mqttClient.setServer(mqtt_server, mqtt_port);
    mqttClient.setCallback(mqttCallback);
  } else {
    Serial.println("\nFailed to connect to Wi-Fi. Check credentials.");
  }

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

  float pct = map(x_est * 1000, 1000, 2500, 100, 0);
  pct = constrain(pct, 0, 100);

  // --- 2. CYCLE AND SOAK LOGIC ---
  // Only turn on if soil is bone dry automatically (can be overriden by Cloud)
  if (x_est > 2.5 && !isPumpActive) { 
      isPumpActive = true;
      digitalWrite(RELAY_PIN, HIGH);
  }

  // --- 3. SEND TELEMETRY TO RENDER CLOUD & CHECK MQTT ---
  if(WiFi.status() == WL_CONNECTED) {
    // Check MQTT incoming messages
    if (!mqttClient.connected()) {
      reconnectMQTT();
    }
    mqttClient.loop();

    HTTPClient http;
    
    // Simulate TinyML
    float ai_prob = 15.0; 
    if (x_est > 2.0) ai_prob = 85.5; 
    else if (x_est > 1.5) ai_prob = 40.2;

    // Build JSON Payload manually (to avoid adding heavy JSON libraries)
    String payload = "{";
    payload += "\"node_id\":\"esp32_zone_alpha\",";
    payload += "\"soil_moisture\":{";
    payload += "\"raw_voltage\":" + String(raw_voltage, 2) + ",";
    payload += "\"kalman_filtered_v\":" + String(x_est, 2) + ",";
    payload += "\"percentage\":" + String(pct, 1);
    payload += "},";
    payload += "\"actuators\":{";
    payload += "\"pump_relay_active\":" + String(isPumpActive ? "true" : "false") + ",";
    payload += "\"flow_pulses_counted\":" + String(total_pulses);
    payload += "},";
    payload += "\"tinyml_predictions\":{";
    payload += "\"et_forecast_mm_day\":4.2,";
    payload += "\"wilting_probability_24h\":" + String(ai_prob, 1);
    payload += "}}";

    Serial.println("Pushing telemetry to Render Cloud...");
    
    http.begin(serverName);
    http.addHeader("Content-Type", "application/json");
    int httpResponseCode = http.POST(payload);
    
    // Process Response from Cloud (e.g. Manual Pump Override)
    if (httpResponseCode > 0) {
      Serial.print("HTTP POST Success: ");
      Serial.println(httpResponseCode);
      String response = http.getString();
      
      // Look for the force_pump flag in the crude JSON response
      if(response.indexOf("\"force_pump\":true") > 0) {
        Serial.println("Force Pump override activated from Cloud!");
        isPumpActive = true;
        digitalWrite(RELAY_PIN, HIGH);
        awakeStartTime = millis(); // Stay awake to pump water
      }
    } else {
      Serial.print("Error sending POST: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  } else {
    Serial.println("Wi-Fi not connected, skipping Cloud Sync.");
  }


  // --- 4. DEEP SLEEP DECISION (>90% Efficiency Metric) ---
  if ((millis() - awakeStartTime) > AWAKE_TIME && !isPumpActive) {
      Serial.println("Entering Deep Sleep to conserve battery...");
      Serial.flush(); 
      esp_deep_sleep_start();
  }

  delay(2000); // 2 second delay between loops to prevent spamming the Render API while awake
}
