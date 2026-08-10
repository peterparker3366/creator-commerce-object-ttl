import { strict as assert } from "node:assert";
import { expiredObjects } from "../src/creator_commerce.ts";

const objects = [
  { key: "asset/old.zip", kind: "digital-asset" as const, expiresAt: "2026-08-01T00:00:00.000Z" },
  { key: "subscriber/current.json", kind: "subscriber-update" as const, expiresAt: "2026-08-20T00:00:00.000Z" },
];

const expired = expiredObjects(objects, new Date("2026-08-10T00:00:00.000Z"));
assert.deepEqual(expired.map((object) => object.key), ["asset/old.zip"]);
console.log("TTL decision keeps current subscriber data and expires the old asset.");
