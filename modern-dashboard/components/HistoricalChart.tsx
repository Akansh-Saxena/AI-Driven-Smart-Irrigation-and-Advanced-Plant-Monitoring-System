"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TelemetryData {
    timestamp: string;
    soil_moisture: { percentage: number };
    tinyml_predictions: { wilting_probability_24h: number };
}

export function HistoricalChart({ data }: { data: TelemetryData[] }) {
    // Process data for the chart: reverse it so chronological order is left-to-right
    const chartData = [...data].reverse().map((d) => ({
        time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        Moisture: parseFloat(d.soil_moisture?.percentage?.toFixed(1) || "0"),
        WiltingRisk: parseFloat(d.tinyml_predictions?.wilting_probability_24h?.toFixed(1) || "0"),
    }));

    return (
        <div className="w-full h-[450px] mt-10 bg-zinc-900/50 rounded-2xl p-6 border border-white/10 backdrop-blur-sm relative z-10">
            <h3 className="text-2xl font-semibold mb-6 text-white/90">IoT Telemetry History</h3>
            <ResponsiveContainer width="100%" height="85%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis
                        dataKey="time"
                        stroke="#666"
                        fontSize={12}
                        tickMargin={10}
                        minTickGap={30}
                    />
                    <YAxis
                        stroke="#666"
                        fontSize={12}
                        tickFormatter={(value) => `${value}%`}
                        domain={[0, 100]}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Line
                        type="monotone"
                        dataKey="Moisture"
                        name="Soil Moisture %"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6, fill: '#3b82f6' }}
                        animationDuration={500}
                    />
                    <Line
                        type="monotone"
                        dataKey="WiltingRisk"
                        name="Wilting Probability %"
                        stroke="#ef4444"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6, fill: '#ef4444' }}
                        animationDuration={500}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
