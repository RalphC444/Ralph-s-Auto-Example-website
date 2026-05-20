import { useCallback, useEffect, useRef, useState } from "react";
import emailjs from "@emailjs/browser";

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY ?? "";
const OR_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID ?? "";
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID ?? "";
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? "";

const SHOP_NAME = "Ralph & Son Auto Repair";
const SHOP_PHONE = "(914) 776-5331";
const SHOP_ADDRESS = "701 N Macquesten Pkwy, Mount Vernon, NY 10552";

const CHAT_SERVICES = [
  "NY State Inspection",
  "Oil Change Service",
  "Brake Repair",
  "Engine Diagnostics",
  "Suspension & Steering",
  "Battery & Charging System",
  "Cooling System Service",
  "Transmission Service",
  "A/C & Heating Repair",
  "Exhaust & Muffler Repair",
  "Other",
];

const VEHICLE_MAKES = [
  "Acura","Audi","BMW","Buick","Cadillac","Chevrolet","Chrysler","Dodge",
  "Ford","Genesis","GMC","Honda","Hyundai","Infiniti","Jaguar","Jeep",
  "Kia","Land Rover","Lexus","Lincoln","Mazda","Mercedes-Benz","Mini",
  "Mitsubishi","Nissan","Porsche","Ram","Subaru","Tesla","Toyota",
  "Volkswagen","Volvo","Other",
];

const CURRENT_YEAR = new Date().getFullYear();
const VEHICLE_YEARS = Array.from({ length: 43 }, (_, i) => String(CURRENT_YEAR - i));

function buildSlots(endMinutes) {
  const slots = [];
  for (let t = 8 * 60; t < endMinutes; t += 30) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    const d = new Date(2000, 0, 1, h, m);
    slots.push({
      label: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      value: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    });
  }
  return slots;
}

const WEEKDAY_SLOTS = buildSlots(17 * 60 + 30);
const SATURDAY_SLOTS = buildSlots(14 * 60);

function slotsForKey(key) {
  if (!key) return WEEKDAY_SLOTS;
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).getDay() === 6 ? SATURDAY_SLOTS : WEEKDAY_SLOTS;
}

function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDateKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

async function fetchAvailableDays() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toDateKey(today);
  const now = new Date();

  const candidates = [];
  for (let i = 0; i < 28 && candidates.length < 12; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    if (d.getDay() === 0) continue;
    candidates.push({ d, key: toDateKey(d) });
  }

  const avails = await Promise.all(
    candidates.map(({ key }) =>
      fetch(`/api/get-slot-availability?date=${key}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    )
  );

  const available = [];
  candidates.forEach(({ d, key }, i) => {
    const data = avails[i];
    const isToday = key === todayKey;
    const hasSlot = slotsForKey(key).some((slot) => {
      if (isToday) {
        const [h, m] = slot.value.split(":").map(Number);
        if (h * 60 + m <= now.getHours() * 60 + now.getMinutes() + 30) return false;
      }
      if (!data?.slots) return true;
      const info = data.slots[slot.value];
      return !info || info.booked < 2;
    });
    if (hasSlot) available.push({ d, key });
  });

  return available.slice(0, 7);
}

async function fetchAvailableSlots(key) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const now = new Date();
  const isToday = key === toDateKey(today);

  const data = await fetch(`/api/get-slot-availability?date=${key}`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  return slotsForKey(key).filter((slot) => {
    if (isToday) {
      const [h, m] = slot.value.split(":").map(Number);
      if (h * 60 + m <= now.getHours() * 60 + now.getMinutes() + 30) return false;
    }
    if (!data?.slots) return true;
    const info = data.slots[slot.value];
    return !info || info.booked < 2;
  });
}

const SYSTEM_PROMPT = `You are a friendly assistant for ${SHOP_NAME}.
Location: ${SHOP_ADDRESS}
Phone: ${SHOP_PHONE}
Hours: Mon–Fri 8 AM–5:30 PM · Sat 8 AM–2 PM · Sun Closed

Services:
- NY State Inspection — from $37
- Oil Change, Brake Repair, Engine Diagnostics, Suspension & Steering, Battery & Charging, Cooling System, Transmission Service, A/C & Heating, Exhaust & Muffler — request a quote

Rules:
- Keep answers to 1–3 short sentences. Be warm and helpful.
- Never invent prices for quote-only services.
- If someone wants to book, tell them to tap "Book an appointment" in this chat.
- Do not discuss topics unrelated to the shop or cars.`;

async function streamChat(history, onChunk, signal) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": SHOP_NAME,
    },
    body: JSON.stringify({
      model: OR_MODEL,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
      stream: true,
      max_tokens: 250,
    }),
  });

  if (!res.ok) throw new Error(`API ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const json = t.slice(5).trim();
      if (json === "[DONE]") return;
      try {
        const chunk = JSON.parse(json).choices?.[0]?.delta?.content;
        if (chunk) onChunk(chunk);
      } catch {}
    }
  }
}

