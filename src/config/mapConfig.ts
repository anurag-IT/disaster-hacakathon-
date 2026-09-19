/**
 * Configurable Map Settings for Flood Emergency App
 * Focused local response area: Maitidevi / Dillibazar, Kathmandu, Nepal
 */

export const MAP_CONFIG = {
  // Local test area: Maitidevi / Dillibazar road corridor, Kathmandu
  center: {
    lat: 27.7072,
    lng: 85.3365,
  },
  zoom: 16,
  minZoom: 13,
  maxZoom: 19,

  // Narrow neighborhood bounds for the Maitidevi–Dillibazar response area
  bounds: {
    north: 27.7155,
    south: 27.6995,
    east: 85.3465,
    west: 85.3275,
  },

  areaName: 'Maitidevi & Dillibazar Area, Kathmandu',
  areaNameNe: 'मैतिदेवी र दिल्लीबजार क्षेत्र, काठमाडौँ',

  // Free, no-key OpenStreetMap tiles
  tileLayerUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};
