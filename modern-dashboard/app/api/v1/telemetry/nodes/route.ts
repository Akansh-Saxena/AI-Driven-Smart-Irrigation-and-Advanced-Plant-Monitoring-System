import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { node_id, location } = body;

        if (!location || !location.lat || !location.lng) {
            return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
        }

        const { lat, lng } = location;

        // Query Open-Meteo API for hyper-local, high-resolution meteorological data
        // We get current temperature, relative humidity, and 24h precipitation probability
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m&daily=precipitation_probability_max&timezone=auto&forecast_days=1`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({ error: 'Error fetching weather data from Open-Meteo' }, { status: response.status });
        }

        const temperature_c = data.current.temperature_2m;
        const humidity_pct = data.current.relative_humidity_2m;
        // Check if there is a significant chance of rain (e.g., > 50%) in the next 24h
        const rain_expected_24h = (data.daily.precipitation_probability_max[0] || 0) > 50;

        // Construct the localized payload
        const payload = {
            node_id: node_id || "unknown",
            atmosphere: {
                temperature_c,
                humidity_pct,
                rain_expected_24h
            },
            timestamp: new Date().toISOString()
        };

        // Here we could store this payload in a database, emit via WebSocket, or send over MQTT mapping to ESP32
        // For now, we return it so the frontend (or ESP32 making this request) gets the synced data.
        
        console.log(`[Telemetry Sync] Node ${node_id} at ${lat},${lng}: Temp ${temperature_c}°C, Humidity ${humidity_pct}%, Rain Expected: ${rain_expected_24h}`);

        return NextResponse.json(payload, { status: 200 });

    } catch (error) {
        console.error('Telemetry Nodes API Error:', error);
        return NextResponse.json({ error: 'Failed to process telemetry' }, { status: 500 });
    }
}
