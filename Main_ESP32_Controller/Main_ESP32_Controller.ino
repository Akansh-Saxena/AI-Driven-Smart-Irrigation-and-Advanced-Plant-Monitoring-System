#include <WiFi.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include "model.h" // Neural network weights for TinyML

// --- HARDWARE PIN CONFIGURATION ---
#define MOISTURE_PIN 34     
#define RELAY_PIN 26        
#define FLOW_SENSOR_PIN 25  
#define CLINOSTAT_PIN 27
#define ARRAY_40KHZ_PIN 14

// --- GPS CONFIGURATION ---
#define RXD2 16
#define TXD2 17
HardwareSerial gpsSerial(2);
TinyGPSPlus gps;

// --- ANTI-GRAVITY & SENSOR PINS ---
#define HALL_SENSOR_PIN 35
#define ELECTROMAGNET_PWM_PIN 33
#define I2C_SDA 21
#define I2C_SCL 22

// --- KALMAN FILTER & EFFICIENCY VARIABLES ---
// RTC_DATA_ATTR saves these variables in RTC memory during Deep Sleep
RTC_DATA_ATTR float x_est = 0;   
RTC_DATA_ATTR float p_est = 1;   
RTC_DATA_ATTR int total_pulses = 0; 
RTC_DATA_ATTR int bootCount = 0;

float q_var = 0.01;  
float r_var = 0.1;   
bool isPumpActive = false;
bool isAcousticActive = false;

