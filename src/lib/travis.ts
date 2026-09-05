/**
 * TRAVIS Road Services — real-time truck parking (yourtravis.com).
 *
 * NOT WIRED UP YET — no OAuth2 client-credentials have been issued to us.
 * This file documents the real API shape (verified against
 * developer.yourtravis.com on 2026-09-03) so the swap from mock data to
 * live data, once credentials exist, is a small, well-scoped change.
 *
 * Auth: OAuth2, client-credentials grant recommended for
 *   Locations-API-only partner integrations. Token obtained from TRAVIS's
 *   auth server, then sent as `Authorization: Bearer <access_token>`.
 *   Credentials must be requested from TRAVIS directly
 *   (support@yourtravis.com) — there is no public self-serve signup.
 *
 * Two-step flow (this endpoint does NOT take coordinates/radius):
 *   1. Locations API (v1) — list TRAVIS locations to find nearby
 *      `locationId`s along a route (with their coordinates).
 *   2. GET https://api.travisroadservices.com/v2/locations/availability/parking
 *        ?locationIds[]=<id>&locationIds[]=<id>...   (required, max 100)
 *        &from=YYYY-MM-DDTHH:MM:SS+HH:MM              (required, future,
 *                                                       minutes in :00/:15/:30/:45)
 *        &to=YYYY-MM-DDTHH:MM:SS+HH:MM                (required, > from,
 *                                                       <= 89 days out)
 *        &includeExternallyManagedAvailability=true   (optional, slower)
 *      Full response schema wasn't visible in the public docs excerpt we
 *      could reach — confirm exact field names once we have credentials
 *      and can call it directly.
 */

import type { ParkingSpot } from "@/mock/data";

export async function fetchLiveParkingAvailability(
  _locationIds: string[],
): Promise<ParkingSpot[] | null> {
  // No credentials configured — always fall back to mock data for now.
  if (!process.env.TRAVIS_CLIENT_ID || !process.env.TRAVIS_CLIENT_SECRET) {
    return null;
  }

  // TODO once credentials are obtained: implement the OAuth2
  // client-credentials token exchange, then call the endpoint documented
  // above and map its response into ParkingSpot[].
  return null;
}
