import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  Locate,
  Download,
  Check,
  Compass,
  Layers,
  Shield,
  Navigation,
  ExternalLink,
  Map as MapIcon,
  Plus,
  Minus,
  Info,
  ChevronUp,
  ChevronDown,
  Phone,
  Cross,
  AlertTriangle,
} from 'lucide-react';
import { MAP_CONFIG } from '../config/mapConfig';
import { CitizenLocation, EmergencyPoint, FloodZoneOverlay } from '../types/location';
import { createCitizenMarkerIcon, createSafePointIcon } from './LocationMarker';
import { offlineService } from '../services/offlineService';

// Calculate distance between two lat/lng in meters (Haversine formula)
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

interface LocationMapProps {
  currentLocation: CitizenLocation | null;
  onRequestLocation: () => Promise<CitizenLocation | void> | CitizenLocation | void;
  zones?: FloodZoneOverlay[];
  points?: EmergencyPoint[];
  variant?: 'preview' | 'full';
  className?: string;
  interactive?: boolean;
  onOpenFullMap?: () => void;
  showExpandButton?: boolean;
  filterType?: 'ALL' | 'SAFE_ZONE' | 'FLOOD' | 'MEDICAL_POST';
}

export const LocationMap: React.FC<LocationMapProps> = ({
  currentLocation,
  onRequestLocation,
  zones = [],
  points = [],
  variant = 'preview',
  className = '',
  interactive = true,
  onOpenFullMap,
  showExpandButton = false,
  filterType = 'ALL',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const zonesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const pointsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);

  const isFull = variant === 'full';
  const mapboxToken = (import.meta.env.VITE_MAPBOX_TOKEN || '').trim();
  const mapboxEnabled = Boolean(mapboxToken);

  // Auto-default to the standard map layer so offline cached tiles work immediately.
  // Mapbox stays available for live test mode, but it is no longer required for the normal offline workflow.
  const [mapType, setMapType] = useState<'street' | 'satellite' | 'mapbox'>('street');
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | null>(null);
  const [cachedTileCount, setCachedTileCount] = useState<number>(0);
  const [isOffline, setIsOffline] = useState(false);
  const [showOfflinePanel, setShowOfflinePanel] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<EmergencyPoint | null>(null);
  const [nearestSafePoint, setNearestSafePoint] = useState<{
    point: EmergencyPoint;
    distance: number;
  } | null>(null);
  const [locationWarning, setLocationWarning] = useState<string | null>(null);
  const hasCenteredOnUserRef = useRef(false);

  // Monitor network status and cached tile count
  useEffect(() => {
    setIsOffline(!offlineService.isOnline());
    offlineService.getCachedTileCount().then(setCachedTileCount);

    const unsub = offlineService.onNetworkChange((online) => {
      setIsOffline(!online);
    });
    return unsub;
  }, []);

  // Compute nearest safe zone from current location
  useEffect(() => {
    if (!currentLocation) {
      setLocationWarning('Location permission denied — using current map center.');
      setNearestSafePoint(null);
      return;
    }

    if (currentLocation.isSimulated) {
      setLocationWarning('Location permission denied — using current map center.');
    } else {
      setLocationWarning(null);
    }

    if (points.length === 0) {
      setNearestSafePoint(null);
      return;
    }

    const safePoints = points.filter((p) => p.type === 'SAFE_ZONE' || p.type === 'RELIEF_POINT');
    if (safePoints.length === 0) return;

    let closest = safePoints[0];
    let minDistance = calculateDistanceMeters(
      currentLocation.latitude,
      currentLocation.longitude,
      closest.lat,
      closest.lng
    );

    for (let i = 1; i < safePoints.length; i++) {
      const d = calculateDistanceMeters(
        currentLocation.latitude,
        currentLocation.longitude,
        safePoints[i].lat,
        safePoints[i].lng
      );
      if (d < minDistance) {
        minDistance = d;
        closest = safePoints[i];
      }
    }

    setNearestSafePoint({ point: closest, distance: minDistance });
  }, [currentLocation, points]);

  // Create or switch tile layer
  const applyTileLayer = useCallback((map: L.Map, type: 'street' | 'satellite' | 'mapbox') => {
    if (activeTileLayerRef.current) {
      map.removeLayer(activeTileLayerRef.current);
    }

    const isStreet = type === 'street';
    const useMapbox = type === 'mapbox' && mapboxEnabled;

    // Real map basemaps:
    // Street: OpenStreetMap standard tiles (real-world map data)
    // Satellite: Esri World Imagery (real satellite imagery)
    // Mapbox: temporary live test layer using the configured token
    const tileUrl = useMapbox
      ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}?access_token=${encodeURIComponent(mapboxToken)}`
      : isStreet
      ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    const attribution = useMapbox
      ? '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      : isStreet
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      : 'Tiles &copy; Esri &mdash; Source: Esri';

    // Leaflet TileLayer subclass that uses cache and graceful offline fallback
    const ResilientTileLayer = L.TileLayer.extend({
      createTile(coords: L.Coords, done: L.DoneCallback) {
        const tile = (L.TileLayer.prototype as any).createTile.call(this, coords, done) as HTMLImageElement;
        const key = `${coords.z}_${coords.x}_${coords.y}`;

        // If the app is offline, prefer cached tiles immediately and do not hit the network.
        if (!offlineService.isOnline()) {
          offlineService.getCachedTile(key).then((cachedDataUrl) => {
            if (cachedDataUrl) {
              tile.src = cachedDataUrl;
            } else {
              const canvas = document.createElement('canvas');
              canvas.width = 256;
              canvas.height = 256;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = '#f5f5f4';
                ctx.fillRect(0, 0, 256, 256);
                ctx.strokeStyle = '#e7e5e4';
                ctx.strokeRect(0, 0, 256, 256);
                ctx.fillStyle = '#78716c';
                ctx.font = 'bold 11px sans-serif';
                ctx.fillText('नेपाल बाढी क्षेत्र', 16, 28);
                ctx.font = '10px monospace';
                ctx.fillStyle = '#a8a29e';
                ctx.fillText(`Z${coords.z} (${coords.x},${coords.y})`, 16, 44);
                ctx.fillText('[अफलाइन नक्सा]', 16, 60);
                tile.src = canvas.toDataURL();
              }
            }
          });
          return tile;
        }

        // If online, still prefer the cached tile when it already exists.
        offlineService
          .getCachedTile(key)
          .then((cachedDataUrl) => {
            if (cachedDataUrl) {
              tile.src = cachedDataUrl;
            }
          })
          .catch(() => {});

        // On network error or offline, fallback to cached or emergency pattern
        tile.addEventListener('error', () => {
          offlineService.getCachedTile(key).then((cached) => {
            if (cached) {
              tile.src = cached;
            } else {
              const canvas = document.createElement('canvas');
              canvas.width = 256;
              canvas.height = 256;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = '#f5f5f4';
                ctx.fillRect(0, 0, 256, 256);
                ctx.strokeStyle = '#e7e5e4';
                ctx.strokeRect(0, 0, 256, 256);
                ctx.fillStyle = '#78716c';
                ctx.font = 'bold 11px sans-serif';
                ctx.fillText('नेपाल बाढी क्षेत्र', 16, 28);
                ctx.font = '10px monospace';
                ctx.fillStyle = '#a8a29e';
                ctx.fillText(`Z${coords.z} (${coords.x},${coords.y})`, 16, 44);
                ctx.fillText('[अफलाइन नक्सा]', 16, 60);
                tile.src = canvas.toDataURL();
              }
            }
          });
        });

        return tile;
      },
    });

    const newLayer = new (ResilientTileLayer as any)(tileUrl, {
      attribution,
      maxZoom: MAP_CONFIG.maxZoom,
      minZoom: MAP_CONFIG.minZoom,
      subdomains: isStreet || useMapbox ? 'abcd' : 'abc',
      tileSize: useMapbox ? 256 : 256,
    });

    newLayer.addTo(map);
    activeTileLayerRef.current = newLayer;
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Remove old instance if exists to prevent "Map container is already initialized"
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (e) {
        console.warn('Error removing map instance:', e);
      }
      mapInstanceRef.current = null;
    }

    // Clean any residual Leaflet ID on the DOM node
    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    const initialCenter = currentLocation
      ? [currentLocation.latitude, currentLocation.longitude]
      : [MAP_CONFIG.center.lat, MAP_CONFIG.center.lng];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter as L.LatLngExpression,
      zoom: isFull ? MAP_CONFIG.zoom : MAP_CONFIG.zoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      zoomControl: false,
      dragging: interactive,
      touchZoom: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      attributionControl: isFull,
    });

    map.on('click', (event: L.LeafletMouseEvent) => {
      const { lat, lng } = event.latlng;
      const popupHtml = `
        <div style="font-family: sans-serif; padding: 4px; min-width: 170px;">
          <b style="color: #1d4ed8; font-size: 13px;">📍 Maitidevi / Dillibazar Area</b><br/>
          <div style="font-size: 11px; color: #374151; margin-top: 4px; line-height: 1.5;">
            <span>Latitude: ${lat.toFixed(5)}</span><br/>
            <span>Longitude: ${lng.toFixed(5)}</span>
          </div>
        </div>
      `;

      L.popup({ closeButton: true, autoClose: true })
        .setLatLng([lat, lng])
        .setContent(popupHtml)
        .openOn(map);
    });

    applyTileLayer(map, mapType);

    zonesLayerGroupRef.current = L.layerGroup().addTo(map);
    pointsLayerGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Handle container resize & invalidation
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    // Invalidate size immediately and after short delays so tiles load reliably
    requestAnimationFrame(() => {
      map.invalidateSize();
    });
    const t1 = setTimeout(() => map.invalidateSize(), 80);
    const t2 = setTimeout(() => map.invalidateSize(), 250);
    const t3 = setTimeout(() => map.invalidateSize(), 600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
      }
      if (mapContainerRef.current && (mapContainerRef.current as any)._leaflet_id) {
        delete (mapContainerRef.current as any)._leaflet_id;
      }
    };
  }, []);

  // Switch Layer when mapType changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      applyTileLayer(mapInstanceRef.current, mapType);
    }
  }, [mapType, applyTileLayer]);

  // Update Citizen Marker & Accuracy Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentLocation) {
      const latlng: L.LatLngExpression = [currentLocation.latitude, currentLocation.longitude];

      if (!hasCenteredOnUserRef.current) {
        hasCenteredOnUserRef.current = true;
        map.flyTo(latlng, Math.max(MAP_CONFIG.zoom, 16), { duration: 0.8 });
      }

      if (!userMarkerRef.current) {
        const marker = L.marker(latlng, {
          icon: createCitizenMarkerIcon(currentLocation.accuracy),
          zIndexOffset: 1000,
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px; min-width: 170px;">
            <b style="color: #1d4ed8; font-size: 13px;">📍 तपाईंको स्थान (Your Location)</b><br/>
            <div style="font-size: 11px; color: #374151; margin-top: 4px; line-height: 1.4;">
              <span>अक्षांश: ${currentLocation.latitude.toFixed(5)}</span><br/>
              <span>देशान्तर: ${currentLocation.longitude.toFixed(5)}</span><br/>
              <span style="color: #059669; font-weight: bold;">
                जीपीएस शुद्धता: ~${currentLocation.accuracy} मिटर
              </span>
            </div>
          </div>
        `);
        userMarkerRef.current = marker;
      } else {
        userMarkerRef.current.setLatLng(latlng);
      }

      // Accuracy radius circle
      if (!accuracyCircleRef.current) {
        const circle = L.circle(latlng, {
          radius: currentLocation.accuracy || 15,
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.16,
          weight: 1.5,
        }).addTo(map);
        accuracyCircleRef.current = circle;
      } else {
        accuracyCircleRef.current.setLatLng(latlng);
        accuracyCircleRef.current.setRadius(currentLocation.accuracy || 15);
      }
    }
  }, [currentLocation]);

  // Update Flood Zones
  useEffect(() => {
    const group = zonesLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (filterType === 'SAFE_ZONE' || filterType === 'MEDICAL_POST') {
      return; // Filter out zones if specific point types are selected
    }

    zones.forEach((zone) => {
      const circle = L.circle(zone.center, {
        radius: zone.radius,
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: zone.severity === 'SEVERE' ? 0.28 : zone.severity === 'WARNING' ? 0.2 : 0.15,
        weight: zone.severity === 'SEVERE' ? 2.5 : 1.5,
        dashArray: zone.severity === 'WARNING' ? '5, 5' : undefined,
      });

      circle.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; max-width: 220px;">
          <b style="color: ${zone.color}; font-size: 13px;">
            ${zone.severity === 'SEVERE' ? '🔴 गम्भीर बाढी क्षेत्र (Severe Flood)' : zone.severity === 'WARNING' ? '🟠 जोखिमयुक्त क्षेत्र (Warning)' : '🟢 सुरक्षित भूभाग (Safe Zone)'}
          </b><br/>
          <strong style="font-size: 12px; color: #111827;">${zone.nameNe}</strong> (${zone.name})<br/>
          <p style="margin-top: 4px; color: #4b5563; font-size: 11px;">${zone.descriptionNe}</p>
        </div>
      `);
      group.addLayer(circle);
    });
  }, [zones, filterType]);

  // Update Emergency Safe Points
  useEffect(() => {
    const group = pointsLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    const filteredPoints = points.filter((p) => {
      if (filterType === 'ALL') return true;
      if (filterType === 'SAFE_ZONE') return p.type === 'SAFE_ZONE' || p.type === 'RELIEF_POINT';
      if (filterType === 'MEDICAL_POST') return p.type === 'MEDICAL_POST';
      return true;
    });

    filteredPoints.forEach((point) => {
      const marker = L.marker([point.lat, point.lng], {
        icon: createSafePointIcon(point.type),
      });

      marker.on('click', () => {
        setSelectedPoint(point);
      });

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; max-width: 230px;">
          <b style="color: #047857; font-size: 13px;">
            ${point.type === 'SAFE_ZONE' ? '🛡️ आधिकारिक सुरक्षित आश्रय (Safe Zone)' : point.type === 'MEDICAL_POST' ? '🏥 आकस्मिक स्वास्थ्य शिविर (Medical)' : '📦 राहत केन्द्र (Relief Point)'}
          </b><br/>
          <strong style="font-size: 12px; color: #111827; display: block; margin-top: 2px;">${point.nameNe}</strong>
          <span style="font-size: 11px; color: #4b5563;">${point.descriptionNe}</span><br/>
          ${point.capacity ? `<span style="font-size: 11px; color: #047857; display: block; margin-top: 2px;">👥 क्षमता: ${point.capacity} जना</span>` : ''}
          ${point.contact ? `<a href="tel:${point.contact}" style="font-size: 11px; color: #1d4ed8; font-weight: bold; display: inline-block; margin-top: 4px; text-decoration: underline;">📞 सम्पर्क: ${point.contact}</a>` : ''}
        </div>
      `);
      group.addLayer(marker);
    });
  }, [points, filterType]);

  // Center on citizen's location
  const handleCenterOnUser = async () => {
    const loc = await onRequestLocation();
    if (mapInstanceRef.current && loc) {
      mapInstanceRef.current.flyTo([loc.latitude, loc.longitude], Math.max(MAP_CONFIG.zoom, 16), {
        duration: 0.8,
      });
    }
  };

  // Center on test area
  const handleCenterTestArea = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(
        [MAP_CONFIG.center.lat, MAP_CONFIG.center.lng],
        MAP_CONFIG.zoom,
        { duration: 0.8 }
      );
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  // Fly to nearest safe point
  const handleFlyToNearestSafePoint = () => {
    if (mapInstanceRef.current && nearestSafePoint) {
      mapInstanceRef.current.flyTo(
        [nearestSafePoint.point.lat, nearestSafePoint.point.lng],
        16,
        { duration: 0.8 }
      );
      setSelectedPoint(nearestSafePoint.point);
    }
  };

  // Download Offline Map
  const handleDownloadOfflineMap = async () => {
    setDownloading(true);
    try {
      const res = await offlineService.downloadOfflineMapArea((current, total, message) => {
        setDownloadProgress({ current, total, message });
      });
      const count = await offlineService.getCachedTileCount();
      setCachedTileCount(count);
      setDownloadProgress({
        current: res.downloaded,
        total: res.total,
        message: 'अफलाइन नक्सा सुरक्षित भयो (Map Cached)',
      });
      setTimeout(() => setDownloadProgress(null), 4000);
    } catch (e: any) {
      console.warn('Offline download error:', e);
      setDownloadProgress({
        current: 0,
        total: 0,
        message: 'नक्सा डाउनलोडमा समस्या आयो। कृपया पुनः प्रयास गर्नुहोस्।',
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      id="location-map-root"
      className={`relative z-0 isolate w-full overflow-hidden bg-stone-100 flex flex-col ${
        isFull ? 'h-full flex-1 min-h-0 border border-stone-200 shadow-inner shadow-stone-200/70' : 'rounded-2xl border border-stone-300 shadow-xs'
      }`}
      style={isFull ? { height: '100%', width: '100%' } : undefined}
    >
      {/* Map Canvas Container */}
      <div
        id="location-map-canvas-container"
        className={`relative w-full overflow-hidden flex-1 min-h-0 flex flex-col ${
          isFull ? 'h-full min-h-[350px]' : ''
        }`}
        style={isFull ? { height: '100%', width: '100%', minHeight: '350px' } : undefined}
      >
        <div
          id="leaflet-map-element"
          ref={mapContainerRef}
          style={{
            height: '100%',
            width: '100%',
            minHeight: isFull ? '350px' : '230px',
          }}
          className={
            className
              ? className
              : isFull
              ? 'w-full h-full min-h-[350px]'
              : 'h-[230px] sm:h-[260px] w-full'
          }
        />

        {/* Top Floating Controls Bar */}
        {locationWarning && (
          <div className="absolute top-12 left-2.5 right-2.5 z-[1000] pointer-events-none flex justify-center">
            <div className="pointer-events-auto bg-amber-500/95 text-stone-950 px-2.5 py-1 rounded-full text-[10px] font-bold border border-amber-300 shadow-md flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" />
              <span>{locationWarning}</span>
            </div>
          </div>
        )}

        <div className="absolute top-2.5 left-2.5 right-2.5 z-[1000] flex items-center justify-between pointer-events-none">
          {/* GPS Status Indicator */}
          {currentLocation ? (
            <div
              id="location-accuracy-pill"
              className="pointer-events-auto bg-stone-950/80 backdrop-blur-md text-stone-100 px-2.5 py-1 rounded-full text-[10px] font-mono border border-stone-700 shadow-md flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>~{currentLocation.accuracy}m GPS</span>
              {currentLocation.isSimulated && (
                <span className="bg-amber-500/25 text-amber-200 text-[8px] px-1 rounded uppercase font-bold">
                  Demo
                </span>
              )}
            </div>
          ) : (
            <div className="pointer-events-auto bg-stone-950/80 text-stone-300 px-2.5 py-1 rounded-full text-[10px] flex items-center gap-1.5 border border-stone-700 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>GPS खोजी...</span>
            </div>
          )}

          {/* Layer Switcher & Expand Button */}
          <div className="pointer-events-auto flex items-center gap-1.5">
            <div className="bg-white/95 backdrop-blur-md rounded-lg p-0.5 border border-stone-300 shadow-sm flex items-center text-xs">
              <button
                type="button"
                id="btn-layer-street"
                onClick={() => setMapType('street')}
                className={`px-2 py-0.5 rounded-md font-medium text-[10px] transition-all flex items-center gap-1 ${
                  mapType === 'street'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-stone-700 hover:text-stone-900'
                }`}
              >
                <MapIcon className="w-3 h-3" />
                <span>नक्सा</span>
              </button>
              <button
                type="button"
                id="btn-layer-satellite"
                onClick={() => setMapType('satellite')}
                className={`px-2 py-0.5 rounded-md font-medium text-[10px] transition-all flex items-center gap-1 ${
                  mapType === 'satellite'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-stone-700 hover:text-stone-900'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>स्याटेलाइट</span>
              </button>
              {mapboxEnabled && (
                <button
                  type="button"
                  id="btn-layer-mapbox"
                  onClick={() => setMapType('mapbox')}
                  className={`px-2 py-0.5 rounded-md font-medium text-[10px] transition-all flex items-center gap-1 ${
                    mapType === 'mapbox'
                      ? 'bg-violet-600 text-white shadow-xs font-bold'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                >
                  <Navigation className="w-3 h-3" />
                  <span>Mapbox</span>
                </button>
              )}
            </div>

            {showExpandButton && onOpenFullMap && (
              <button
                type="button"
                id="btn-expand-to-full-map"
                onClick={onOpenFullMap}
                title="Open Full Map"
                className="bg-white/95 hover:bg-stone-50 text-stone-800 p-1.5 rounded-lg border border-stone-300 shadow-sm transition-colors flex items-center justify-center cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-stone-700" />
              </button>
            )}
          </div>
        </div>

        {/* Right Floating Map Action Controls (Clean, unified column) */}
        <div className="absolute bottom-4 right-2.5 z-[1000] flex flex-col gap-1.5">
          {/* Zoom In & Out */}
          <div className="bg-white/95 backdrop-blur-md rounded-xl border border-stone-300 shadow-md flex flex-col overflow-hidden">
            <button
              id="btn-map-zoom-in"
              onClick={handleZoomIn}
              title="Zoom In"
              className="p-2 hover:bg-stone-100 text-stone-700 border-b border-stone-200 transition-colors flex items-center justify-center cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              id="btn-map-zoom-out"
              onClick={handleZoomOut}
              title="Zoom Out"
              className="p-2 hover:bg-stone-100 text-stone-700 transition-colors flex items-center justify-center cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            {/* Locate Me */}
            <button
              id="btn-map-locate-me"
              onClick={handleCenterOnUser}
              title="मेरो स्थान (My Location)"
              className="bg-white hover:bg-stone-50 text-blue-600 p-2.5 rounded-xl shadow-md border border-stone-300 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            >
              <Locate className="w-4 h-4" />
            </button>

            {/* Reset Area */}
            <button
              id="btn-map-reset-area"
              onClick={handleCenterTestArea}
              title="बाढी क्षेत्र (Center Flood Corridor)"
              className="bg-white hover:bg-stone-50 text-stone-700 p-2.5 rounded-xl shadow-md border border-stone-300 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            >
              <Compass className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Selected Point Bottom Sheet (Only in Full Map mode when user taps a marker) */}
        {isFull && selectedPoint && (
          <div className="absolute bottom-20 left-3 right-3 z-[1001] max-w-sm mx-auto bg-white rounded-2xl shadow-2xl border border-stone-300 p-3.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-base">
                  {selectedPoint.type === 'SAFE_ZONE'
                    ? '🛡️'
                    : selectedPoint.type === 'MEDICAL_POST'
                    ? '🏥'
                    : '📦'}
                </span>
                <div>
                  <div className="text-[10px] font-bold uppercase text-stone-500 tracking-wider">
                    {selectedPoint.type === 'SAFE_ZONE'
                      ? 'सुरक्षित आश्रय स्थल'
                      : selectedPoint.type === 'MEDICAL_POST'
                      ? 'स्वास्थ्य शिविर'
                      : 'राहत केन्द्र'}
                  </div>
                  <h4 className="text-sm font-bold text-stone-900 leading-tight">
                    {selectedPoint.nameNe}
                  </h4>
                </div>
              </div>
              <button
                onClick={() => setSelectedPoint(null)}
                className="text-stone-400 hover:text-stone-700 p-1 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              {selectedPoint.descriptionNe}
            </p>

            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-stone-100 text-xs">
              {selectedPoint.capacity && (
                <span className="text-emerald-700 font-semibold">
                  👥 क्षमता: {selectedPoint.capacity} जना
                </span>
              )}
              {selectedPoint.contact && (
                <a
                  href={`tel:${selectedPoint.contact}`}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-lg flex items-center gap-1 shadow-xs transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{selectedPoint.contact}</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Offline Cache Notice (Full Map Mode only) */}
        {isFull && (
          <div className="absolute top-12 left-2.5 z-[1000]">
            <button
              onClick={() => setShowOfflinePanel(!showOfflinePanel)}
              className="bg-stone-900/90 backdrop-blur-md text-stone-200 px-2.5 py-1 rounded-lg text-[10px] font-medium border border-stone-700 shadow-sm flex items-center gap-1.5 hover:bg-stone-900 transition-colors"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              <span>{cachedTileCount > 0 ? `अफलाइन सुरक्षित (${cachedTileCount})` : 'अफलाइन डाउनलोड'}</span>
            </button>

            {showOfflinePanel && (
              <div className="mt-1 bg-stone-950 text-stone-100 p-3 rounded-xl shadow-xl border border-stone-800 text-xs w-64 animate-in fade-in duration-150">
                <div className="font-bold text-stone-200 mb-1">आपतकालीन अफलाइन नक्सा</div>
                <p className="text-[11px] text-stone-400 mb-2 leading-relaxed">
                  इन्टरनेट वा मोबाइल टावर नहुँदा पनि नक्सा हेर्न सकिने गरी टाइलहरू फोनमा सुरक्षित गर्नुहोस्।
                </p>
                <button
                  onClick={handleDownloadOfflineMap}
                  disabled={downloading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-1.5 px-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className={`w-3.5 h-3.5 ${downloading ? 'animate-bounce' : ''}`} />
                  <span>{downloading ? 'सेभ हुँदैछ...' : 'नक्सा डाउनलोड गर्नुहोस्'}</span>
                </button>

                {downloadProgress && (
                  <div className="mt-2 text-[10px] font-mono text-stone-300">
                    <div>{downloadProgress.message}</div>
                    {downloadProgress.total > 0 && (
                      <div className="w-full bg-stone-800 rounded-full h-1 mt-1 overflow-hidden">
                        <div
                          className="bg-emerald-400 h-1"
                          style={{
                            width: `${(downloadProgress.current / downloadProgress.total) * 100}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
