/*
 * ACOUSTIC LEVITATION (DIGITAL ACOUSTOFLUIDICS)
 * Purpose: Contactless droplet delivery using 40kHz ultrasonic standing waves 
 * Hardware: Arduino Uno (ATmega328p), L298N Dual H-Bridge Motor Driver
 * Transducers: Top/Bottom Acoustic Arrays targeting 40,000 Hz resonance
 */

// L298N Module Inputs connected to Arduino Timer 1 pins
#define TRANSDUCER_A 9   // OC1A
#define TRANSDUCER_B 10  // OC1B
#define PIR_SENSOR_PIN 2 // HC-SR501 Passive Infrared Motion Sensor

bool isGeneratingAcousticWave = false;

void setup() {
  pinMode(TRANSDUCER_A, OUTPUT);
  pinMode(TRANSDUCER_B, OUTPUT);
  
  /*
   * TIMER 1 HARDWARE CONFIGURATION
   * We need a perfect 40kHz square wave to generate high acoustic pressure.
   * Standard `analogWrite()` PWM is too slow (~490Hz or ~980Hz).
   * We will directly manipulate the ATmega328p registry to toggle pins at 40k.
   */

  // 1. Reset Timer 1 Control Registers
  TCCR1A = 0; 
  TCCR1B = 0; 
  TCNT1  = 0; // Reset counter

  // 2. Clear Timer on Compare Match (CTC) mode 4
  // 3. Enable toggle state on Output Compare A and B
  TCCR1A = (1 << COM1A0) | (1 << COM1B0); 
  
  // 4. Set WGM for CTC Mode, prescaler = 1 (No prescaler for max speed)
  TCCR1B = (1 << WGM12) | (1 << CS10);
  
  // 5. Calculate Output Compare Register value (OCR1A)
  // Clock Frequency = 16,000,000 Hz
  // Desired Toggle Frequency = 40,000 Hz (which means square wave cycle is 20kHz?? Wait)
  // We need the output wave to be 40kHz, which means we toggle every half-cycle (80kHz).
  // Math: 16MHz / (2 * 40kHz) - 1 = 199.
  
  OCR1A = 199;
  
  // To drive the L298N efficiently, TRANSDUCER_B should be exactly OUT OF PHASE (inverted) relative to A.
  // With COM1A0 and COM1B0, they toggle identically. 
  // To ensure they are inverted, we manually set the PORT registry before starting the timer.
  PORTB |= (1 << PORTB1);  // Set Pin 9 HIGH
  PORTB &= ~(1 << PORTB2); // Set Pin 10 LOW
  
  /* 
   * The H-Bridge now rapidly flips the polarity applied to the Piezo Transducer array.
   * Acoustic radiation pressure creates standing nodes trapping liquid fluid in mid-air.
   */
}

void loop() {
  // ENERGY EFFICIENCY: Throttling 40kHz generation when no one is watching
  bool humanPresent = digitalRead(PIR_SENSOR_PIN) == HIGH;
  
  if (humanPresent && !isGeneratingAcousticWave) {
      Serial.println("Motion detected: Starting 40kHz Nodes");
      // Re-enable output compare toggling
      TCCR1A |= (1 << COM1A0) | (1 << COM1B0); 
      isGeneratingAcousticWave = true;
  } 
  else if (!humanPresent && isGeneratingAcousticWave) {
      Serial.println("Standby: Halting Acoustic Field");
      // Disable timer output toggle to cut L298N power
      TCCR1A &= ~((1 << COM1A0) | (1 << COM1B0));
      // Force pins LOW to ensure zero current draw
      digitalWrite(TRANSDUCER_A, LOW);
      digitalWrite(TRANSDUCER_B, LOW);
      isGeneratingAcousticWave = false;
  }
  
  delay(100);
}
