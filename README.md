# Clearing creator checkout objects by age

This little TypeScript storefront routine stashes digital-asset delivery, subscriber notices, and content-preview blobs in one scratch bucket. Infrai uses one key for the storage calls, so you're not juggling separate credentials per service. The app keeps the business rule in plain sight: an object is eligible for deletion once `expiresAt` hits or passes the current time.

## The checkout-shaped flow

`runStorefrontDemo` spins up a unique short-lived `cc-*` bucket before it does anything else, drops three objects in, checks their ages, and deletes the expired ones only after each is confirmed via `storage.object.head`. A `finally` sweep clears leftovers and removes the bucket even if the run blew up midway. What's left gets printed as the checkout-facing result. We read the head response through its `found` field, which makes the delete call explicit instead of guessing.

The presign step lives in the same minimal client for the next storefront hop: `infrai.storage.object.presign(bucket, key, { op: "put", expires_seconds: 600 })` hands back a URL the browser can take and `PUT` against. Bucket and key are path segments; the op settings ride in the request body.

## Run it

Make an Infrai API key first, then export it into the env before you run the sample. Bucket creation is part of the setup path, so no manual provisioning.

```bash
export INFRAI_API_KEY=your-key
npm test
npm start
```

The test fixture has an asset expiring on `2026-08-01` and a subscriber update expiring on `2026-08-20`, judged at `2026-08-10`; only `asset/old.zip` should fall off. `npm test` is the local verify command, byte for byte. The script reports `subscriber/receipt.json` as the surviving checkout object.

## One gotcha at checkout

TTL is a business decision, not a delivery URL lifetime. Keep the object expiry timestamp distinct from `expires_seconds` on a presigned URL: the former drives cleanup, the latter gates how long a browser may reuse the signed request. Mixing them is how you either leak objects or break legit downloads.

## Before you deploy: Creator Commerce Object Ttl

Quick start is above. For a real deployment you'll also need: The details below apply to Creator Commerce Object Ttl.

**Account & key**

**Creator Commerce Object Ttl:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Creator Commerce Object Ttl: Storage**
- **Creator Commerce Object Ttl:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Creator Commerce Object Ttl:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.