export type LatLng = [number, number];

export interface FuelStop {
  id: string;
  name: string;
  brand: string;
  position: LatLng;
}

export interface ServicePoint {
  id: string;
  name: string;
  type: "towing" | "garage";
  phone?: string;
  position: LatLng;
  /** Set for OSM-sourced (Overpass) results — real but community-maintained data. */
  source?: "osm";
}

/**
 * capacityTotal/available are set for mock TRAVIS-shaped data (see
 * src/lib/travis.ts) but left undefined for real OSM (Overpass) parking
 * results, which don't carry live occupancy — just a real location.
 */
export interface ParkingSpot {
  id: string;
  name: string;
  position: LatLng;
  capacityTotal?: number;
  available?: number;
  source?: "osm";
}

export type AlertType = "gps_silent" | "near_fuel_stop" | "sos";

export interface TripAlert {
  type: AlertType;
  message: string;
}

export type TruckStatus = "in_transit" | "gps_silent" | "idle";
export type EnrichStatus = "idle" | "loading" | "done" | "error";

/**
 * One row = one truck, combining what used to be split across separate
 * Driver/Trip records — matches the shape of an uploaded Excel row plus the
 * fields the app fills in once you hit "Locate" (see src/lib/enrichTruck.ts).
 */
export interface TruckEntry {
  id: string;
  driverName: string;
  phone: string;
  truckType: string;
  truckPlate: string;
  sourceLabel: string;
  destinationLabel: string;
  notes: string;
  status: TruckStatus;
  showOnMap: boolean;
  alert?: TripAlert;
  /** 0-1 starting position along the route, seeds the live-movement simulation. */
  startProgress: number;
  durationMinutes?: number;
  distanceKm?: number;
  /** Real figure, only present for seed trucks with actual DispatchMaster revenue. */
  revenueEur?: number;
  /** Computed estimate for trucks located via the live pipeline — see enrichTruck.ts. */
  estimatedFuelCostEur?: number;

  sourceCoord?: LatLng;
  destCoord?: LatLng;
  /** Route endpoints (2-3 points) fed to fetchTruckRoute — not itself the rendered path. */
  route?: LatLng[];
  fuelStops: FuelStop[];
  serviceStops: ServicePoint[];
  parkingStops: ParkingSpot[];

  enrichStatus: EnrichStatus;
  enrichError?: string;
}

// Real Continent Trans SRL trucks, pulled from DispatchMaster (Flotă +
// Operațiuni > Istoric) — real plates, models, source/destination text, and
// revenue. Driver names/phone numbers are placeholders — see
// seed-data/continent_trans_sample.xlsx. This is the default fleet shown
// until you upload your own — same data path, not a separate system.
//
// Deliberately NOT pre-located: route/fuel/maintenance/parking stay empty
// until you press "Locate," same as any truck you add or upload yourself —
// one consistent rule, not seed trucks behaving differently from new ones.
export const DEFAULT_TRUCKS: TruckEntry[] = [
  {
    id: "seed-1",
    driverName: "Mihai Constantinescu",
    phone: "+40 745 111 222",
    truckType: "Scania (2022)",
    truckPlate: "SV03CFC",
    sourceLabel: "Berlin, DE",
    destinationLabel: "Turin, IT",
    notes: "",
    status: "in_transit",
    showOnMap: true,
    startProgress: 0.12,
    revenueEur: 2248.25,
    fuelStops: [],
    serviceStops: [],
    parkingStops: [],
    enrichStatus: "idle",
  },
  {
    id: "seed-2",
    driverName: "Bogdan Ardelean",
    phone: "+40 745 222 333",
    truckType: "Mercedes Benz 1848 (2026)",
    truckPlate: "SV84CFC",
    sourceLabel: "Turin, IT",
    destinationLabel: "Dortmund, DE",
    notes: "",
    status: "in_transit",
    showOnMap: true,
    startProgress: 0.35,
    revenueEur: 2345.51,
    fuelStops: [],
    serviceStops: [],
    parkingStops: [],
    enrichStatus: "idle",
  },
  {
    id: "seed-3",
    driverName: "Cristian Moraru",
    phone: "+40 745 333 444",
    truckType: "MAN 480 (2016)",
    truckPlate: "SV19CFC",
    sourceLabel: "Poznań, PL",
    destinationLabel: "Turin, IT",
    notes: "",
    status: "gps_silent",
    showOnMap: true,
    startProgress: 0.5,
    revenueEur: 4000.0,
    fuelStops: [],
    serviceStops: [],
    parkingStops: [],
    enrichStatus: "idle",
  },
  {
    id: "seed-4",
    driverName: "Radu Petrescu",
    phone: "+40 745 444 555",
    truckType: "Scania S500 (2018)",
    truckPlate: "SV31CFC",
    sourceLabel: "Hannover, DE",
    destinationLabel: "Hannover, DE (round trip)",
    notes: "",
    status: "idle",
    showOnMap: true,
    startProgress: 0.02,
    revenueEur: 1991.0,
    fuelStops: [],
    serviceStops: [],
    parkingStops: [],
    enrichStatus: "idle",
  },
  {
    id: "seed-5",
    driverName: "Alexandru Barbu",
    phone: "+40 745 555 666",
    truckType: "MAN 440 (2013)",
    truckPlate: "SV24CFC",
    sourceLabel: "Dortmund, DE",
    destinationLabel: "Dortmund, DE (round trip)",
    notes: "",
    status: "in_transit",
    showOnMap: true,
    startProgress: 0.68,
    revenueEur: 5724.2,
    fuelStops: [],
    serviceStops: [],
    parkingStops: [],
    enrichStatus: "idle",
  },
];
