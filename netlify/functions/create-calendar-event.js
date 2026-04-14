const { google } = require("googleapis");

const SHOP_ADDRESS = "701 N Macquesten Pkwy, Mount Vernon, NY 10552";
const TIMEZONE = "America/New_York";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }

  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  const {
    GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_PRIVATE_KEY,
    GOOGLE_CALENDAR_ID,
  } = process.env;

  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_CALENDAR_ID) {
    return respond(500, {
      error: "Google Calendar is not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_CALENDAR_ID.",
    });
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return respond(400, { error: "Invalid JSON body" });
  }

  const {
    dateKey,
    timeValue,
    contactName,
    contactEmail,
    contactPhone,
    serviceRequested,
    issueDescription,
    vehicleYear,
    vehicleMake,
    vehicleModel,
    vehicleTrim,
  } = body;

  if (!dateKey || !timeValue || !contactName) {
    return respond(400, { error: "Missing required fields: dateKey, timeValue, contactName" });
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);

  const startDate = new Date(year, month - 1, day, hour, minute);
  const endDate = new Date(startDate.getTime() + 60 * 60_000);

  const formatISO = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;

  const descriptionLines = [
    `Customer: ${contactName}`,
    `Email: ${contactEmail || "—"}`,
    `Phone: ${contactPhone || "—"}`,
    "",
    `Service: ${serviceRequested || "—"}`,
    issueDescription ? `Issue: ${issueDescription}` : null,
    `Vehicle: ${vehicleYear || "—"} ${vehicleMake || "—"} ${vehicleModel || "—"}${vehicleTrim ? ` (${vehicleTrim})` : ""}`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  try {
    const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");

    const auth = new google.auth.JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
    });

    const calendar = google.calendar({ version: "v3", auth });

    const calendarEvent = {
      summary: `${contactName} — ${serviceRequested || "Appointment"}`,
      description: descriptionLines,
      location: SHOP_ADDRESS,
      start: { dateTime: formatISO(startDate), timeZone: TIMEZONE },
      end: { dateTime: formatISO(endDate), timeZone: TIMEZONE },
    };

    const result = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      requestBody: calendarEvent,
    });

    return respond(200, { success: true, eventId: result.data.id });
  } catch (err) {
    console.error("Google Calendar API error:", err.message || err);
    console.error("Service account:", GOOGLE_SERVICE_ACCOUNT_EMAIL);
    console.error("Calendar ID:", GOOGLE_CALENDAR_ID);
    console.error("Key starts with:", GOOGLE_PRIVATE_KEY.substring(0, 40));
    return respond(500, { error: "Failed to create calendar event", detail: err.message });
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
