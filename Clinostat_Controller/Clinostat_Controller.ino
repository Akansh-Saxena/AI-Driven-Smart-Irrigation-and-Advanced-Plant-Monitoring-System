#include <AccelStepper.h>

/*
 * SIMULATED MICROGRAVITY CLINOSTAT CONTROLLER
 * Used for studying Gravitropism and breeding stress-resistant agriculture
 * Hardware: Arduino Uno, NEMA Stepper Motor, DRV8825/A4988 Driver, Potentiometer
 */

// --- PIN DEFINITIONS ---
#define DIR_PIN   2   // Stepper Direction
#define STEP_PIN  3   // Stepper Step Pulse
#define POT_PIN   A0  // Operator Rotational Speed Control

// Initialization of AccelStepper instance targeting Driver hardware
AccelStepper clinostatStepper(AccelStepper::DRIVER, STEP_PIN, DIR_PIN);

// --- MOTOR CHARACTERISTICS ---
long microsteps = 16;
long stepsPerRevolution = 200 * microsteps; // 3200 steps for 1 full rotation

void setup() {
  Serial.begin(115200);
  
  clinostatStepper.setMaxSpeed(4000); // Max pulses per second
  clinostatStepper.setAcceleration(500); // Smooth start to not disturb liquid agar
  clinostatStepper.setSpeed(0);
}

void loop() {
  // 1. Operator RPM Input
  int rawPotValue = analogRead(POT_PIN);
  
  // 2. Map Analog Reading to Target Steps Per Second
  // Goal: Operate clinostat between 1 RPM and 10 RPM to confuse plant statoliths.
  // 1 RPM  = 3200 steps / 60s  = ~53 steps per second
  // 10 RPM = 32000 steps / 60s = ~533 steps per second
  
  long targetSpeed = map(rawPotValue, 0, 1023, 53, 533);
  
  // Apply calculated constant speed
  clinostatStepper.setSpeed(targetSpeed);
  
  // 3. Execute Continuous Rotation
  // runSpeed() does not use internal acceleration calculations, perfect for constant RPM
  clinostatStepper.runSpeed();
}
