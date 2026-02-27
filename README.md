# Smart Irrigation System: Cyber-Physical Architecture

Welcome to the advanced, multi-module smart irrigation and cyber-physical agricultural prototype repository. This project integrates state-of-the-art predictive Edge AI (TinyML), real-time digital signal processing, Augmented Reality (AR), Brain-Computer Interfaces (BCI), and experimental aerospace-derived adaptations like Magnetic Levitation and Simulated Microgravity.

## Repository Structure

The architecture is divided into the following distinct software domains, each governed by specific microcontrollers or subsystems:

*   **`Main_ESP32_Controller/`**:
    The core agricultural Edge node. Handles dual-core RTOS. Core 0 manages Wi-Fi, asynchronous MQTT/HTTP requests, and external weather (Evapotranspiration) polling. Core 1 runs a high-speed Digital Kalman Filter to smooth capacitive soil moisture readings and controls pump/solenoid actuation.

*   **`MagLev_PID_Controller/`**:
    Hardware logic to dynamically balance a physical, hovering plant pot using electromagnetic repulsion. Utilizes a high-frequency Proportional-Integral-Derivative (PID) loop referencing analog Hall Effect sensor data to counter gravity in real-time.

*   **`Clinostat_Controller/`**:
    Arduino-based stepper motor code designed to simulate near-zero gravity. It constantly rotates agricultural samples at precise RPMs (1-10 RPM) to study gravimorphogenesis and artificially breed hyper-resilient, stress-adapted crop lines.

*   **`Acoustic_Levitation/`**:
    Digital Acoustofluidics. Low-level ATmega328p hardware timer manipulation (Timer 1) generating exact 40,000 Hz, phase-inverted square waves through a dual H-bridge. This creates localized standing acoustic waves to physically trap and transport fluid droplets without contamination.

*   **`Architecture_API_Spec.md`**:
    Detailed JSON and REST API specifications governing the data flow between the IoT edge network and external, human-centric interfaces (Vuforia AR overlays and NeuroSky BCI headsets).

*   **`Research_and_Implementation_Guide.md`**:
    The master blueprint containing exhaustive scientific rationale, socio-economic context (e.g., UP groundwater crisis), hardware wiring requirements, and step-by-step physical assembly instructions for all modules.

## Getting Started

1.  Open the `.ino` files in the **Arduino IDE**.
2.  Install required libraries (e.g., `AccelStepper` for the Clinostat).
3.  For the `Main_ESP32_Controller`, ensure your ESP32 board definitions are installed via the Boards Manager.
4.  Consult the `Research_and_Implementation_Guide.md` for specific physical wiring schematics corresponding to each module before flashing the microcontrollers.
