# Low-Cost Bill of Materials (BOM) & Sourcing Guide

To ensure this advanced Smart Irrigation architecture remains globally accessible—specifically for resource-constrained environments or academic project builds—this guide prioritizes generic, low-cost components widely available on platforms like AliExpress, Amazon, or local electronics markets.

## Module 0: The Core IoT Brain & Dashboard
This minimal viable setup is required to run the `Main_ESP32_Controller.ino` with the Offline SoftAP Web Dashboard and Deep Sleep power saving.

| Item | Specification / Chipset | Est. Unit Cost (USD) | Primary Function |
| :--- | :--- | :--- | :--- |
| **Microcontroller** | ESP32-WROOM-32 (DevKit V1) | $4.00 - $6.00 | Hosts the Web server, runs Kalman filters, handles Deep Sleep routines. |
| **Soil Sensor** | Capacitive Soil Moisture Sensor v1.2 | $1.50 - $2.50 | Measures structural water content without galvanic degradation. |
| **Relay Module** | 5V 1-Channel Opto-isolated Relay | $1.00 - $2.00 | Safely switches the high-current water pump using a 3.3V ESP32 signal. |
| **Water Pump** | Generic 12V DC Submersible Pump | $5.00 - $8.00 | Physically moves water from the reservoir to the drip matrix. |
| **Power Supply** | 12V 2A DC Wall Adapter | $4.00 - $6.00 | Powers the pump directly. |
| **Buck Converter** | LM2596 DC-DC Step-Down | $1.50 - $2.50 | Steps the 12V supply down to a stable 5V to run the ESP32 and Relay. |
| ***Core Subtotal*** | | **~$17.00 - $27.00** | |

---

## Module 1: Magnetic Levitation Enhancements
Optional components to build the PID-controlled hovering plant pot.

| Item | Specification / Chipset | Est. Unit Cost (USD) | Primary Function |
| :--- | :--- | :--- | :--- |
| **Microcontroller** | Arduino Nano (ATmega328p) | $3.00 - $5.00 | Dedicated to running the highly timing-sensitive PID loop exclusively. |
| **Sensor** | SS495A Linear Analog Hall Effect | $1.00 - $2.00 | Detects minute changes in magnetic field strength as the pot dips. |
| **Transistor** | IRLZ44N Logic-Level N-MOSFET | $1.00 - $2.00 | Rapidly pulses 12V power to the electromagnet based on Arduino PWM. |
| **Motion/Power Save**| HC-SR501 PIR Sensor | $1.50 - $2.00 | Senses human presence to wake the system from zero-power standby. |
| **Magnet (Pot)** | N52 Neodymium Disc (e.g., 20x5mm) | $6.00 - $10.00 | The permanent magnet glued to the base of the floating plant. |
| **Electromagnet** | Custom wound copper coil or 12V holding solenoid | $8.00 - $15.00 | The base driving force repelling the Neodymium magnet. |

---

## Module 2: Simulated Microgravity (Clinostat)
Optional components for aerospace gravitropism research.

| Item | Specification / Chipset | Est. Unit Cost (USD) | Primary Function |
| :--- | :--- | :--- | :--- |
| **Microcontroller** | Arduino Uno R3 (Clone) | $4.00 - $6.00 | Generates precise step pulses. |
| **Motor** | NEMA 17 Stepper Motor | $10.00 - $15.00| Provides the physical continuous 1-10 RPM rotation. |
| **Motor Driver** | A4988 or DRV8825 Modue | $1.50 - $2.50 | Translates microscopic Arduino pulses into high-current motor phase steps. |
| **Interface** | 10k Rotary Potentiometer | $0.50 - $1.00 | Allows the user to physically dial in the target RPM. |

---

## Module 3: Digital Acoustofluidics (Acoustic Levitation)
Optional components for contactless droplet transportation.

| Item | Specification / Chipset | Est. Unit Cost (USD) | Primary Function |
| :--- | :--- | :--- | :--- |
| **Microcontroller** | Arduino Nano (ATmega328p) | $3.00 - $5.00 | Manipulates Hardware Timer 1 to generate precise 40,000 Hz frequencies. |
| **Driver** | L298N Dual H-Bridge | $2.50 - $4.00 | Rapidly switches polarity to drive the transducers at high pressure. |
| **Transducers** | 40kHz Ultrasonic Transmitter Array (x2 minimum) | $4.00 - $8.00 | Generates the intersecting phase waves to create the trapping nodes. |
| **Motion/Power Save**| HC-SR501 PIR Sensor | $1.50 - $2.00 | Cuts output to the L298N when no observers are present. |

---

## Total Accessibility Check
By relying on the **Core ESP32 Module**, a functional, highly predictive smart irrigation unit boasting >90% power efficiency (via Deep Sleep) and universal accessibility (via SoftAP Wi-Fi) can be constructed for **under $30 USD**. No expensive AR/VR hardware, proprietary software licenses, or persistent internet connections are required.
