"use client";

import { useState, useCallback } from "react";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { SpotMarker } from "./SpotMarker";
import { SpotPopup } from "./SpotPopup";
import type { SpotMapPoint } from "@/types/spots";

const TAIPEI_CENTER = { lat: 25.0478, lng: 121.5319 };

interface MapViewProps {
  spots: SpotMapPoint[];
  userLocation: { lat: number; lng: number } | null;
}

export function MapView({ spots, userLocation }: MapViewProps) {
  const [selectedSpot, setSelectedSpot] = useState<SpotMapPoint | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  const handleMarkerClick = useCallback((spot: SpotMapPoint) => {
    setSelectedSpot((prev) => (prev?.id === spot.id ? null : spot));
  }, []);

  const handleMapClick = useCallback(() => {
    setSelectedSpot(null);
  }, []);

  const center = userLocation ?? TAIPEI_CENTER;

  return (
    <APIProvider apiKey={apiKey}>
      <div className="relative w-full h-full">
        <Map
          defaultCenter={center}
          defaultZoom={14}
          mapId="oddspot-map"
          onClick={handleMapClick}
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ width: "100%", height: "100%" }}
        >
          {spots.map((spot) => (
            <SpotMarker
              key={spot.id}
              spot={spot}
              isSelected={selectedSpot?.id === spot.id}
              onClick={handleMarkerClick}
            />
          ))}
        </Map>

        {selectedSpot && (
          <SpotPopup
            spot={selectedSpot}
            onClose={() => setSelectedSpot(null)}
          />
        )}
      </div>
    </APIProvider>
  );
}
