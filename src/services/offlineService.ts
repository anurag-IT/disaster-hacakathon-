import { QueuedOfflineReport, EmergencyReportPayload } from '../types/emergency';
import { MAP_CONFIG } from '../config/mapConfig';

const QUEUE_STORAGE_KEY = 'citizen_emergency_offline_queue';
const DB_NAME = 'DisasterAppOfflineDB';
const DB_VERSION = 1;
const TILE_STORE = 'map_tiles';

// Lon/Lat to OpenStreetMap tile coordinates
function lon2tile(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function lat2tile(lat: number, zoom: number): number {
  return Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );
}

class OfflineService {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase | null>;
  private isSimulatedOffline = false;
  private onlineListeners: ((isOnline: boolean) => void)[] = [];

  constructor() {
    this.dbPromise = this.initDB();

    // Listen to real browser network changes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  private async initDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return null;
    }

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(TILE_STORE)) {
            db.createObjectStore(TILE_STORE);
          }
        };
        request.onsuccess = () => {
          this.db = request.result;
          resolve(this.db);
        };
        request.onerror = (err) => {
          console.warn('IndexedDB initialization failed:', err);
          resolve(null);
        };
      } catch (e) {
        console.warn('IndexedDB error:', e);
        resolve(null);
      }
    });
  }

  public isOnline(): boolean {
    if (this.isSimulatedOffline) return false;
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  public setSimulatedOffline(offline: boolean) {
    this.isSimulatedOffline = offline;
    this.notifyOnlineListeners(!offline && (navigator?.onLine ?? true));
  }

  public getSimulatedOffline(): boolean {
    return this.isSimulatedOffline;
  }

  public onNetworkChange(listener: (isOnline: boolean) => void): () => void {
    this.onlineListeners.push(listener);
    listener(this.isOnline());
    return () => {
      this.onlineListeners = this.onlineListeners.filter((l) => l !== listener);
    };
  }

  private handleNetworkChange(isOnline: boolean) {
    const effectiveOnline = !this.isSimulatedOffline && isOnline;
    this.notifyOnlineListeners(effectiveOnline);
  }

  private notifyOnlineListeners(isOnline: boolean) {
    this.onlineListeners.forEach((l) => l(isOnline));
  }

  // --- Offline Queue Management ---

  public getQueuedReports(): QueuedOfflineReport[] {
    try {
      const data = localStorage.getItem(QUEUE_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public enqueueReport(payload: EmergencyReportPayload): QueuedOfflineReport {
    const queue = this.getQueuedReports();
    const item: QueuedOfflineReport = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
      payload,
      status: 'WAITING_FOR_CONNECTION',
    };
    queue.push(item);
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    return item;
  }

  public updateQueuedReportStatus(
    id: string,
    status: 'WAITING_FOR_CONNECTION' | 'SYNCED' | 'FAILED',
    syncedIncidentId?: string
  ) {
    const queue = this.getQueuedReports();
    const updated = queue.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          status,
          synced_incident_id: syncedIncidentId || item.synced_incident_id,
        };
      }
      return item;
    });
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updated));
  }

  public clearSyncedReports() {
    const queue = this.getQueuedReports();
    const remaining = queue.filter((item) => item.status !== 'SYNCED');
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remaining));
  }

  // --- Offline Tile Management ---

  public async getCachedTile(key: string): Promise<string | null> {
    const db = this.db || (await this.dbPromise);
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(TILE_STORE, 'readonly');
        const store = tx.objectStore(TILE_STORE);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  public async storeTile(key: string, dataUrl: string): Promise<void> {
    const db = this.db || (await this.dbPromise);
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(TILE_STORE, 'readwrite');
        const store = tx.objectStore(TILE_STORE);
        store.put(dataUrl, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async getCachedTileCount(): Promise<number> {
    const db = this.db || (await this.dbPromise);
    if (!db) return 0;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(TILE_STORE, 'readonly');
        const store = tx.objectStore(TILE_STORE);
        const countReq = store.count();
        countReq.onsuccess = () => resolve(countReq.result);
        countReq.onerror = () => resolve(0);
      } catch {
        resolve(0);
      }
    });
  }

  /**
   * Pre-download map tiles for the configured small test area in Nepal.
   * Zoom levels 13 and 14 provide high coverage with minimal storage.
   */
  public async downloadOfflineMapArea(
    onProgress: (current: number, total: number, message: string) => void
  ): Promise<{ downloaded: number; total: number }> {
    const db = this.db || (await this.dbPromise);
    if (!db) {
      throw new Error('IndexedDB storage not available for offline map caching');
    }

    const { bounds } = MAP_CONFIG;
    const zooms = [13, 14, 15];
    const tileCoords: { z: number; x: number; y: number }[] = [];

    for (const z of zooms) {
      const minX = lon2tile(bounds.west, z);
      const maxX = lon2tile(bounds.east, z);
      const minY = lat2tile(bounds.north, z);
      const maxY = lat2tile(bounds.south, z);

      for (let x = Math.min(minX, maxX); x <= Math.max(minX, maxX); x++) {
        for (let y = Math.min(minY, maxY); y <= Math.max(minY, maxY); y++) {
          tileCoords.push({ z, x, y });
        }
      }
    }

    const total = tileCoords.length;
    let downloaded = 0;

    onProgress(0, total, `डाउनलोड सुरु हुँदैछ (${total} टाइलहरू)...`);

    for (const { z, x, y } of tileCoords) {
      const key = `${z}_${x}_${y}`;
      const existing = await this.getCachedTile(key);
      if (existing) {
        downloaded++;
        onProgress(downloaded, total, `टाइल क्यासबाट लोड: ${downloaded}/${total}`);
        continue;
      }

      try {
        const url = `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
        const response = await fetch(url, { mode: 'cors' }).catch(() =>
          fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, { mode: 'cors' })
        );
        if (response && response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();
          await new Promise<void>((resolve) => {
            reader.onloadend = async () => {
              if (typeof reader.result === 'string') {
                await this.storeTile(key, reader.result);
              }
              resolve();
            };
            reader.readAsDataURL(blob);
          });
        }
      } catch (err) {
        console.warn(`Tile download skipped ${key}:`, err);
      }

      downloaded++;
      onProgress(downloaded, total, `डाउनलोड हुँदैछ: ${downloaded}/${total}`);
    }

    localStorage.setItem('offline_map_cached_at', new Date().toISOString());
    localStorage.setItem('offline_map_area_name', MAP_CONFIG.areaName);
    return { downloaded, total };
  }
}

export const offlineService = new OfflineService();
