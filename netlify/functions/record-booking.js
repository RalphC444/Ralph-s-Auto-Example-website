const { getStore } = require("@netlify/blobs");

const MAX_PER_SLOT = 2;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }

  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return respond(400, { error: "Invalid JSON body" });
  }

  const { dateKey, timeValue } = body;
  if (!dateKey || !timeValue) {
    return respond(400, { error: "Missing required fields: dateKey, timeValue" });
  }

  try {
    const store = getStore("bookings");
    const existing = await store.get(dateKey, { type: "json" }).catch(() => null) || {};
    const currentCount = existing[timeValue] || 0;

    if (currentCount >= MAX_PER_SLOT) {
      return respond(409, {
        error: "This time slot is fully booked. Please choose another time.",
        code: "SLOT_FULL",
      });
    }

    existing[timeValue] = currentCount + 1;
    await store.setJSON(dateKey, existing);

    const remaining = MAX_PER_SLOT - (currentCount + 1);
    return respond(200, { success: true, booked: currentCount + 1, remaining });
  } catch (err) {
    console.error("Blob write error:", err.message || err);
    return respond(500, { error: "Could not record booking" });
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
    body: JSON.stringify(body),
  };
}
