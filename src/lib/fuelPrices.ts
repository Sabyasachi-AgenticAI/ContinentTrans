export interface FuelPriceStation {
  id: number;
  name: string;
  brand: string;
  address: string;
  fuel_type: string;
  price: number;
  currency: string;
  distance_km: number;
  updated_at: string;
  lat: number;
  lng: number;
}

interface FuelPricesResponse {
  attribution: string;
  stations: FuelPriceStation[];
}

/** Real, live EU fuel prices via our server-side nakordoni.eu proxy. */
export async function fetchNearbyFuelPrices(
  lat: number,
  lng: number,
): Promise<FuelPricesResponse | null> {
  try {
    const res = await fetch(`/api/fuel-prices?lat=${lat}&lon=${lng}`);
    if (!res.ok) return null;
    return (await res.json()) as FuelPricesResponse;
  } catch {
    return null;
  }
}
