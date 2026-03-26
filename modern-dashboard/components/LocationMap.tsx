"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// Dynamic import for Leaflet map to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((mod) => mod.CircleMarker), { ssr: false });

interface LocationMapProps {
    lat: number;
    lng: number;
    nodeId: string;
}

export default function LocationMap({ lat, lng, nodeId }: LocationMapProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [currentLat, setCurrentLat] = useState(lat);
    const [currentLng, setCurrentLng] = useState(lng);

    useEffect(() => {
        setIsMounted(true);
        // Fix Leaflet icon paths in Next.js
        delete (window as any).L?.Icon?.Default?.prototype?._getIconUrl;
        if (typeof window !== 'undefined') {
            const L = require('leaflet');
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            });
        }

        // 1. The Geolocation Bridge: Capture and transmit live coordinates
        if (typeof window !== 'undefined' && "geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setCurrentLat(latitude);
                    setCurrentLng(longitude);
                    
                    try {
                        await fetch('/api/v1/telemetry/nodes', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                node_id: nodeId,
                                location: {
                                    lat: latitude,
                                    lng: longitude
                                }
                            })
                        });
                        console.log("Live coordinates synced with backend.");
                    } catch (error) {
                        console.error("Failed to sync coordinates:", error);
                    }
                },
                (error) => {
                    console.error("Geolocation error:", error);
                },
                { enableHighAccuracy: true }
            );
        }

    }, [nodeId]);

    if (!isMounted) return <div className="h-full w-full bg-zinc-900 rounded-xl animate-pulse"></div>;

    return (
        <MapContainer center={[currentLat, currentLng]} zoom={13} className="h-full w-full relative z-0" style={{ background: '#09090b' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {/* Geofence / Range Area */}
            <CircleMarker
                center={[currentLat, currentLng]}
                radius={40}
                pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2 }}
            />

            <Marker position={[currentLat, currentLng]}>
                <Popup className="bg-zinc-900 border border-zinc-700 text-white rounded-lg">
                    <div className="p-2 font-mono text-xs">
                        <strong className="text-emerald-400">NODE ACTIVE</strong><br />
                        ID: {nodeId}<br />
                        LAT: {currentLat.toFixed(4)}<br />
                        LNG: {currentLng.toFixed(4)}
                    </div>
                </Popup>
            </Marker>
        </MapContainer>
    );
}