let _id = 0;
const mkId = () => ++_id;

const INIT_MESSAGES = [
  {
    id: mkId(),
    role: "assistant",
    content: "Hi! Ask me anything about Ralph & Son Auto Repair, or book an appointment fast right here.",
    actions: ["Book an appointment", "Services & hours"],
  },
];

function TypingDots() {
  return (
    <span className="cwt-dots" aria-label="Typing">
      <span /><span /><span />
    </span>
  );
}

function ServicePicker({ onSelect }) {
  return (
    <div className="cwt-service-list">
      {CHAT_SERVICES.map((s) => (
        <button key={s} className="cwt-chip" onClick={() => onSelect(s)}>
          {s}
        </button>
      ))}
    </div>
  );
}

function VehicleForm({ onSubmit }) {
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const ok = year && make && model.trim();
  return (
    <div className="cwt-vehicle-form">
      <select value={year} onChange={(e) => setYear(e.target.value)}>
        <option value="">Year</option>
        {VEHICLE_YEARS.map((y) => <option key={y}>{y}</option>)}
      </select>
      <select value={make} onChange={(e) => setMake(e.target.value)}>
        <option value="">Make</option>
        {VEHICLE_MAKES.map((m) => <option key={m}>{m}</option>)}
      </select>
      <input
        type="text"
        placeholder="Model (e.g. Accord)"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && ok && onSubmit(year, make, model.trim())}
      />
      <button className="cwt-btn-primary" disabled={!ok} onClick={() => ok && onSubmit(year, make, model.trim())}>
        Continue →
      </button>
    </div>
  );
}

