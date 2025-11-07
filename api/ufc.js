export const config = { runtime: 'edge' };

/** Configured by the build script */
const UFC_BASE = "https://<PUT-UFC-API-BASE-URL-HERE>";

/** Defensive fetch -> json */
async function getJSON(url) {
  const r = await fetch(url, { headers: { 'accept': 'application/json' }});
  if (!r.ok) throw new Error(\GET \ -> \ \\);
  return r.json();
}

/** normalize to our feed shape */
function mapBout(b) {
  return {
    id: String(b?.id ?? b?._id ?? crypto.randomUUID()),
    event: b?.event?.name ?? b?.event_name ?? b?.event ?? "UFC Event",
    weightClass: b?.weight_class ?? b?.weightClass ?? null,
    red: {
      id: b?.red?.id ?? b?.fighter1_id ?? null,
      name: b?.red?.name ?? b?.fighter1_name ?? b?.fighter1 ?? "TBD",
      record: b?.red?.record ?? b?.fighter1_record ?? null,
    },
    blue: {
      id: b?.blue?.id ?? b?.fighter2_id ?? null,
      name: b?.blue?.name ?? b?.fighter2_name ?? b?.fighter2 ?? "TBD",
      record: b?.blue?.record ?? b?.fighter2_record ?? null,
    },
    startTime: b?.start_time ?? b?.date ?? b?.startTime ?? null,
    status: (b?.status ?? b?.state ?? "upcoming").toLowerCase(),
    result: b?.result ?? b?.outcome ?? null,
  };
}

export default async function handler(req) {
  try {
    // try a couple of common endpoints used by public UFC APIs
    let events = null, bouts = null;

    // events (best-effort)
    try {
      events = await getJSON(\\/events?limit=12\);
    } catch { try { events = await getJSON(\\/events\); } catch {} }

    // bouts/upcoming
    try {
      const a = await getJSON(\\/bouts?status=upcoming\);
      bouts = a?.data ?? a;
    } catch {
      try {
        const b = await getJSON(\\/fights/upcoming\);
        bouts = b?.data ?? b;
      } catch {}
    }

    bouts = Array.isArray(bouts) ? bouts : [];
    const items = bouts.map(mapBout);

    const payload = {
      league: "UFC",
      updated: new Date().toISOString(),
      count: items.length,
      bouts: items,
      meta: {
        source: "UFC public API via SportsEdge proxy",
        base: UFC_BASE
      }
    };

    return new Response(JSON.stringify(payload), {
      headers: { "content-type": "application/json", "cache-control": "s-maxage=60" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: true, message: String(err?.message ?? err) }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}