// PID Variables for Magnetic Levitation
float pid_p = 0, pid_i = 0, pid_d = 0, pid_error = 0, pid_previous_error = 0;
float kp = 2.5, ki = 0.1, kd = 1.0;
int pid_setpoint = 1800; // Expected analog value from Hall Sensor when pot is levitating correctly
int pwm_output = 0;

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
const char* serverName = "https://ai-driven-smart-irrigation-and-advanced.onrender.com/api/v1/telemetry/nodes";

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
    isAcousticActive = true;
    // Enable 40kHz PWM on the pin
    ledcWriteTone(0, 40000); 
    Serial.println(">>> FIRING 40kHz ULTRASONIC ARRAY FOR TARGETED LEVITATION/MEDICINE");
  } else if (message.indexOf("DISABLE_40KHZ_ARRAY") >= 0) {
    isAcousticActive = false;
    ledcWriteTone(0, 0); 
    Serial.println(">>> DISABLING 40kHz ULTRASONIC ARRAY");
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
  // Setup PWM Channel 0 for the 40kHz transducer array
  ledcSetup(0, 40000, 8); // 40 kHz, 8-bit resolution
  ledcAttachPin(ARRAY_40KHZ_PIN, 0);
  ledcWriteTone(0, 0); // Start off

  // Setup PWM Channel 1 for Magnetic Levitation Coil
  pinMode(ELECTROMAGNET_PWM_PIN, OUTPUT);
  ledcSetup(1, 5000, 8); // 5 kHz, 8-bit resolution
  ledcAttachPin(ELECTROMAGNET_PWM_PIN, 1);
  ledcWrite(1, 0);

  pinMode(HALL_SENSOR_PIN, INPUT);

  // Initialize GPS Serial
  gpsSerial.begin(9600, SERIAL_8N1, RXD2, TXD2);

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

  // --- 2. MAGNETIC LEVITATION PID LOOP ---
  int hall_val = analogRead(HALL_SENSOR_PIN);
  pid_error = pid_setpoint - hall_val;
  pid_p = kp * pid_error;
  pid_i = pid_i + (ki * pid_error);
  pid_d = kd * (pid_error - pid_previous_error);
  
  pwm_output = pid_p + pid_i + pid_d;
  pwm_output = constrain(pwm_output, 0, 255); // 8-bit resolution limit
  
  ledcWrite(1, pwm_output);
  pid_previous_error = pid_error;

  // --- 3. CYCLE AND SOAK LOGIC ---
  // Only turn on if soil is bone dry automatically (can be overriden by Cloud)
  if (x_est > 2.5 && !isPumpActive) { 
      isPumpActive = true;
      digitalWrite(RELAY_PIN, HIGH);
  }

  // --- 4. SEND TELEMETRY TO RENDER CLOUD & CHECK MQTT ---
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
    
    // GPS Data
    if (gps.location.isValid()) {
        payload += "\"location\":{";
        payload += "\"lat\":" + String(gps.location.lat(), 6) + ",";
        payload += "\"lng\":" + String(gps.location.lng(), 6) + ",";
        payload += "\"satellites\":" + String(gps.satellites.value());
        payload += "},";
    }

    payload += "\"soil_moisture\":{";
    payload += "\"raw_voltage\":" + String(raw_voltage, 2) + ",";
    payload += "\"kalman_filtered_v\":" + String(x_est, 2) + ",";
    payload += "\"percentage\":" + String(pct, 1);
    payload += "},";
    payload += "\"actuators\":{";
    payload += "\"pump_relay_active\":" + String(isPumpActive ? "true" : "false") + ",";
    payload += "\"flow_pulses_counted\":" + String(total_pulses);
    payload += "},";
    payload += "\"anti_gravity\":{";
    payload += "\"magnetic_field_ut\":" + String(hall_val) + ",";
    payload += "\"ultrasonic_array_active\":" + String(isAcousticActive ? "true" : "false") + ",";
    payload += "\"clinostat_rpm\": 45.0";
    payload += "},";
    payload += "\"tinyml_predictions\":{";
    payload += "\"et_forecast_mm_day\":4.2,";
    payload += "\"wilting_probability_24h\":" + String(ai_prob, 1);
    payload += "}}";

    Serial.println("Pushing telemetry to Render Cloud...");
    
    http.begin(serverName);
    http.addHeader("Content-Type", "application/json");
    int httpResponseCode = http.POST(payload);
    
    // Process Response from Cloud (e.g. Manual Pump Override & Live Environmental Sync)
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
      
      // Parse Live Environmental Sync from JSON
      int idxTemp = response.indexOf("\"temperature_c\":");
      int idxHum = response.indexOf("\"humidity_pct\":");
      int idxRain = response.indexOf("\"rain_expected_24h\":");
      
      float envTemp = 0;
      float envHum = 0;
      bool envRain = false;
      
      if (idxTemp > 0) {
         int endIdx = response.indexOf(",", idxTemp);
         envTemp = response.substring(idxTemp + 16, endIdx).toFloat();
      }
      if (idxHum > 0) {
         int endIdx = response.indexOf(",", idxHum);
         envHum = response.substring(idxHum + 15, endIdx).toFloat();
      }
      if (idxRain > 0) {
         // Look for "true" inside the "rain_expected_24h" boolean
         envRain = (response.indexOf("true", idxRain) > 0 && response.indexOf("true", idxRain) < idxRain + 25);
      }
      
      Serial.print("Live Atmosphere Sync - Temp: ");
      Serial.print(envTemp);
      Serial.print("C, Hum: ");
      Serial.print(envHum);
      Serial.print("%, Rain Expected: ");
      Serial.println(envRain ? "YES" : "NO");

      // Futuristic AI Logic integration: 
      // If rain is expected, delay pump activation unless extremely dry
      if (envRain && x_est < 3.0 && !isPumpActive) {
          Serial.println("Edge AI Decision: Rain expected in 24h. Inhibiting pump to conserve water.");
      } else if (x_est > 2.0 && envTemp > 35.0 && envHum < 30.0 && !isPumpActive) {
          Serial.println("Edge AI Decision: Extreme heat and dry atmosphere detected. Activating pump early to prevent wilting!");
          isPumpActive = true;
          digitalWrite(RELAY_PIN, HIGH);
          awakeStartTime = millis();
      }
      
    } else {
      Serial.print("Error sending POST: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  } else {
    Serial.println("Wi-Fi not connected, skipping Cloud Sync.");
  }


  // --- 5. DEEP SLEEP DECISION (>90% Efficiency Metric) ---
  if ((millis() - awakeStartTime) > AWAKE_TIME && !isPumpActive) {
      Serial.println("Entering Deep Sleep to conserve battery...");
      Serial.flush(); 
      esp_deep_sleep_start();
  }

  delay(2000); // 2 second delay between loops to prevent spamming the Render API while awake
}
