"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";

// Helper to pick color based on severity
const getColor = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case "critical": return "#ef4444"; // Red
    case "high": return "#f97316";     // Orange
    case "medium": return "#eab308";   // Yellow
    default: return "#a855f7";         // Purple
  }
};

const LeafletMap = ({ data }: { data: any[] }) => {
  const [center, setCenter] = useState<[number, number]>([19.0760, 72.8777]); // Default Mumbai

  // Auto-center map if data exists
  useEffect(() => {
    if (data && data.length > 0) {
      const firstWithCoords = data.find(d => d.coords);
      if (firstWithCoords) {
        setCenter(firstWithCoords.coords);
      }
    }
  }, [data]);

  return (
    <MapContainer 
      key={JSON.stringify(center)} 
      center={center} 
      zoom={11} 
      // 1. Changed background to white for light theme integration
      style={{ height: "100%", width: "100%", background: "#ffffff" }} 
      zoomControl={false}
    >
      {/* 2. Changed TileLayer URL to Carto Light (Positron) */}
      <TileLayer
        attribution='&copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      
      {data.map((item, i) => {
        if (!item.coords) return null;

        const color = getColor(item.priority);

        return (
          <CircleMarker
            key={i}
            center={item.coords}
            pathOptions={{ 
              color: color, 
              fillColor: color, 
              fillOpacity: 0.2, 
              weight: 1
            }}
            radius={item.score / 2} 
            className={item.priority === "Critical" ? "animate-pulse" : ""}
          >
            <Popup className="glass-popup text-black font-bold">
              <div className="text-sm">
                <p>{item.title}</p>
                <p className="text-xs text-gray-500">Risk: {item.score}</p>
              </div>
            </Popup>
            
            {/* Inner Ring */}
            <CircleMarker 
              center={item.coords} 
              radius={10} 
              pathOptions={{ color: color, weight: 2, fillOpacity: 0 }}
            />

            {/* 3. Changed Center Dot to solid color so it stands out on light map */}
            <CircleMarker 
              center={item.coords} 
              radius={3} 
              pathOptions={{ color: color, fillColor: color, fillOpacity: 1 }}
            />
          </CircleMarker>
        )
      })}
    </MapContainer>
  );
};

export default LeafletMap;