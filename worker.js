/**
 * Fotolive API starter.
 * Required Worker bindings:
 *   DB (D1 database)
 * Required secrets/vars:
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, ADMIN_SECRET
 *
 * Routes:
 *   GET  /api/health
 *   POST /api/admin/events       { title, event_date }
 *   GET  /api/events/:slug
 *   GET  /api/events/:slug/photos
 *   POST /api/events/:slug/signature
 *   POST /api/events/:slug/photos { public_id, secure_url, width, height, format }
 */
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type,x-admin-secret" }
});
const slug = () => crypto.randomUUID().replaceAll("-", "");
async function sha1Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: {
      "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,x-admin-secret" }});
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    try {
      if (url.pathname === "/api/health") return json({ ok: true, service: "fotolive-api" });
      if (url.pathname === "/api/admin/events" && request.method === "POST") {
        if (!env.ADMIN_SECRET || request.headers.get("x-admin-secret") !== env.ADMIN_SECRET)
          return json({ error: "Unauthorized" }, 401);
        const body = await request.json();
        if (!body.title || String(body.title).trim().length < 2) return json({ error: "Название слишком короткое" }, 400);
        const id = crypto.randomUUID();
        const publicSlug = slug();
        await env.DB.prepare("INSERT INTO events (id, slug, title, event_date, created_at) VALUES (?, ?, ?, ?, ?)")
          .bind(id, publicSlug, String(body.title).trim().slice(0, 100), body.event_date || null, new Date().toISOString()).run();
        return json({ id, slug: publicSlug, url: `${url.origin}/e/${publicSlug}` }, 201);
      }
      if (parts[0] === "api" && parts[1] === "events" && parts[2]) {
        const event = await env.DB.prepare("SELECT id, slug, title, event_date FROM events WHERE slug = ?")
          .bind(parts[2]).first();
        if (!event) return json({ error: "Альбом не найден" }, 404);
        if (parts.length === 3 && request.method === "GET") return json({ event });
        if (parts[3] === "photos" && request.method === "GET") {
          const { results } = await env.DB.prepare(
            "SELECT id, secure_url, width, height, format, created_at FROM photos WHERE event_id = ? ORDER BY created_at DESC LIMIT 300"
          ).bind(event.id).all();
          return json({ photos: results });
        }
        if (parts[3] === "signature" && request.method === "POST") {
          if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET)
            return json({ error: "Cloudinary ещё не настроен" }, 503);
          const timestamp = Math.floor(Date.now() / 1000);
          const folder = `fotolive/${event.id}`;
          const params = `folder=${folder}&timestamp=${timestamp}`;
          const signature = await sha1Hex(params + env.CLOUDINARY_API_SECRET);
          return json({ timestamp, folder, signature, api_key: env.CLOUDINARY_API_KEY,
            cloud_name: env.CLOUDINARY_CLOUD_NAME });
        }
        if (parts[3] === "photos" && request.method === "POST") {
          const body = await request.json();
          if (!body.public_id || !body.secure_url || !String(body.secure_url).startsWith("https://res.cloudinary.com/"))
            return json({ error: "Некорректные данные фотографии" }, 400);
          const id = crypto.randomUUID();
          await env.DB.prepare(
            "INSERT INTO photos (id, event_id, public_id, secure_url, width, height, format, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
          ).bind(id, event.id, body.public_id, body.secure_url, body.width || null, body.height || null,
            body.format || null, new Date().toISOString()).run();
          return json({ id }, 201);
        }
      }
      return json({ error: "Not found" }, 404);
    } catch (error) {
      return json({ error: "Внутренняя ошибка сервера", detail: env.ENVIRONMENT === "development" ? String(error) : undefined }, 500);
    }
  }
};
