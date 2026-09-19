import { CitizenLocation } from '../types/location';
import { MAP_CONFIG } from '../config/mapConfig';

// Default demo location in Balkhu/Bagmati flood plain
export const DEMO_LOCATION: CitizenLocation = {
  latitude: 27.6882,
  longitude: 85.3015,
  accuracy: 12,
  timestamp: Date.now(),
  isSimulated: true,
};

class LocationService {
  private currentLocation: CitizenLocation | null = null;
  private watchId: number | null = null;
  private listeners: ((loc: CitizenLocation) => void)[] = [];

  constructor() {
    // Check if previously stored location exists
    const cached = localStorage.getItem('last_known_citizen_location');
    if (cached) {
      try {
        this.currentLocation = JSON.parse(cached);
      } catch {
        // ignore
      }
    }
  }

  public getCurrentLocation(): CitizenLocation | null {
    return this.currentLocation;
  }

  public async requestLocation(useSimulation = false): Promise<CitizenLocation> {
    if (useSimulation) {
      this.currentLocation = {
        ...DEMO_LOCATION,
        timestamp: Date.now(),
      };
      this.notifyListeners(this.currentLocation);
      return this.currentLocation;
    }

    if (!navigator.geolocation) {
      console.warn('Geolocation not supported by browser, using test area coordinates');
      this.currentLocation = { ...DEMO_LOCATION, timestamp: Date.now() };
      return this.currentLocation;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: CitizenLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy),
            timestamp: position.timestamp || Date.now(),
            isSimulated: false,
          };
          this.currentLocation = loc;
          try {
            localStorage.setItem('last_known_citizen_location', JSON.stringify(loc));
          } catch {
            // ignore
          }
          this.notifyListeners(loc);
          resolve(loc);
        },
        (error) => {
          console.warn('GPS Error or Permission Denied:', error.message);
          // Fall back gracefully to the test area center so citizen is never left without map/reporting capability
          const fallback: CitizenLocation = {
            latitude: MAP_CONFIG.center.lat,
            longitude: MAP_CONFIG.center.lng,
            accuracy: 25,
            timestamp: Date.now(),
            isSimulated: true,
          };
          this.currentLocation = fallback;
          this.notifyListeners(fallback);
          resolve(fallback);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }

  public setSimulatedLocation(lat: number, lng: number, accuracy = 10): CitizenLocation {
    const loc: CitizenLocation = {
      latitude: lat,
      longitude: lng,
      accuracy,
      timestamp: Date.now(),
      isSimulated: true,
    };
    this.currentLocation = loc;
    this.notifyListeners(loc);
    return loc;
  }

  public subscribe(listener: (loc: CitizenLocation) => void): () => void {
    this.listeners.push(listener);
    if (this.currentLocation) {
      listener(this.currentLocation);
    }
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(loc: CitizenLocation) {
    this.listeners.forEach((listener) => listener(loc));
  }
}

export const locationService = new LocationService();
