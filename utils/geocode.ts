/**
 * Address to map coordinates, free and with no API key (Snapp's default geocoder). Use it whenever the app saves a
 * place, event, store or anything else with an address that goes on a map: never invent coordinates.
 *
 *   const spot = await geocodeAddress('8554 Northwest Dr, Southaven, MS', { near: { latitude: 34.99, longitude: -90.01 } });
 *   if (spot) save({ ...place, latitude: spot.latitude, longitude: spot.longitude });
 *
 * Tried in order, the first precise answer wins:
 *   1. US addresses: the US Census geocoder, which places the house number along its street. It does not allow
 *      browser calls, so in the web preview this step quietly gives way to the next.
 *   2. Photon (https://photon.komoot.io, OpenStreetMap data, worldwide) by the address, kept only when it found the
 *      house or a named place, not just a street or a city.
 *   3. Photon by the place's name (`placeName`, e.g. "Landers Center"), kept only when a place of that name is found.
 *
 * `near` biases results towards the app's area and, with `withinKm` (default 50), drops matches farther away (a street
 * name that also exists in another city). Returns null when nothing is precise enough: keep the old coordinates, or ask
 * the user to pick the spot on the map.
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface GeocodeOptions {
  near?: GeoPoint;
  withinKm?: number;
  placeName?: string;
  /** Result language for Photon: 'en', 'de', 'fr' or 'it' (others use local names). */
  language?: string;
}

const distanceKm = (a: GeoPoint, b: GeoPoint) => {
  const r = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(r(b.latitude - a.latitude) / 2) ** 2 + Math.cos(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.sin(r(b.longitude - a.longitude) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

const sameName = (a: string, b: string) => {
  const clean = (text: string) => text.toLowerCase().replace(/[^a-z0-9\u00C0-\u024F\u0400-\u04FF ]/g, ' ').replace(/\s+/g, ' ').trim();
  const x = clean(a);
  const y = clean(b);
  return !!x && !!y && (x === y || x.startsWith(`${y} `) || y.startsWith(`${x} `));
};

const looksUS = (address: string) => /\b(USA|United States)\b|\b[A-Z]{2}\s+\d{5}(-\d{4})?\b|,\s*[A-Z]{2}\s*$/.test(address);

const getJson = async (url: string) => {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

const census = async (address: string): Promise<GeoPoint | null> => {
  const data = await getJson(
    'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress' +
      `?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`
  );
  const c = data?.result?.addressMatches?.[0]?.coordinates;
  return c && typeof c.y === 'number' && typeof c.x === 'number' ? { latitude: c.y, longitude: c.x } : null;
};

const photon = async (query: string, options: GeocodeOptions, accept: (properties: any) => boolean): Promise<GeoPoint | null> => {
  const bias = options.near ? `&lat=${options.near.latitude}&lon=${options.near.longitude}` : '';
  const lang = options.language && ['en', 'de', 'fr', 'it'].includes(options.language) ? `&lang=${options.language}` : '';
  const data = await getJson(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5${bias}${lang}`);
  for (const feature of data?.features || []) {
    const [longitude, latitude] = feature?.geometry?.coordinates || [];
    if (typeof latitude !== 'number' || typeof longitude !== 'number') continue;
    if (accept(feature.properties || {})) return { latitude, longitude };
  }
  return null;
};

export const geocodeAddress = async (address: string, options: GeocodeOptions = {}): Promise<GeoPoint | null> => {
  const text = String(address || '').trim();
  const name = String(options.placeName || '').trim();
  const near = options.near;
  const close = (p: GeoPoint | null) => (p && (!near || distanceKm(near, p) <= (options.withinKm ?? 50)) ? p : null);

  if (text && /^\d/.test(text) && looksUS(text)) {
    const spot = close(await census(text).catch(() => null));
    if (spot) return spot;
  }
  if (text) {
    const number = (text.match(/^\d+[a-z]?\b/i) || [])[0];
    const spot = close(
      await photon(text, options, (p) =>
        p.osm_key !== 'highway' && p.type !== 'city' && p.type !== 'county' && p.type !== 'state' && p.type !== 'country' &&
        (number ? String(p.housenumber || '') === number || (!!name && sameName(String(p.name || ''), name)) : p.type === 'house')
      ).catch(() => null)
    );
    if (spot) return spot;
  }
  if (name) {
    const spot = close(await photon(name, options, (p) => p.osm_key !== 'highway' && sameName(String(p.name || ''), name)).catch(() => null));
    if (spot) return spot;
  }
  return null;
};

export default geocodeAddress;
