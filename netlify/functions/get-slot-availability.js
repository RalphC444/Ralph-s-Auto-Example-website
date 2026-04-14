const { getStore } = require("@netlify/blobs");

const MAX_PER_SLOT = 2;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }

  if (event.httpMethod !== "GET") {
    return respond(405, { error: "Method not allowed" });
  }

  const date = (event.queryStringParameters || {}).date;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return respond(400, { error: "date query param required (YYYY-MM-DD)" });
  }

  try {
    const store = getStore("bookings");
    const raw = await store.get(date, { type: "json" }).catch(() => null);
    const counts = raw || {};

    const slots = {};
    for (const [time, count] of Object.entries(counts)) {
      slots[time] = {
        booked: count,
        remaining: Math.max(0, MAX_PER_SLOT - count),
      };
    }

    return respond(200, { date, maxPerSlot: MAX_PER_SLOT, slots });
  } catch (err) {
    console.error("Blob read error:", err.message || err);
    return respond(500, { error: "Could not read availability" });
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
    body: JSON.stringify(body),
  };
}
