/** Same radius the database enforces in join_queue(). */
export const GEOFENCE_M = 500;

export interface LatLng { lat: number; lng: number }

/** Haversine distance in metres. Mirrors public.haversine_m() in 0001_init.sql. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type GeoVerdict = "inside" | "outside" | "no-unit-coords" | "no-fix";

/** Client-side preview of what the server will decide (the server stays authoritative). */
export function geofenceVerdict(unit: { lat: number | null; lng: number | null }, me: LatLng | null): GeoVerdict {
  if (unit.lat == null || unit.lng == null) return "no-unit-coords";
  if (!me) return "no-fix";
  return distanceMeters({ lat: unit.lat, lng: unit.lng }, me) <= GEOFENCE_M ? "inside" : "outside";
}

export interface GeoFix extends LatLng { accuracy: number }
export type GeoErrorKind = "denied" | "unavailable" | "timeout" | "unsupported";

export class GeoError extends Error {
  kind: GeoErrorKind;
  constructor(kind: GeoErrorKind) { super(kind); this.kind = kind; }
}

/** Promise wrapper around the Geolocation API. Never throws raw browser errors. */
export function getCurrentFix(timeoutMs = 10000): Promise<GeoFix> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return reject(new GeoError("unsupported"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => reject(new GeoError(e.code === 1 ? "denied" : e.code === 3 ? "timeout" : "unavailable")),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 15000 },
    );
  });
}
