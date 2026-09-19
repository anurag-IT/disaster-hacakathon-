import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Database } from 'lucide-react';
import { offlineService } from '../services/offlineService';
import { emergencyService } from '../services/emergencyService';
import { QueuedOfflineReport } from '../types/emergency';

interface OfflineIndicatorProps {
  onSyncComplete?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ onSyncComplete }) => {
  const [isOnline, setIsOnline] = useState<boolean>(offlineService.isOnline());
  const [queuedReports, setQueuedReports] = useState<QueuedOfflineReport[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const refreshQueue = () => {
    const list = offlineService.getQueuedReports();
    setQueuedReports(list.filter((r) => r.status === 'WAITING_FOR_CONNECTION'));
  };

  useEffect(() => {
    const unsub = offlineService.onNetworkChange((online) => {
      setIsOnline(online);
      if (online) {
        handleAutoSync();
      }
    });

    refreshQueue();
    const interval = setInterval(refreshQueue, 3000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const handleAutoSync = async () => {
    if (!offlineService.isOnline()) return;
    const queue = offlineService.getQueuedReports().filter((r) => r.status === 'WAITING_FOR_CONNECTION');
    if (queue.length === 0) return;

    setIsSyncing(true);
    setSyncMessage('Emergency report waiting to sync...');
    try {
      const res = await emergencyService.syncOfflineReports();
      if (res.synced > 0) {
        setSyncMessage('Emergency report sent. सिङ्क सम्पन्न!');
        setTimeout(() => setSyncMessage(null), 4000);
        refreshQueue();
        onSyncComplete?.();
      }
    } catch (e) {
      console.warn('Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleOfflineSimulation = () => {
    const currentlySim = offlineService.getSimulatedOffline();
    offlineService.setSimulatedOffline(!currentlySim);
    setIsOnline(offlineService.isOnline());
  };

  return (
    <div id="offline-indicator-bar" className="w-full bg-stone-900 text-stone-200 text-xs px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-stone-800">
      <div className="flex items-center gap-2">
        {isOnline ? (
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <Wifi className="w-3.5 h-3.5" />
            <span>अनलाइन (Online)</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-amber-400 font-semibold animate-pulse">
            <WifiOff className="w-3.5 h-3.5" />
            <span>अफलाइन मोड (Offline Mode)</span>
          </span>
        )}

        {queuedReports.length > 0 && (
          <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-1 font-mono">
            <Database className="w-3 h-3" />
            {queuedReports.length} {queuedReports.length === 1 ? 'रिपोर्ट बाँकी (Queued)' : 'रिपोर्टहरू बाँकी (Queued)'}
          </span>
        )}

        {syncMessage && (
          <span className="text-amber-200 font-medium animate-pulse">
            {syncMessage}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isOnline && queuedReports.length > 0 && (
          <button
            id="btn-sync-offline-queue"
            onClick={handleAutoSync}
            disabled={isSyncing}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>सिङ्क गर्नुहोस् (Sync)</span>
          </button>
        )}

        {/* Demo Mode Network Disconnect Simulator */}
        <button
          id="btn-toggle-demo-offline"
          onClick={toggleOfflineSimulation}
          title="Demo simulation toggle for hackathon testing"
          className={`px-2 py-0.5 rounded text-[10px] tracking-wide uppercase font-mono font-bold transition-all ${
            offlineService.getSimulatedOffline()
              ? 'bg-amber-500 text-stone-950 ring-1 ring-amber-300'
              : 'bg-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-700'
          }`}
        >
          {offlineService.getSimulatedOffline() ? 'SIMULATING OFFLINE ⚡' : 'Simulate Offline'}
        </button>
      </div>
    </div>
  );
};
