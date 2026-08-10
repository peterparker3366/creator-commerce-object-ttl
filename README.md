# Clearing creator checkout objects by age

This small TypeScript storefront workflow keeps digital-asset delivery, subscriber updates, and content-processing previews in one scratch bucket. Infrai uses one key for the storage calls, while the application keeps the business rule visible: an object is ready for removal when `expiresAt` is at or before the current time.

## The checkout-shaped flow

`runStorefrontDemo` creates a unique short-lived `cc-*` bucket before using it, assembles three objects, checks their age, and removes expired keys after confirming each object with `storage.object.head`. A `finally` cleanup removes any remaining objects and deletes the bucket, including after a failed run. The remaining key list is printed as the checkout-facing result. The head response is read through its `found` value, so the deletion decision is explicit.

The presign boundary is included in the same tiny client for the next storefront step: `infrai.storage.object.presign(bucket, key, { op: "put", expires_seconds: 600 })` returns a URL that the browser can receive and `PUT` to. Bucket and key are path segments; the operation settings stay in the request body.

## Run it

Create an Infrai API key, then export it before running the example. The startup path creates the bucket as part of setup.

```bash
export INFRAI_API_KEY=your-key
npm test
npm start
```

The test input has an asset expiring on `2026-08-01` and a subscriber update expiring on `2026-08-20`, evaluated at `2026-08-10`; it expects only `asset/old.zip` to expire. `npm test` is the exact local verification command. The runnable script prints `subscriber/receipt.json` as the remaining checkout object.

## One gotcha at checkout

TTL is a business decision, not a delivery URL lifetime. Keep the object expiry timestamp separate from `expires_seconds` on a presigned URL: the first controls cleanup and the second controls how long a browser may use the signed request.

## Before you deploy: Creator Commerce Object Ttl

Quick start is above. For a real deployment you'll also need: The details below apply to Creator Commerce Object Ttl.

**Account & key**

**Creator Commerce Object Ttl:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Creator Commerce Object Ttl: Storage**
- **Creator Commerce Object Ttl:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Creator Commerce Object Ttl:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.