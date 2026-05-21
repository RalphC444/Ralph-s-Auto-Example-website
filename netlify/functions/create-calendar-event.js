const { google } = require("googleapis");

const SHOP_ADDRESS = "701 N Macquesten Pkwy, Mount Vernon, NY 10552";
const TIMEZONE = "America/New_York";
const APPT_DURATION_HOURS = 1;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }

  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN,
    GOOGLE_CALENDAR_ID, // optional — falls back to "primary"
  } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    return respond(500, {
      error:
        "Google Calendar not configured. Required env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN. (GOOGLE_CALENDAR_ID is optional and defaults to 'primary'.)",
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
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
    return respond(400, {
      error: "Missing required fields: dateKey (YYYY-MM-DD), timeValue (HH:MM), contactName",
    });
  }

  // Build ISO strings DIRECTLY from user input — no Date math, no server-timezone
  // dependency. Google interprets these strings in the timeZone we pass alongside.
  // dateKey:   "2026-05-21"
  // timeValue: "13:00"
  const [hourStr, minuteStr] = timeValue.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return respond(400, { error: "timeValue must be HH:MM (24-hour)" });
  }

  const pad = (n) => String(n).padStart(2, "0");
  const startISO = `${dateKey}T${pad(hour)}:${pad(minute)}:00`;
  const endHour = hour + APPT_DURATION_HOURS; // 1-hour appointment, never crosses midnight given shop hours
  const endISO = `${dateKey}T${pad(endHour)}:${pad(minute)}:00`;

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

  const calendarId = GOOGLE_CALENDAR_ID || "primary";

  try {
    const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

    const calendar = google.calendar({ version: "v3", auth });

    const calendarEvent = {
      summary: `${contactName} — ${serviceRequested || "Appointment"}`,
      description: descriptionLines,
      location: SHOP_ADDRESS,
      start: { dateTime: startISO, timeZone: TIMEZONE },
      end: { dateTime: endISO, timeZone: TIMEZONE },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 60 },
        ],
      },
    };

    const result = await calendar.events.insert({
      calendarId,
      requestBody: calendarEvent,
    });

    return respond(200, {
      success: true,
      eventId: result.data.id,
      htmlLink: result.data.htmlLink,
      calendarId,
      start: startISO,
      end: endISO,
    });
  } catch (err) {
    // Surface as much detail as Google gives us — this is what makes debugging possible
    const googleDetail =
      err?.response?.data?.error ||
      err?.errors ||
      err?.message ||
      String(err);
    console.error("Google Calendar API error:", JSON.stringify(googleDetail, null, 2));
    return respond(500, {
      error: "Failed to create calendar event",
      detail: googleDetail,
      calendarId,
    });
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
