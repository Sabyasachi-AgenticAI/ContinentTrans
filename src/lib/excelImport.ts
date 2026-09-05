import * as XLSX from "xlsx";
import { DEFAULT_FUEL_PROXIMITY_KM, type TruckEntry } from "@/mock/data";

// Case/spacing-insensitive header matching, with common synonyms, so the
// existing seed-data/continent_trans_sample.xlsx (driver_name, phone,
// truck_plate, source, destination) imports without any changes, alongside
// the "Driver Name / Number / Truck Type / Source / Destination / Notes"
// shape a dispatcher would naturally type.
const FIELD_ALIASES: Record<keyof PickedFields, string[]> = {
  driverName: ["drivername", "driver", "name"],
  phone: ["number", "phone", "phonenumber", "contact", "mobile"],
  truckType: ["trucktype", "truckmodel", "type", "vehicle", "model"],
  truckPlate: ["truckplate", "plate", "registration", "platenumber"],
  sourceLabel: ["source", "from", "origin", "pickup"],
  destinationLabel: ["destination", "to", "dest", "dropoff"],
  notes: ["notes", "note", "remarks", "comments"],
};

interface PickedFields {
  driverName: string;
  phone: string;
  truckType: string;
  truckPlate: string;
  sourceLabel: string;
  destinationLabel: string;
  notes: string;
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildHeaderMap(headers: string[]): Partial<Record<keyof PickedFields, string>> {
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));
  const map: Partial<Record<keyof PickedFields, string>> = {};
  for (const field of Object.keys(FIELD_ALIASES) as (keyof PickedFields)[]) {
    const aliases = FIELD_ALIASES[field];
    const match = normalized.find((h) => aliases.includes(h.norm));
    if (match) map[field] = match.raw;
  }
  return map;
}

function emptyTruck(): TruckEntry {
  return {
    id: crypto.randomUUID(),
    driverName: "",
    phone: "",
    truckType: "",
    truckPlate: "",
    sourceLabel: "",
    destinationLabel: "",
    notes: "",
    status: "idle",
    showOnMap: true,
    whatsappAlertsEnabled: false,
    fuelProximityKm: DEFAULT_FUEL_PROXIMITY_KM,
    startProgress: 0,
    fuelStops: [],
    serviceStops: [],
    parkingStops: [],
    enrichStatus: "idle",
  };
}

/** Parses the first sheet of an uploaded workbook into TruckEntry rows. */
export async function parseFleetWorkbook(file: File): Promise<TruckEntry[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (rows.length === 0) return [];

  const headerMap = buildHeaderMap(Object.keys(rows[0]));

  return rows
    .map((row) => {
      const truck = emptyTruck();
      for (const field of Object.keys(FIELD_ALIASES) as (keyof PickedFields)[]) {
        const header = headerMap[field];
        if (header && row[header] !== undefined) {
          truck[field] = String(row[header]).trim();
        }
      }
      return truck;
    })
    .filter((t) => t.driverName || t.truckPlate || t.sourceLabel); // skip fully blank rows
}
