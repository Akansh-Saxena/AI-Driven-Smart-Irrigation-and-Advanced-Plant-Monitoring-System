import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { text, lang } = await request.json();

        if (!text) {
            return NextResponse.json({ error: 'Text input is required' }, { status: 400 });
        }

        console.log(`[VOICE API] Received text (${lang}): ${text}`);

        // --- MOCK BHASHINI API & LLM INTEGRATION ---
        // In a real production environment, you would:
        // 1. Send text to Bhashini for translation to English (if not English)
        // 2. Send English text to an LLM (OpenAI/Gemini) to extract intent 
        // 3. Translate LLM response back to native language

        let intent = "chat";
        let action = null;
        let payload = null;
        let aiResponse = "I am processing your request.";

        const lowerText = text.toLowerCase();

        // 1. Simulated LLM Intent Classification
        if (lowerText.includes("rotate") || lowerText.includes("sun") || lowerText.includes("turn")) {
            intent = "actuation";
            action = "ROTATE_CLINOSTAT";
            payload = { rpm: 45.0 };
            aiResponse = "Rotating the clinostat at 45 RPM to optimize sun exposure.";
        } else if (lowerText.includes("spray") || lowerText.includes("heal") || lowerText.includes("medicine")) {
            intent = "actuation";
            action = "ENABLE_40KHZ_ARRAY";
            aiResponse = "Activating the 40 kilohertz ultrasonic phased array for targeted medicine delivery.";
        } else if (lowerText.includes("water") || lowerText.includes("pump") || lowerText.includes("irrigate")) {
            intent = "actuation";
            action = "FORCE_PUMP";
            aiResponse = "Forcing the water pump to start immediately.";
        } else {
            // General Chat
            aiResponse = `You said: "${text}". As your AI agronomist, I am monitoring the telemetry. The current soil moisture looks adequate.`;
        }

        // Return the parsed intent, action, and AI response to the frontend
        return NextResponse.json({
            intent,
            action,
            payload,
            aiResponse,
            translatedAudioUrl: null // Placeholder for Bhashini TTS Audio URL
        });

    } catch (error) {
        console.error('Voice Processing Error:', error);
        return NextResponse.json({ error: 'Failed to process voice command' }, { status: 500 });
    }
}
