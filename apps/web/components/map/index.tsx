'use client';

import dynamic from 'next/dynamic';

// Mapbox-only map (SSR disabled); Leaflet implementation removed.
const Map = dynamic(() => import('./mapbox/MapboxMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
      Loading Map...
    </div>
  ),
});

export default Map;
