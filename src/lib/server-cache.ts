
interface CacheData {
    allEvents: Map<string, any>;
    lastFirestoreFetch: string | null;
    lastSyncStatus: any | null;
}

// Map to store event sets for different terms/ranges if necessary, 
// but for simplicity and common usage, we'll cache the main data set.
let globalCache: CacheData = {
    allEvents: new Map(),
    lastFirestoreFetch: null,
    lastSyncStatus: null,
};

export const ServerCache = {
    getEvents: () => Array.from(globalCache.allEvents.values()),

    getEventCount: () => globalCache.allEvents.size,

    getLastFetch: () => globalCache.lastFirestoreFetch,

    setLastFetch: (timestamp: string) => {
        globalCache.lastFirestoreFetch = timestamp;
    },

    setSyncStatus: (status: any) => {
        globalCache.lastSyncStatus = status;
    },

    getSyncStatus: () => globalCache.lastSyncStatus,

    updateEvents: (events: any[]) => {
        events.forEach(event => {
            const existing = globalCache.allEvents.get(event.id);
            if (existing) {
                // Merge to ensure we keep all milestone dates (applied_at, accepted_at, etc.)
                globalCache.allEvents.set(event.id, { ...existing, ...event });
            } else {
                globalCache.allEvents.set(event.id, event);
            }
        });
    },

    clearEvents: () => {
        globalCache.allEvents.clear();
        globalCache.lastFirestoreFetch = null;
    }
};
