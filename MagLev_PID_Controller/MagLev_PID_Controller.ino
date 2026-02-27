#include <Arduino.h>

/*
 * MAGNETIC LEVITATION PLANT POT - PID CONTROLLER LOOP
 * Hardware: High-speed microcontroller (ESP32 / ATMega328p)
 * Sensor: Linear Analog Hall Effect Sensor (SS495A)
 * Actuator: Electromagnet Core driven by N-Channel Logic Level MOSFET
 */

#define HALL_SENSOR_PIN A0
#define MOSFET_PWM_PIN  9 // Ensure this pin supports high-speed hardware PWM
#define PIR_SENSOR_PIN  2 // HC-SR501 Passive Infrared Motion Sensor

// --- PID TUNING CONSTANTS ---
double kp = 5.2;   // Proportional: Reacts to current position error
double ki = 0.05;  // Integral: Accumulates steady state error (gravity sag)
double kd = 3.5;   // Derivative: Reacts to speed of fall/rise (dampens oscillation)

// --- SYSTEM VARIABLES ---
double setpoint = 512.0; // The target ADC value corresponding to middle air gap
double input, output;
double integral = 0;
double previous_error = 0;

// --- SAFETY BOUNDS ---
int output_min = 0;   // Coil OFF
int output_max = 255; // Coil FULL POWER (Max repulsion/attraction)

void setup() {
  Serial.begin(115200);
  pinMode(MOSFET_PWM_PIN, OUTPUT);
  pinMode(PIR_SENSOR_PIN, INPUT);
  
  // Optional: Reconfigure Timer registers on AVR chips to push PWM frequency beyond 20kHz 
  // to eliminate audible whining from the electromagnet.
}

void loop() {
  // 0. ENERGY EFFICIENCY: Observer Detection
  // Only power the massive electromagnets if a human observer is nearby (PIR goes HIGH)
  if (digitalRead(PIR_SENSOR_PIN) == LOW) {
    analogWrite(MOSFET_PWM_PIN, 0); // Cut power entirely
    delay(500); // Check again in half a second
    return;     // Skip standard PID leveling loop
  }

  // 1. Read Analog Magnetic Field Strength
  input = analogRead(HALL_SENSOR_PIN);
  
  // 2. Calculate Error Metrics
  double error = setpoint - input;
  integral += error;
  double derivative = error - previous_error;
  
  // 3. Compute PID Equation
  output = (kp * error) + (ki * integral) + (kd * derivative);
  
  // 4. Constrain Integral Windup and Output limits
  if (integral > 1000) integral = 1000;
  if (integral < -1000) integral = -1000;
  
  if (output > output_max) output = output_max;
  if (output < output_min) output = output_min;
  
  // 5. Actuate the Electromagnet via MOSFET
  analogWrite(MOSFET_PWM_PIN, (int)output);
  
  // 6. Save current state for next loop's derivative
  previous_error = error;
  
  // 7. Loop Execution Rate
  // Essential: PID requires precise, fixed time steps. Delay exactly 1ms (1000Hz poll rate).
  delayMicroseconds(1000); 
}
