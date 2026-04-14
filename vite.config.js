import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const allEnv = loadEnv("development", __dirname, "");
Object.assign(process.env, allEnv);
const BOOKINGS_FILE = path.join(__dirname, ".local-bookings.json");
const MAX_PER_SLOT = 2;

function readBookings() {
  try { return JSON.parse(fs.readFileSync(BOOKINGS_FILE, "utf-8")); }
  catch { return {}; }
}
function writeBookings(data) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(data, null, 2));
}

function localApiFunctions() {
  return {
    name: "local-api-functions",
    configureServer(server) {
      server.middlewares.use("/api/get-slot-availability", (req, res) => {
        const url = new URL(req.url, "http://localhost");
        const date = url.searchParams.get("date");
        if (!date) { res.writeHead(400); res.end(JSON.stringify({ error: "date required" })); return; }
        const all = readBookings();
        const counts = all[date] || {};
        const slots = {};
        for (const [t, count] of Object.entries(counts)) {
          slots[t] = { booked: count, remaining: Math.max(0, MAX_PER_SLOT - count) };
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ date, maxPerSlot: MAX_PER_SLOT, slots }));
      });

      server.middlewares.use("/api/record-booking", (req, res) => {
        if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          try {
            const { dateKey, timeValue } = JSON.parse(body);
            if (!dateKey || !timeValue) { res.writeHead(400); res.end(JSON.stringify({ error: "Missing fields" })); return; }
            const all = readBookings();
            if (!all[dateKey]) all[dateKey] = {};
            const cur = all[dateKey][timeValue] || 0;
            if (cur >= MAX_PER_SLOT) {
              res.writeHead(409, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "This time slot is fully booked. Please choose another time.", code: "SLOT_FULL" }));
              return;
            }
            all[dateKey][timeValue] = cur + 1;
            writeBookings(all);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, booked: cur + 1, remaining: MAX_PER_SLOT - cur - 1 }));
          } catch { res.writeHead(400); res.end(JSON.stringify({ error: "Invalid JSON" })); }
        });
      });

      server.middlewares.use("/api/create-calendar-event", async (req, res) => {
        if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", async () => {
          try {
            const data = JSON.parse(body);
            const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_CALENDAR_ID } = process.env;
            if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_CALENDAR_ID) {
              console.warn("[local-api] Google Calendar not configured — skipping event creation");
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: true, skipped: true, reason: "Google Calendar env vars not set" }));
              return;
            }
            const { google } = await import("googleapis");
            const auth = new google.auth.JWT({
              email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
              key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
              scopes: ["https://www.googleapis.com/auth/calendar.events"],
            });
            const calendar = google.calendar({ version: "v3", auth });
            const [year, month, day] = data.dateKey.split("-").map(Number);
            const [hour, minute] = data.timeValue.split(":").map(Number);
            const start = new Date(year, month - 1, day, hour, minute);
            const end = new Date(start.getTime() + 60 * 60_000);
            const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:00`;
            const result = await calendar.events.insert({
              calendarId: GOOGLE_CALENDAR_ID,
              requestBody: {
                summary: `${data.contactName} — ${data.serviceRequested || "Appointment"}`,
                description: `Customer: ${data.contactName}\nEmail: ${data.contactEmail || "—"}\nPhone: ${data.contactPhone || "—"}\nService: ${data.serviceRequested || "—"}\nVehicle: ${data.vehicleYear || ""} ${data.vehicleMake || ""} ${data.vehicleModel || ""}`,
                location: "701 N Macquesten Pkwy, Mount Vernon, NY 10552",
                start: { dateTime: fmt(start), timeZone: "America/New_York" },
                end: { dateTime: fmt(end), timeZone: "America/New_York" },
              },
            });
            console.log("[local-api] Calendar event created:", result.data.id);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, eventId: result.data.id }));
          } catch (err) {
            console.error("[local-api] Calendar error:", err.message);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApiFunctions()],
});
