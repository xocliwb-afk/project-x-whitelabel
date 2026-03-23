export type GeocodeResult = { bbox: string; displayName?: string; center?: any };

export async function geocodeLocation(query: string): Promise<GeocodeResult | null> {
  const q = (query || '').trim();
  if (!q) return null;

  try {
    const resp = await fetch('/api/geo/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q }),
    });

    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json?.ok || !json.result?.bbox) {
      return null;
    }
    return json.result as GeocodeResult;
  } catch {
    return null;
  }
}