function DatePicker({ days, onSelect }) {
  return (
    <div className="cwt-date-list">
      {days.map(({ d, key }) => {
        const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        return (
          <button key={key} className="cwt-chip cwt-chip--date" onClick={() => onSelect(key, label)}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function TimePicker({ slots, onSelect }) {
  return (
    <div className="cwt-time-list">
      {slots.map((slot) => (
        <button key={slot.value} className="cwt-chip cwt-chip--time" onClick={() => onSelect(slot)}>
          {slot.label}
        </button>
      ))}
    </div>
  );
}

function ContactForm({ onSubmit }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const ok = name.trim() && phone.trim() && email.trim();
  return (
    <div className="cwt-contact-form">
      <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
      <input type="tel" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button
        className="cwt-btn-primary"
        disabled={!ok}
        onClick={() => ok && onSubmit(name.trim(), phone.trim(), email.trim())}
      >
        Confirm Booking →
      </button>
    </div>
  );
}

function ChatMessage({ msg, onAction, onServiceSelect, onVehicleSubmit, onDateSelect, onTimeSelect, onContactSubmit }) {
  const isUser = msg.role === "user";
  return (
    <div className={`cwt-msg ${isUser ? "cwt-msg--user" : "cwt-msg--bot"}`}>
      {!isUser && <span className="cwt-avatar" aria-hidden="true">R&amp;S</span>}
      <div className="cwt-bubble">
        {msg.content && <p className="cwt-text">{msg.content}</p>}
        {msg.streaming && !msg.content && <TypingDots />}
        {msg.streaming && msg.content && <span className="cwt-cursor" aria-hidden="true" />}

        {msg.actions && (
          <div className="cwt-actions">
            {msg.actions.map((a) => (
              <button key={a} className="cwt-action-btn" onClick={() => onAction(a)}>{a}</button>
            ))}
          </div>
        )}

        {msg.bookingUI === "service" && <ServicePicker onSelect={onServiceSelect} />}
        {msg.bookingUI === "vehicle" && <VehicleForm onSubmit={onVehicleSubmit} />}
        {msg.bookingUI === "date_loading" && <p className="cwt-loading"><TypingDots /></p>}
        {msg.bookingUI === "date" && <DatePicker days={msg.availableDays} onSelect={onDateSelect} />}
        {msg.bookingUI === "time_loading" && <p className="cwt-loading"><TypingDots /></p>}
        {msg.bookingUI === "time" && <TimePicker slots={msg.availableSlots} onSelect={onTimeSelect} />}
        {msg.bookingUI === "contact" && <ContactForm onSubmit={onContactSubmit} />}
        {msg.bookingUI === "submitting" && <p className="cwt-loading">Submitting… <TypingDots /></p>}
      </div>
    </div>
  );
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState(INIT_MESSAGES);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [booking, setBooking] = useState(null);

  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const bookingRef = useRef(booking);
  useEffect(() => { bookingRef.current = booking; }, [booking]);

  const abortRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // cleanup on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  const addMsg = useCallback((msg) => {
    setMessages((prev) => [...prev, { id: mkId(), ...msg }]);
  }, []);

  const patchLastBotMsg = useCallback((patch) => {
    setMessages((prev) => {
      const copy = [...prev];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].role === "assistant") {
          copy[i] = { ...copy[i], ...patch };
          break;
        }
      }
      return copy;
    });
  }, []);

  const patchLastWithUI = useCallback((bookingUI, patch) => {
    setMessages((prev) => {
      const copy = [...prev];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].bookingUI === bookingUI) {
          copy[i] = { ...copy[i], ...patch };
          break;
        }
      }
      return copy;
    });
  }, []);

  // ── AI Q&A ──────────────────────────────────────────────────────────────
  const askAI = useCallback(async (userText) => {
    const history = messagesRef.current
      .filter((m) => (m.role === "user" || m.role === "assistant") && m.content)
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));
    history.push({ role: "user", content: userText });

    const streamId = mkId();
    setMessages((prev) => [...prev, { id: streamId, role: "assistant", content: "", streaming: true }]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(
        history,
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === streamId ? { ...m, content: m.content + chunk } : m))
          );
        },
        controller.signal
      );
    } catch (err) {
      if (err.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamId
              ? { ...m, content: "Sorry, I couldn't connect. Please call us at (914) 776-5331.", streaming: false }
              : m
          )
        );
      }
    } finally {
      setMessages((prev) =>
        prev.map((m) => (m.id === streamId ? { ...m, streaming: false } : m))
      );
      setIsStreaming(false);
    }
  }, []);

  // ── Booking flow ─────────────────────────────────────────────────────────
  const startBooking = useCallback(() => {
    addMsg({ role: "user", content: "I'd like to book an appointment" });
    addMsg({ role: "assistant", content: "Great! What service do you need?", bookingUI: "service" });
    setBooking({ phase: "service" });
  }, [addMsg]);

  const handleServiceSelect = useCallback((service) => {
    addMsg({ role: "user", content: service });
    addMsg({ role: "assistant", content: "Got it. Tell me about your vehicle:", bookingUI: "vehicle" });
    setBooking((prev) => ({ ...prev, service, phase: "vehicle" }));
  }, [addMsg]);

  const handleVehicleSubmit = useCallback((year, make, model) => {
    addMsg({ role: "user", content: `${year} ${make} ${model}` });
    addMsg({ role: "assistant", content: "Pick a day:", bookingUI: "date_loading" });
    setBooking((prev) => ({ ...prev, year, make, model, phase: "date_loading" }));

    fetchAvailableDays().then((days) => {
      if (!days.length) {
        patchLastWithUI("date_loading", {
          bookingUI: null,
          content: "No open days found in the next few weeks. Please call us at (914) 776-5331.",
        });
        setBooking(null);
        return;
      }
      patchLastWithUI("date_loading", { bookingUI: "date", availableDays: days });
      setBooking((prev) => ({ ...prev, phase: "date", availableDays: days }));
    });
  }, [addMsg, patchLastWithUI]);

  const handleDateSelect = useCallback((key, label) => {
    addMsg({ role: "user", content: label });
    addMsg({ role: "assistant", content: `Available times for ${label}:`, bookingUI: "time_loading" });
    setBooking((prev) => ({ ...prev, dateKey: key, dateLabel: label, phase: "time_loading" }));

    fetchAvailableSlots(key).then((slots) => {
      if (!slots.length) {
        patchLastWithUI("time_loading", {
          bookingUI: null,
          content: "That day just filled up! Tap below to pick a different day.",
        });
        // Re-show date picker from booking state
        setBooking((prev) => {
          if (prev?.availableDays) {
            addMsg({ role: "assistant", content: "Pick another day:", bookingUI: "date", availableDays: prev.availableDays });
          }
          return { ...prev, phase: "date" };
        });
        return;
      }
      patchLastWithUI("time_loading", { bookingUI: "time", availableSlots: slots });
      setBooking((prev) => ({ ...prev, phase: "time", availableSlots: slots }));
    });
  }, [addMsg, patchLastWithUI]);

  const handleTimeSelect = useCallback((slot) => {
    addMsg({ role: "user", content: slot.label });
    addMsg({ role: "assistant", content: "Almost done! Your contact info:", bookingUI: "contact" });
    setBooking((prev) => ({ ...prev, timeValue: slot.value, timeLabel: slot.label, phase: "contact" }));
  }, [addMsg]);

  const handleContactSubmit = useCallback(async (name, phone, email) => {
    const bk = bookingRef.current;
    if (!bk) return;

    addMsg({ role: "user", content: `${name} · ${phone} · ${email}` });
    addMsg({ role: "assistant", content: "Submitting…", bookingUI: "submitting" });
    setBooking((prev) => ({ ...prev, phase: "submitting" }));

    try {
      const reserveRes = await fetch("/api/record-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateKey: bk.dateKey, timeValue: bk.timeValue }),
      });

      if (reserveRes.status === 409) {
        patchLastWithUI("submitting", {
          bookingUI: null,
          content: "That slot just got taken! Start over and pick a different time.",
        });
        setBooking(null);
        return;
      }

      if (EMAILJS_PUBLIC_KEY && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID) {
        emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
          title: `${bk.dateKey} ${bk.timeValue} - ${name}`,
          appointment_date: bk.dateKey,
          appointment_time: bk.timeValue,
          vehicle_make: bk.make,
          vehicle_model: bk.model,
          vehicle_year: bk.year,
          vehicle_trim: "",
          service_requested: bk.service,
          issue_description: "",
          customer_phone: phone,
          message: [
            `${SHOP_NAME} — appointment request (via chat)`,
            "",
            `Date: ${fmtDateKey(bk.dateKey)}`,
            `Time: ${bk.timeLabel}`,
            `Service: ${bk.service}`,
            `Vehicle: ${bk.year} ${bk.make} ${bk.model}`,
            "",
            `Name: ${name}`,
            `Phone: ${phone}`,
            `Email: ${email}`,
          ].join("\n"),
          logo_url: `${window.location.origin}/images/ralph-sons-logo.png`,
        });
      }

      patchLastWithUI("submitting", {
        bookingUI: "done",
        content: `Booked! We'll see you ${fmtDateKey(bk.dateKey)} at ${bk.timeLabel}.\n${bk.service} · ${bk.year} ${bk.make} ${bk.model}`,
      });
      setBooking((prev) => ({ ...prev, phase: "done" }));
    } catch {
      patchLastWithUI("submitting", {
        bookingUI: null,
        content: "Something went wrong — please call us at (914) 776-5331 to confirm.",
      });
      setBooking(null);
    }
  }, [addMsg, patchLastWithUI]);

  // ── Send text ─────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    addMsg({ role: "user", content: text });

    if (!bookingRef.current && /\b(book|schedul|appoint|reserv)\b/i.test(text)) {
      addMsg({
        role: "assistant",
        content: "I can help you book right here!",
        actions: ["Book an appointment"],
      });
      return;
    }
    askAI(text);
  }, [input, isStreaming, addMsg, askAI]);

  const handleAction = useCallback((action) => {
    if (action === "Book an appointment") {
      startBooking();
    } else if (action === "Services & hours") {
      addMsg({ role: "user", content: "What services do you offer and what are your hours?" });
      askAI("What services do you offer and what are your hours?");
    }
  }, [startBooking, addMsg, askAI]);

  const cancelBooking = useCallback(() => {
    setBooking(null);
    addMsg({ role: "assistant", content: "Booking cancelled. Let me know if you have any other questions!", actions: ["Book an appointment"] });
  }, [addMsg]);

  const inBookingFlow = booking && !["done", null].includes(booking?.phase);

  return (
    <>
      {isOpen && (
        <div className="cwt" role="dialog" aria-label="Chat with Ralph & Son">
          <div className="cwt__header">
            <div className="cwt__header-left">
              <span className="cwt__avatar-sm" aria-hidden="true">R&amp;S</span>
              <div>
                <p className="cwt__shop-name">Ralph and Sons Auto</p>
                <p className="cwt__online">● Online now</p>
              </div>
            </div>
            <div className="cwt__header-right">
              {inBookingFlow && (
                <button className="cwt__cancel-link" onClick={cancelBooking} aria-label="Cancel booking">
                  Cancel
                </button>
              )}
              <button className="cwt__close-btn" onClick={() => setIsOpen(false)} aria-label="Close chat">
                ∨
              </button>
            </div>
          </div>

          <div className="cwt__messages">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                msg={msg}
                onAction={handleAction}
                onServiceSelect={handleServiceSelect}
                onVehicleSubmit={handleVehicleSubmit}
                onDateSelect={handleDateSelect}
                onTimeSelect={handleTimeSelect}
                onContactSubmit={handleContactSubmit}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="cwt__input-row">
            <input
              className="cwt__input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={isStreaming ? "Thinking…" : "Ask a question…"}
              disabled={isStreaming}
              aria-label="Chat message"
            />
            <button
              className="cwt__send"
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              aria-label="Send"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <button
        className={`cwt-fab${isOpen ? " cwt-fab--open" : ""}`}
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="cwt-fab__badge" aria-label="1 unread message">1</span>
          </>
        )}
      </button>
    </>
  );
}
