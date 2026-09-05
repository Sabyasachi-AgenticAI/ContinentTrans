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

const BERLIN: LatLng = [52.52, 13.405];
const TURIN: LatLng = [45.0703, 7.6869];
const DORTMUND: LatLng = [51.5136, 7.4653];
const POZNAN: LatLng = [52.4064, 16.9252];
const HANNOVER: LatLng = [52.3759, 9.732];
// Round trips only give us a single facility as both source and
// destination — a real point-to-point OSRM query can't draw a loop from
// that. These via-points are OUR inference of a plausible corridor (not
// scraped from DispatchMaster) so the loop renders as an actual road path.
const VIA_NUREMBERG: LatLng = [49.4521, 11.0767]; // for the Hannover loop
const VIA_ZARAGOZA: LatLng = [41.6488, -0.8891]; // for the Dortmund loop — matches the real "ZAZ1" facility code seen elsewhere in the account

// Real Continent Trans SRL trucks and their actual July 2026 Amazon Relay
// lanes, pulled from DispatchMaster (Flotă + Operațiuni > Istoric). Driver
// names/phone numbers are placeholders — see seed-data/continent_trans_sample.xlsx.
// This is the default fleet shown until you upload your own — same data
// path, not a separate hardcoded system.
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
    alert: { type: "near_fuel_stop", message: "Approaching Shell Berlin Ring (~6 km)" },
    startProgress: 0.12,
    durationMinutes: 25 * 60,
    distanceKm: 1220,
    revenueEur: 2248.25,
    route: [BERLIN, TURIN],
    fuelStops: [
      { id: "fuel-1a", name: "Shell Berlin Ring", brand: "Shell", position: [52.47, 13.4] },
      { id: "fuel-1b", name: "DKV Nürnberg Süd", brand: "DKV", position: [49.42, 11.05] },
    ],
    serviceStops: [
      { id: "svc-1a", name: "Havarie-Service Berlin", type: "towing", phone: "+49 30 234 5678", position: [52.5, 13.42] },
    ],
    parkingStops: [
      { id: "park-1a", name: "TRAVIS Rasthof Frankenhöhe", position: [49.3, 10.3], capacityTotal: 45, available: 12 },
      { id: "park-1b", name: "TRAVIS Rasthof Fürholzen", position: [48.45, 11.75], capacityTotal: 48, available: 5 },
      { id: "park-1c", name: "TRAVIS Brennero Nord", position: [47.0, 11.5], capacityTotal: 30, available: 3 },
    ],
    enrichStatus: "done",
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
    durationMinutes: 31 * 60 + 30,
    distanceKm: 1210,
    revenueEur: 2345.51,
    route: [TURIN, DORTMUND],
    fuelStops: [
      { id: "fuel-2a", name: "Q8 Torino Est", brand: "Q8", position: [45.08, 7.75] },
      { id: "fuel-2b", name: "Shell München Nord", brand: "Shell", position: [48.2, 11.6] },
    ],
    serviceStops: [
      { id: "svc-2a", name: "Autofficina Torino Nord", type: "garage", phone: "+39 011 234 5678", position: [45.1, 7.7] },
    ],
    parkingStops: [
      { id: "park-2a", name: "TRAVIS Rastplatz Basel Ost", position: [47.55, 7.65], capacityTotal: 38, available: 14 },
      { id: "park-2b", name: "TRAVIS Autohof Achern", position: [48.62, 8.07], capacityTotal: 62, available: 22 },
      { id: "park-2c", name: "TRAVIS Autohof Köln Ost", position: [50.95, 7.05], capacityTotal: 50, available: 0 },
    ],
    enrichStatus: "done",
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
    alert: { type: "gps_silent", message: "No GPS signal for 47 minutes (last seen near Vienna)" },
    startProgress: 0.5,
    durationMinutes: 56 * 60 + 8,
    distanceKm: 1449,
    revenueEur: 4000.0,
    route: [POZNAN, TURIN],
    fuelStops: [
      { id: "fuel-3a", name: "DKV Poznań Zachód", brand: "DKV", position: [52.4, 16.85] },
      { id: "fuel-3b", name: "Q8 Torino Ovest", brand: "Q8", position: [45.05, 7.6] },
    ],
    serviceStops: [
      { id: "svc-3a", name: "Pomoc Drogowa Poznań", type: "towing", phone: "+48 61 234 5678", position: [52.42, 16.9] },
    ],
    parkingStops: [
      { id: "park-3a", name: "TRAVIS Rasthof Brno", position: [49.2, 16.6], capacityTotal: 33, available: 9 },
      { id: "park-3b", name: "TRAVIS Autohof Wien Süd", position: [48.15, 16.35], capacityTotal: 60, available: 25 },
      { id: "park-3c", name: "TRAVIS Rastplatz Walserberg", position: [47.73, 12.98], capacityTotal: 35, available: 0 },
    ],
    enrichStatus: "done",
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
    durationMinutes: 19 * 60 + 1,
    distanceKm: 966,
    revenueEur: 1991.0,
    route: [HANNOVER, VIA_NUREMBERG, HANNOVER],
    fuelStops: [{ id: "fuel-4a", name: "Shell Hannover Messe", brand: "Shell", position: [52.33, 9.82] }],
    serviceStops: [
      { id: "svc-4a", name: "Lkw-Service Hannover", type: "garage", phone: "+49 511 234 5678", position: [52.38, 9.75] },
    ],
    parkingStops: [
      { id: "park-4a", name: "TRAVIS Autohof Hannover", position: [52.35, 9.85], capacityTotal: 40, available: 18 },
      { id: "park-4b", name: "TRAVIS Rastplatz Würzburg", position: [49.79, 9.93], capacityTotal: 28, available: 6 },
    ],
    enrichStatus: "done",
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
    durationMinutes: 78 * 60 + 5,
    distanceKm: 3273,
    revenueEur: 5724.2,
    route: [DORTMUND, VIA_ZARAGOZA, DORTMUND],
    fuelStops: [
      { id: "fuel-5a", name: "DKV Dortmund West", brand: "DKV", position: [51.5, 7.4] },
      { id: "fuel-5b", name: "Shell Köln Süd", brand: "Shell", position: [50.9, 6.95] },
    ],
    serviceStops: [
      { id: "svc-5a", name: "Lkw-Service Dortmund", type: "garage", phone: "+49 231 234 5678", position: [51.52, 7.47] },
    ],
    parkingStops: [
      { id: "park-5a", name: "TRAVIS Aire de Reims", position: [49.26, 4.03], capacityTotal: 55, available: 30 },
      { id: "park-5b", name: "TRAVIS Aire de Bordeaux", position: [44.84, -0.58], capacityTotal: 42, available: 18 },
      { id: "park-5c", name: "TRAVIS Área Pirineos", position: [42.72, -0.55], capacityTotal: 25, available: 2 },
    ],
    enrichStatus: "done",
  },
];
