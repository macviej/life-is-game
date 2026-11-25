export interface MapLibreGL {
  Map: new (options: Record<string, unknown>) => MapLibreMapInstance;
  Marker: new (options?: Record<string, unknown>) => MapLibreMarkerInstance;
}

export interface MapLibreMapInstance {
  on: (event: string, cb: (e: { lngLat: { lat: number; lng: number } }) => void) => void;
  flyTo: (options: { center: [number, number]; zoom?: number; duration?: number }) => void;
  zoomIn: (options?: { duration?: number }) => void;
  zoomOut: (options?: { duration?: number }) => void;
  getZoom: () => number;
  remove: () => void;
}

export interface MapLibreMarkerInstance {
  setLngLat: (lngLat: [number, number]) => MapLibreMarkerInstance;
  addTo: (map: MapLibreMapInstance) => MapLibreMarkerInstance;
  remove: () => void;
  getElement: () => HTMLElement;
}

let loadPromise: Promise<MapLibreGL> | null = null;

export function loadMapLibre(): Promise<MapLibreGL> {
  const win = window as unknown as { maplibregl?: MapLibreGL };
  if (win.maplibregl) {
    return Promise.resolve(win.maplibregl);
  }
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    if (!document.getElementById('maplibre-gl-css')) {
      const link = document.createElement('link');
      link.id = 'maplibre-gl-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
    script.async = true;
    script.onload = () => {
      if (win.maplibregl) {
        resolve(win.maplibregl);
      } else {
        reject(new Error('MapLibre GL failed to initialize'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load MapLibre GL script'));
    document.head.appendChild(script);
  });

  return loadPromise;
}

export const GTA_MAP_STYLE = {
  version: 8,
  name: 'Solis GTA Radar',
  sources: {
    openmaptiles: {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#111318',
      },
    },
    {
      id: 'landuse-park',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'park',
      paint: {
        'fill-color': '#151B19',
      },
    },
    {
      id: 'water',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: {
        'fill-color': '#0A1522',
      },
    },
    {
      id: 'waterway',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'waterway',
      paint: {
        'line-color': '#0D1C2E',
        'line-width': 1.5,
      },
    },
    {
      id: 'building',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 13,
      paint: {
        'fill-color': '#1A1D24',
        'fill-outline-color': '#222631',
      },
    },
    {
      id: 'road-minor',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'minor', 'service', 'track', 'path'],
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#272B36',
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.5, 14, 1.5, 17, 4],
      },
    },
    {
      id: 'road-secondary',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'secondary', 'tertiary'],
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#3C4252',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 14, 2.8, 17, 6.5],
      },
    },
    {
      id: 'road-primary',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'primary', 'trunk'],
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#626A80',
        'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1, 14, 4, 17, 8.5],
      },
    },
    {
      id: 'road-motorway',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['==', 'class', 'motorway'],
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#8A92A8',
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.2, 14, 5, 17, 10],
      },
    },
  ],
};
