import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
        return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
    }

    const API_KEY = process.env.OPENWEATHERMAP_API_KEY || "demo_key"; // Provide your key in .env
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({ error: data.message || 'Error fetching weather data' }, { status: response.status });
        }

        // Calculate a crude Evapotranspiration (ET) target based on temp and humidity
        const temp = data.main.temp;
        const humidity = data.main.humidity;
        const windSpeed = data.wind.speed;

        // Simplified Hargreaves-Samani or similar crude estimation for demo purposes
        // ET0 = 0.0023 * (Tmean + 17.8) * (Tmax - Tmin)^0.5 * Ra  ... simplified here
        const estimatedET = Math.max(0, (temp * 0.46) - (humidity * 0.02) + (windSpeed * 0.1));

        return NextResponse.json({
            temp: data.main.temp,
            humidity: data.main.humidity,
            wind_speed: data.wind.speed,
            description: data.weather[0].description,
            estimated_et_mm: estimatedET,
            location_name: data.name
        });

    } catch (error) {
        console.error('Weather API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 });
    }
}
