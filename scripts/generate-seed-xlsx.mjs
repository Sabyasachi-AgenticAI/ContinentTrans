import XLSX from "xlsx";
import path from "node:path";

// Real Continent Trans SRL trucks + real historical Amazon Relay lanes,
// pulled from their DispatchMaster account (Flotă + Operațiuni > Istoric,
// filtered to CFC-plate trucks, July 2026). Driver names and phone numbers
// are fabricated — the real drivers' personal contact info was not copied.
const trips = [
  {
    driver_name: "Mihai Constantinescu",
    phone: "+40 745 111 222",
    truck_plate: "SV03CFC",
    truck_model: "Scania (2022)",
    source: "Berlin, DE",
    destination: "Turin, IT",
    distance_km: 1220,
    revenue_eur: 2248.25,
    departure: "2026-07-24 07:00",
    arrival: "2026-07-25 08:00",
    note: "Real lane, 24-25 Jul 2026 (Amazon Relay facility BER8 -> TRN3)",
  },
  {
    driver_name: "Bogdan Ardelean",
    phone: "+40 745 222 333",
    truck_plate: "SV84CFC",
    truck_model: "Mercedes Benz 1848 (2026)",
    source: "Turin, IT",
    destination: "Dortmund, DE",
    distance_km: 1210,
    revenue_eur: 2345.51,
    departure: "2026-07-09 07:00",
    arrival: "2026-07-10 14:30",
    note: "Real lane, 9-10 Jul 2026 (Amazon Relay facility TRN3 -> DTM1)",
  },
  {
    driver_name: "Cristian Moraru",
    phone: "+40 745 333 444",
    truck_plate: "SV19CFC",
    truck_model: "MAN 480 (2016)",
    source: "Poznań, PL",
    destination: "Turin, IT",
    distance_km: 1449,
    revenue_eur: 4000.0,
    departure: "2026-07-17 22:30",
    arrival: "2026-07-20 06:38",
    note: "Real lane, 17-20 Jul 2026 (Amazon Relay facility POZ1 -> TRN3)",
  },
  {
    driver_name: "Radu Petrescu",
    phone: "+40 745 444 555",
    truck_plate: "SV31CFC",
    truck_model: "Scania S500 (2018)",
    source: "Hannover, DE",
    destination: "Hannover, DE",
    distance_km: 966,
    revenue_eur: 1991.0,
    departure: "2026-07-20 16:30",
    arrival: "2026-07-21 11:31",
    note: "Real round-trip linehaul, 20-21 Jul 2026 (Amazon Relay facility HAJ1 -> HAJ1)",
  },
  {
    driver_name: "Alexandru Barbu",
    phone: "+40 745 555 666",
    truck_plate: "SV24CFC",
    truck_model: "MAN 440 (2013)",
    source: "Dortmund, DE",
    destination: "Dortmund, DE",
    distance_km: 3273,
    revenue_eur: 5724.2,
    departure: "2026-07-22 22:30",
    arrival: "2026-07-26 04:35",
    note: "Real round-trip linehaul, 22-26 Jul 2026 (Amazon Relay facility DTM2 -> DTM2)",
  },
];

// Fuel stops: brand network is real (Shell FleetHub, DKV Mobility, Q8 IDS are
// Continent Trans's actual configured fuel-card integrations in DispatchMaster).
// Specific station names/coordinates below are representative, not scraped
// real branch records (DispatchMaster only exposed brand-per-country data,
// not individual station listings).
const fuelStops = [
  { truck_plate: "SV03CFC", fuel_stop_name: "Shell Berlin Ring", brand: "Shell", lat: 52.47, lng: 13.4 },
  { truck_plate: "SV03CFC", fuel_stop_name: "DKV Nürnberg Süd", brand: "DKV", lat: 49.42, lng: 11.05 },
  { truck_plate: "SV84CFC", fuel_stop_name: "Q8 Torino Est", brand: "Q8", lat: 45.08, lng: 7.75 },
  { truck_plate: "SV84CFC", fuel_stop_name: "Shell München Nord", brand: "Shell", lat: 48.2, lng: 11.6 },
  { truck_plate: "SV19CFC", fuel_stop_name: "DKV Poznań Zachód", brand: "DKV", lat: 52.4, lng: 16.85 },
  { truck_plate: "SV19CFC", fuel_stop_name: "Q8 Torino Ovest", brand: "Q8", lat: 45.05, lng: 7.6 },
  { truck_plate: "SV31CFC", fuel_stop_name: "Shell Hannover Messe", brand: "Shell", lat: 52.33, lng: 9.82 },
  { truck_plate: "SV24CFC", fuel_stop_name: "DKV Dortmund West", brand: "DKV", lat: 51.5, lng: 7.4 },
  { truck_plate: "SV24CFC", fuel_stop_name: "Shell Köln Süd", brand: "Shell", lat: 50.9, lng: 6.95 },
];

const towingGarage = [
  { truck_plate: "SV03CFC", name: "Havarie-Service Berlin", type: "towing", phone: "+49 30 234 5678", lat: 52.5, lng: 13.42 },
  { truck_plate: "SV84CFC", name: "Autofficina Torino Nord", type: "garage", phone: "+39 011 234 5678", lat: 45.1, lng: 7.7 },
  { truck_plate: "SV19CFC", name: "Pomoc Drogowa Poznań", type: "towing", phone: "+48 61 234 5678", lat: 52.42, lng: 16.9 },
  { truck_plate: "SV31CFC", name: "Lkw-Service Hannover", type: "garage", phone: "+49 511 234 5678", lat: 52.38, lng: 9.75 },
  { truck_plate: "SV24CFC", name: "Lkw-Service Dortmund", type: "garage", phone: "+49 231 234 5678", lat: 51.52, lng: 7.47 },
];

const wb = XLSX.utils.book_new();

const tripsSheet = XLSX.utils.json_to_sheet(trips);
XLSX.utils.book_append_sheet(wb, tripsSheet, "Trips");

const fuelSheet = XLSX.utils.json_to_sheet(fuelStops);
XLSX.utils.book_append_sheet(wb, fuelSheet, "FuelStops");

const serviceSheet = XLSX.utils.json_to_sheet(towingGarage);
XLSX.utils.book_append_sheet(wb, serviceSheet, "TowingGarage");

const outPath = path.resolve(
  "D:/VoiceAI/github_livekit/TRAK_ContinentTRANS/seed-data/continent_trans_sample.xlsx",
);
XLSX.writeFile(wb, outPath);
console.log("Wrote", outPath);
