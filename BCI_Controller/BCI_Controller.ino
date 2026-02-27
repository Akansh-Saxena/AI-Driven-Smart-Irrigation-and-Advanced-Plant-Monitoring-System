/*
 * BRAIN-COMPUTER INTERFACE (BCI) BRIDGE NODE
 * Hardware: Arduino Uno + HC-05 Bluetooth Module
 * Headset: NeuroSky MindWave Mobile 2
 * Function: Parses Bluetooth EEG data. If raw human attention exceeds 80 for 5 seconds, 
 * it sends a hardware interrupt or serial command to the ESP32 to Force Irrigate.
 */

#include <SoftwareSerial.h>

// HC-05 connected to pins 10 (RX) and 11 (TX)
SoftwareSerial bluetooth(10, 11);

// Connection to ESP32 (e.g. connected to an ESP32 GPIO to trigger override)
#define OVERRIDE_PIN 8 

long highAttentionStartTime = 0;
bool isAttentionHigh = false;

// NeuroSky proprietary packet bytes
#define SYNC 0xAA
#define EXCODE 0x55

void setup() {
  Serial.begin(115200);     // Debug to PC
  bluetooth.begin(57600);   // MindWave default baud rate
  
  pinMode(OVERRIDE_PIN, OUTPUT);
  digitalWrite(OVERRIDE_PIN, LOW);
  
  Serial.println("Initiating BCI MindWave Link...");
}

void loop() {
  // Parsing the NeuroSky ThinkGear Serial Protocol
  if (bluetooth.available() > 0) {
    if (bluetooth.read() == SYNC) {
      if (bluetooth.read() == SYNC) {
        
        int payloadLength = bluetooth.read();
        if (payloadLength > 169) return; // Invalid payload
        
        byte payload[payloadLength];
        int checksum = 0;
        
        for (int i = 0; i < payloadLength; i++) {
          payload[i] = bluetooth.read();
          checksum += payload[i];
        }
        
        checksum = 255 - checksum;
        if (checksum == bluetooth.read()) {
          // Checksum verified. Parse the specific eSense values
          parsePayload(payload, payloadLength);
        }
      }
    }
  }
}

void parsePayload(byte *payload, int length) {
  int i = 0;
  while (i < length) {
    if (payload[i] == EXCODE) {
      i++;
    } else {
      byte code = payload[i];
      byte vLength = (code >= 0x80) ? payload[++i] : 1;
      
      // Attention eSense code is 0x04
      if (code == 0x04) {
        int attention = payload[++i];
        Serial.print("Current BCI Attention: ");
        Serial.println(attention);
        
        processAttentionActuation(attention);
      } else {
        i += vLength; 
      }
      i++;
    }
  }
}

void processAttentionActuation(int attentionMetric) {
    // 80 is considered "Greatly Elevated" concentration by the ThinkGear ASIC
    if (attentionMetric >= 80) {
        if (!isAttentionHigh) {
            isAttentionHigh = true;
            highAttentionStartTime = millis();
        }
        
        // If sustained for 5 seconds
        if (millis() - highAttentionStartTime >= 5000) {
            Serial.println(">>> SUSTAINED COGNITIVE FOCUS DETECTED <<<");
            Serial.println(">>> TRIGGERING IRRIGATION OVERRIDE <<<");
            
            // Send trigger to ESP32
            digitalWrite(OVERRIDE_PIN, HIGH);
            delay(1000); // Hold for 1 second
            digitalWrite(OVERRIDE_PIN, LOW);
            
            // Reset state to avoid rapid re-triggering
            isAttentionHigh = false; 
            delay(5000); // 5 second cooldown
        }
    } else {
        isAttentionHigh = false; // Reset timer if focus drops
    }
}
