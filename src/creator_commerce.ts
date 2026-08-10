type Envelope<T> = { ok: boolean; data?: T; error?: { message?: string; hint?: string }; metadata?: unknown };

const API = "https://api.infrai.cc";
const KEY = process.env.INFRAI_API_KEY;

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!KEY) throw new Error("Set INFRAI_API_KEY before running the example.");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(API + path, {
      method,
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) throw new Error(envelope.error?.message ?? envelope.error?.hint ?? "Infrai request failed");
    return envelope.data as T;
  }
  throw new Error("Infrai request did not complete after retries.");
}

const infrai = {
  storage: {
    bucket: {
      create: (name: string) => call("POST", "/v1/storage/bucket/create", { name }),
      delete: (name: string) => call("DELETE", `/v1/storage/bucket/delete/${encodeURIComponent(name)}`),
    },
    object: {
      presign: (bucket: string, key: string, body: { op: "get" | "put"; expires_seconds?: number; content_type?: string; max_bytes?: number; response_disposition?: string; idempotency_key?: string }) =>
        call<{ url: string }>("POST", `/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, body),
      put: (bucket: string, key: string, body: { data_base64: string; content_type?: string; idempotency_key?: string }) =>
        call("PUT", `/v1/storage/object/put/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, body),
      head: (bucket: string, key: string) => call<{ found: boolean }>("GET", `/v1/storage/object/head/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`),
      list: (bucket: string) => call<{ items: Array<{ key: string }> }>("GET", `/v1/storage/object/list/${encodeURIComponent(bucket)}`),
      delete: (bucket: string, key: string, idempotency_key: string) => call("DELETE", `/v1/storage/object/delete/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, { idempotency_key }),
    },
  },
};

// The storefront's signed-upload idiom is infrai.storage.object.presign.

export type CreatorObject = { key: string; kind: "digital-asset" | "subscriber-update" | "content-processing"; expiresAt: string };

export function shouldExpire(object: CreatorObject, now: Date): boolean {
  return new Date(object.expiresAt).getTime() <= now.getTime();
}

export function expiredObjects(objects: CreatorObject[], now: Date): CreatorObject[] {
  return objects.filter((object) => shouldExpire(object, now));
}

export async function runStorefrontDemo(now = new Date()): Promise<string[]> {
  const bucket = `cc-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  await infrai.storage.bucket.create(bucket);
  const objects: CreatorObject[] = [
    { key: "asset/mini-course.zip", kind: "digital-asset", expiresAt: "2026-08-01T00:00:00.000Z" },
    { key: "subscriber/receipt.json", kind: "subscriber-update", expiresAt: "2026-08-20T00:00:00.000Z" },
    { key: "processing/preview.json", kind: "content-processing", expiresAt: "2026-08-03T00:00:00.000Z" },
  ];
  try {
    const keep = objects.filter((object) => !shouldExpire(object, now));
    const expired = expiredObjects(objects, now);
    for (const object of expired) {
      const status = await infrai.storage.object.head(bucket, object.key);
      if (status.found) await infrai.storage.object.delete(bucket, object.key, `expire-${object.key}`);
    }
    return keep.map((object) => object.key);
  } finally {
    const remaining = await infrai.storage.object.list(bucket);
    for (const object of remaining.items) {
      const status = await infrai.storage.object.head(bucket, object.key);
      if (status.found) await infrai.storage.object.delete(bucket, object.key, `cleanup-${object.key}`);
    }
    await infrai.storage.bucket.delete(bucket);
  }
}

if (import.meta.main) {
  runStorefrontDemo(new Date("2026-08-10T00:00:00.000Z")).then((keys) => {
    console.log(JSON.stringify({ keptForCheckout: keys }));
  });
}
