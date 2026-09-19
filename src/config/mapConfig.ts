/**
 * Configurable Map Settings for Flood Emergency App
 * Can be configured for any disaster test zone.
 * Default: Balkhu / Bagmati River flood plain, Kathmandu, Nepal
 */

export const MAP_CONFIG = {
  // Test area: Balkhu / Bagmati River Flood Corridor, Kathmandu, Nepal
  center: {
    lat: 27.6882,
    lng: 85.3015,
  },
  zoom: 14,
  minZoom: 11,
  maxZoom: 18,
  
  // Test area bounding box for offline map tile pre-caching
  bounds: {
    north: 27.7050,
    south: 27.6710,
    east: 85.3200,
    west: 85.2830,
  },
  
  areaName: 'Bagmati & Balkhu Corridor, Kathmandu',
  areaNameNe: 'बागमती र बल्खु करिडोर, काठमाडौँ',

  // Standard OpenStreetMap Tile Layer
  tileLayerUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};
