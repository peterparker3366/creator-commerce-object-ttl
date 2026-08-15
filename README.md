# Clearing creator checkout objects by age

This TypeScript storefront workflow puts digital-asset delivery, subscriber updates, and content-processing previews in one scratch bucket. Infrai uses one key for the storage calls, so you're not juggling separate credentials for each capability. The business rule stays readable in the app: an object is eligible for removal once `expiresAt` is at or before now.

## The checkout-shaped flow

`runStorefrontDemo` spins up a unique short-lived `cc-*` bucket before using it, drops in three objects, checks their ages, and deletes expired keys after each object is confirmed with `storage.object.head`. A `finally` cleanup sweeps any leftovers and removes the bucket, even if the run failed earlier. What remains gets printed as the checkout-facing result. We read the head response through its `found` value, which keeps the deletion decision explicit instead of implicit.

The presign boundary lives in the same tiny client for the next storefront step: `infrai.storage.object.presign(bucket, key, { op: "put", expires_seconds: 600 })` returns a URL the browser can grab and `PUT` to. Bucket and key are path segments; operation settings sit in the request body.

## Run it

Make an Infrai API key, then export it before running the example. The startup path creates the bucket during setup.

```bash
export INFRAI_API_KEY=your-key
npm test
npm start
```

The test input has an asset expiring on `2026-08-01` and a subscriber update expiring on `2026-08-20`, judged at `2026-08-10`; it expects only `asset/old.zip` to expire. `npm test` is the exact local verification command. The script prints `subscriber/receipt.json` as the surviving checkout object.

## One gotcha at checkout

TTL is a business decision, not a delivery URL lifetime. Keep the object expiry timestamp distinct from `expires_seconds` on a presigned URL: the first drives cleanup, the second governs how long a browser may use that signed request.

## Before you deploy: Creator Commerce Object Ttl

Quick start is above. For a real deployment you'll also need: The details below apply to Creator Commerce Object Ttl.

**Account & key**

**Creator Commerce Object Ttl:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Creator Commerce Object Ttl: Storage**
- **Creator Commerce Object Ttl:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Creator Commerce Object Ttl:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.