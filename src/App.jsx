import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import emailjs from "@emailjs/browser";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const GOOGLE_REVIEW_URL =
  "https://www.google.com/search?sca_esv=27b04becbc364c98&sxsrf=ANbL-n4oMV1KYl6tcLAKfLFnkveXAywSzw:1776101633257&si=AL3DRZHrmvnFAVQPOO2Bzhf8AX9KZZ6raUI_dT7DG_z0kV2_xyU4POkNzp832qcDkBKyg_-4oqT-5XzwWMPvtiH_sjSuYhkBPRwu_bKStKoT6awuf-Yq2fcHmVKX7woOQKyr7_Ug_eRV&q=Ralph+and+Sons+Reviews&sa=X&ved=2ahUKEwj3rr2XruuTAxW-MWIAHRr_KB0Q0bkNegQIIRAF&biw=1728&bih=972&dpr=2";
const SHOP_NAME = "Ralph & Sons Auto Repair";
const SHOP_PHONE = "(914) 776-5331";
const SHOP_PHONE_HREF = "tel:9147765331";
const SHOP_ADDRESS = "701 N Macquesten Pkwy, Mount Vernon, NY 10552";
const SHOP_MAP_URL = "https://maps.google.com/?q=701+N+Macquesten+Pkwy+Mount+Vernon+NY+10552";
const SHOP_MAP_EMBED_URL =
  "https://maps.google.com/maps?q=701%20N%20Macquesten%20Pkwy%20Mount%20Vernon%20NY%2010552&output=embed";

const SERVICE_AREAS = [
  "Mount Vernon",
  "Fleetwood",
  "Bronxville",
  "Yonkers",
  "New Rochelle",
  "Pelham",
  "Eastchester",
  "Tuckahoe",
];

const LEAD_CARD_TITLE = "Book an appointment with Ralph & Son's";
const LEAD_CARD_BODY =
  "Pick a preferred time, tell us about your vehicle, and we will follow up with next-step guidance and scheduling options.";

const VEHICLE_YEAR_OPTIONS = (() => {
  const current = new Date().getFullYear();
  const years = [];
  for (let i = 0; i <= 42; i += 1) years.push(current - i);
  return years;
})();

const VEHICLE_MAKE_OPTIONS = [
  "Acura",
  "Audi",
  "BMW",
  "Buick",
  "Cadillac",
  "Chevrolet",
  "Chrysler",
  "Dodge",
  "Ford",
  "Genesis",
  "GMC",
  "Honda",
  "Hyundai",
  "Infiniti",
  "Jaguar",
  "Jeep",
  "Kia",
  "Land Rover",
  "Lexus",
  "Lincoln",
  "Mazda",
  "Mercedes-Benz",
  "Mini",
  "Mitsubishi",
  "Nissan",
  "Porsche",
  "Ram",
  "Subaru",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
]
  .sort((a, b) => a.localeCompare(b))
  .concat(["Other"]);

/** In-app booking modal (hash only — no third-party scheduler). */
const BOOKING_MODAL_HREF = "#book";

/** EmailJS (https://www.emailjs.com/) — set in `.env` per EMAILJS.md */
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID ?? "";
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID ?? "";
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? "";

function isEmailJsConfigured() {
  return Boolean(EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY);
}

function opensBookingModal(href) {
  return href === BOOKING_MODAL_HREF || href === "#schedule";
}

function isExternalHttpUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

function ctaHrefWithBookingDefault(section) {
  return section.ctaLink || BOOKING_MODAL_HREF;
}

function getActivePageFromHash(hash) {
  if (hash === "#services") return "services";
  if (hash === "#reviews") return "reviews";
  return "home";
}

function resetScrollToTop() {
  if (typeof window === "undefined") return;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function reviewAgeInMonths(label) {
  const normalized = String(label || "").toLowerCase();
  const match = normalized.match(/(\d+)\s*(month|months|year|years)/);
  if (!match) return Number.POSITIVE_INFINITY;
  const value = Number(match[1]);
  return match[2].startsWith("year") ? value * 12 : value;
}

const CUSTOMER_REVIEWS = [
  {
    name: "Michael Krauss",
    date: "4 months ago",
    quote:
      "My experience here has been really excellent. The staff is friendly and competent and they always finish quickly.",
  },
  {
    name: "Paul M.",
    date: "8 months ago",
    quote:
      "I have been coming here for decades. They are friendly and always explain what and why something needs attention.",
  },
  {
    name: "LadyCane",
    date: "10 months ago",
    quote: "Everything was explained from start to finish with professionalism and care.",
  },
  {
    name: "BEASTMODEHAWK",
    date: "6 months ago",
    quote: "Ralph is very honest and you cannot beat their prices. I would recommend them to anyone.",
  },
  {
    name: "Mark Mittelhauser",
    date: "9 months ago",
    quote: "One of the best experiences I have had at a mechanic shop. Professional, quick, and fairly priced.",
  },
  {
    name: "Steven Carpio",
    date: "8 months ago",
    quote: "Fair price, great work, and super happy with the results.",
  },
  {
    name: "Steve Shapiro",
    date: "9 months ago",
    quote: "Ralph fixed my vehicle correctly the first time and has taken care of my cars ever since.",
  },
  {
    name: "Robert Licata",
    date: "2 years ago",
    quote: "Our family has trusted Ralph and his team for decades and they have never let us down.",
  },
  {
    name: "Josh Bloom",
    date: "9 years ago",
    quote: "Best auto service business I have used. Polite team, high-quality work, and total trust.",
  },
  {
    name: "Patrick G",
    date: "2 years ago",
    quote: "They took on my Jaguar when many shops would not and resolved the issue with professionalism.",
  },
  {
    name: "Evan Levy",
    date: "1 year ago",
    quote: "Friendly and competent staff. Quick, professional, and honest every visit.",
  },
  {
    name: "T Claz",
    date: "2 years ago",
    quote: "Great customer service and fairly priced repairs done as quickly as possible.",
  },
  {
    name: "Sharla Browne",
    date: "3 years ago",
    quote: "Best service, prices, and mechanics I have ever encountered. They are consistently friendly and skilled.",
  },
  {
    name: "Mike Lombinsero",
    date: "7 months ago",
    quote: "Reliable and honest. I have been taking my car here for years.",
  },
  {
    name: "Jovan Rivers",
    date: "1 year ago",
    quote: "Ralph, Tim, and the team always take care of my family vehicles. 10 out of 10.",
  },
].sort((a, b) => reviewAgeInMonths(a.date) - reviewAgeInMonths(b.date));

const cards = [
  {
    id: 2,
    type: "text",
    variant: "minimal",
    title: "What Local Customers Say",
    body: "Real feedback from local drivers who trust us with their vehicles.",
    googleRating: "4.8/5",
    reviews: CUSTOMER_REVIEWS,
  },
  {
    id: 3,
    type: "text",
    variant: "bright",
    title: "Repair Services We Offer:",
    body: "From diagnostics to major repairs, our team keeps Mount Vernon drivers safe and on schedule.",
    points: [
      "Power Windows & Doors",
      "Exhaust System & Mufflers",
      "Air Conditioning",
      "Timing Belts",
      "Oil Change",
      "Check Engine Light",
      "Brakes",
      "Suspension",
      "Transmission Service",
      "Wheel Bearings",
    ],
    cta: "View all services",
    ctaLink: "#services",
    ctaStyle: "secondary",
  },
  {
    id: 4,
    type: "image",
    mediaType: "image",
    mediaSrc: "/images/shop-1.png",
    variant: "scale",
    title: "Meet Ralph",
    body: "Ralph has built this shop on trust, transparency, and quality workmanship. He treats every customer like a neighbor and every vehicle like his own.",
    offer: "The Owner",
    offerDetail: "Local · Honest · Experienced",
  },
  {
    id: 5,
    type: "image",
    mediaType: "image",
    mediaSrc: "/images/shop-3.png",
    variant: "engage",
    title: "Major repairs handled with quality workmanship",
    body: "From engine and transmission concerns to brake and suspension work, we focus on long-term fixes you can trust.",
    metric: "40+",
    metricLabel: "Years Trusted",
  },
  {
    id: 6,
    type: "text",
    variant: "map",
    title: "Find us in Mount Vernon",
    body: "Easy drop-off access near Fleetwood Train Station.",
    cta: "Open in Google Maps",
    ctaLink: SHOP_MAP_URL,
  },
  {
    id: 7,
    type: "text",
    variant: "dark",
    title: "Honest shop. Exceptional customer service.",
    body: "Customers choose Ralph & Sons because we communicate clearly, price fairly, and stand behind our work.",
    points: ["No surprise charges", "Repair options explained", "Community-trusted service"],
    price: "Free",
    period: "estimates",
  },
];

const serviceDetails = [
  {
    title: "NY State Inspection",
    startingPrice: "Starting at $37",
    symptoms: ["Inspection due date approaching", "Registration renewal needed", "Warning lights before inspection"],
    included: ["Safety and emissions checks", "Pass/fail results explained", "Guidance on any required repairs"],
  },
  {
    title: "Oil Change Service",
    startingPrice: "Starting at $49",
    symptoms: ["Oil life indicator alert", "Dark or low oil", "Louder engine operation"],
    included: ["Oil and filter replacement", "Fluid top-off", "Multi-point visual inspection"],
  },
  {
    title: "Brake Repair",
    startingPrice: "Request a Quote",
    symptoms: ["Squealing or grinding noises", "Soft brake pedal", "Longer stopping distance"],
    included: ["Brake inspection", "Pad/rotor recommendations", "Road test and safety check"],
  },
  {
    title: "Engine Diagnostics",
    startingPrice: "Request a Quote",
    symptoms: ["Check engine light is on", "Rough idle or stalling", "Loss of power or hesitation"],
    included: ["Computer code scan", "System testing", "Clear repair plan with estimate"],
  },
  {
    title: "Suspension & Steering",
    startingPrice: "Request a Quote",
    symptoms: ["Vehicle pulling to one side", "Bumpy or unstable ride", "Steering feels loose"],
    included: ["Steering and suspension check", "Component wear assessment", "Repair estimate and alignment guidance"],
  },
  {
    title: "Battery & Charging System",
    startingPrice: "Request a Quote",
    symptoms: ["Slow engine crank", "Battery warning light", "Electrical accessories cutting out"],
    included: ["Battery and alternator testing", "Terminal and cable inspection", "Replacement recommendations"],
  },
  {
    title: "Cooling System Service",
    startingPrice: "Request a Quote",
    symptoms: ["Temperature gauge running hot", "Coolant leaks under vehicle", "Heater not working properly"],
    included: ["Cooling pressure test", "Radiator and hose inspection", "Coolant service recommendations"],
  },
  {
    title: "Transmission Service",
    startingPrice: "Request a Quote",
    symptoms: ["Delayed gear engagement", "Hard shifting", "Transmission fluid leak"],
    included: ["Fluid condition inspection", "System performance check", "Service/repair recommendations"],
  },
  {
    title: "A/C & Heating Repair",
    startingPrice: "Request a Quote",
    symptoms: ["Weak airflow", "Warm air from A/C vents", "No cabin heat in cold weather"],
    included: ["HVAC system diagnostics", "Leak and pressure checks", "Repair quote with parts options"],
  },
  {
    title: "Exhaust & Muffler Repair",
    startingPrice: "Request a Quote",
    symptoms: ["Loud exhaust noise", "Rattling under vehicle", "Reduced fuel efficiency"],
    included: ["Exhaust leak diagnostics", "Muffler and pipe inspection", "Repair/replacement options"],
  },
];

/** Service dropdown options aligned with Services page + Other (booking wizard). */
const BOOKING_SERVICE_OPTIONS = [...serviceDetails.map((s) => s.title), "Other"];

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "AutoRepair",
  name: SHOP_NAME,
  telephone: SHOP_PHONE,
  address: {
    "@type": "PostalAddress",
    streetAddress: "701 N Macquesten Pkwy",
    addressLocality: "Mount Vernon",
    addressRegion: "NY",
    postalCode: "10552",
    addressCountry: "US",
  },
  areaServed: SERVICE_AREAS.map((area) => ({
    "@type": "City",
    name: area,
  })),
  sameAs: [GOOGLE_REVIEW_URL],
};

const LEAD_TIME_SLOTS = (() => {
  const slots = [];
  for (let t = 8 * 60; t < 17 * 60; t += 30) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    const d = new Date(2000, 0, 1, h, m);
    slots.push({
      label: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      value: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    });
  }
  return slots;
})();

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function firstDayOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function monthMatrix(monthAnchor) {
  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth();
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return { year, month, rows };
}

function dateKeyFromParts(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDateKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateKeyMMDDYYYY(key) {
  const [y, m, d] = key.split("-");
  return `${m}-${d}-${y}`;
}

function isClosedWeekday(year, month, day) {
  return new Date(year, month, day).getDay() === 0;
}

function buildGoogleCalendarUrl({ title, dateKey, timeValue, durationMinutes = 60, description, location }) {
  const [y, mo, d] = dateKey.split("-").map(Number);
  const [h, m] = timeValue.split(":").map(Number);
  const start = new Date(y, mo - 1, d, h, m);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const fmt = (dt) =>
    dt.getFullYear().toString() +
    String(dt.getMonth() + 1).padStart(2, "0") +
    String(dt.getDate()).padStart(2, "0") +
    "T" +
    String(dt.getHours()).padStart(2, "0") +
    String(dt.getMinutes()).padStart(2, "0") +
    "00";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: description,
    location: location || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Duplicated .reviews-track inside .reviews-track-wrap; scrolls by exactly one track width.
 * Waits for fonts + two rAFs so scrollWidth matches paint, remeasures on resize when width changes.
 */
function useReviewsMarquee({
  trackWrapRef,
  trackRef,
  cloneTrackRef,
  enabled,
  introStaggerPx,
  introDuration,
  introStagger,
  speedPxPerSec = 72,
  extraDeps = [],
}) {
  useEffect(() => {
    if (!enabled) return undefined;

    const trackWrap = trackWrapRef.current;
    const track = trackRef.current;
    const cloneTrack = cloneTrackRef.current;
    if (!trackWrap || !track || !cloneTrack) return undefined;

    const cards = [...track.querySelectorAll(".review-item"), ...cloneTrack.querySelectorAll(".review-item")];

    let marqueeTween = null;
    let resizeTimeout;

    const measureLoopWidth = () =>
      Math.round(Math.max(track.scrollWidth, cloneTrack.scrollWidth));

    let lastLoopWidth = -1;

    const killMarquee = () => {
      if (marqueeTween) {
        marqueeTween.kill();
        marqueeTween = null;
      }
      gsap.killTweensOf(trackWrap);
    };

    const playMarquee = (w) => {
      killMarquee();
      gsap.set(trackWrap, { x: 0 });
      marqueeTween = gsap.to(trackWrap, {
        x: -w,
        duration: w / speedPxPerSec,
        ease: "none",
        repeat: -1,
      });
    };

    const runFull = () => {
      killMarquee();
      gsap.killTweensOf(cards);
      const w = measureLoopWidth();
      if (!w) return;
      lastLoopWidth = w;
      gsap.set(cards, { x: introStaggerPx, opacity: 0 });
      gsap.to(cards, {
        x: 0,
        opacity: 1,
        duration: introDuration,
        ease: "power3.out",
        stagger: introStagger,
      });
      playMarquee(w);
    };

    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const w = measureLoopWidth();
        if (!w) return;
        if (lastLoopWidth !== -1 && Math.abs(w - lastLoopWidth) < 2) return;
        lastLoopWidth = w;
        playMarquee(w);
      }, 100);
    });

    const schedule = () => {
      const exec = () => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            runFull();
            ro.observe(track);
          });
        });
      };
      if (typeof document !== "undefined" && document.fonts?.ready) {
        document.fonts.ready.then(exec);
      } else {
        exec();
      }
    };

    schedule();

    return () => {
      clearTimeout(resizeTimeout);
      ro.disconnect();
      killMarquee();
      gsap.killTweensOf(cards);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- extraDeps carries review identity
  }, [enabled, introStaggerPx, introDuration, introStagger, speedPxPerSec, ...extraDeps]);
}

function MechanicLeadWizard({ title, body, variant = "page", onSubmitted }) {
  const leadFormRef = useRef(null);
  const calendarColRef = useRef(null);
  const leadTimesRef = useRef(null);
  const timesPrevKeyRef = useRef(null);
  const [submitStatus, setSubmitStatus] = useState("idle");
  const [submitError, setSubmitError] = useState(null);
  const [step, setStep] = useState(1);
  const [monthAnchor, setMonthAnchor] = useState(() => firstDayOfMonth(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [calCollapsed, setCalCollapsed] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);
  const [slotAvailability, setSlotAvailability] = useState({});
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleTrim, setVehicleTrim] = useState("");
  const [serviceRequested, setServiceRequested] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const today = startOfToday();
  const todayKey = dateKeyFromParts(today.getFullYear(), today.getMonth(), today.getDate());
  const anchorStart = firstDayOfMonth(monthAnchor);
  const currentMonthStart = firstDayOfMonth(new Date());
  const canGoPrev = anchorStart > currentMonthStart;

  const { year, month, rows } = monthMatrix(monthAnchor);

  const composedEmailBody = useMemo(() => {
    const timeLabel = selectedTime
      ? LEAD_TIME_SLOTS.find((s) => s.value === selectedTime)?.label || selectedTime
      : "";
    return [
      `${SHOP_NAME} — appointment request`,
      "",
      `Appointment Date: ${selectedDateKey ? formatDateKeyMMDDYYYY(selectedDateKey) : "—"}`,
      `Appointment Time: ${timeLabel || "—"}`,
      `Service: ${serviceRequested || "—"}`,
      `Issue: ${issueDescription.trim() || "—"}`,
      `Vehicle: ${vehicleYear || "—"} ${vehicleMake || "—"} ${vehicleModel || "—"}${vehicleTrim ? ` (${vehicleTrim})` : ""}`,
      "",
      `Name: ${contactName || "—"}`,
      `Email: ${contactEmail || "—"}`,
      `Phone: ${contactPhone || "—"}`,
    ].join("\n");
  }, [
    selectedDateKey,
    selectedTime,
    serviceRequested,
    issueDescription,
    vehicleYear,
    vehicleMake,
    vehicleModel,
    vehicleTrim,
    contactName,
    contactEmail,
    contactPhone,
  ]);

  useEffect(() => {
    if (EMAILJS_PUBLIC_KEY) {
      emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    }
  }, []);

  useLayoutEffect(() => {
    if (step !== 1) return;
    const root = calendarColRef.current;
    if (!root) return;
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const head = root.querySelector(".lead-cal__head");
      const weekdays = root.querySelector(".lead-cal__weekdays");
      const rows = root.querySelectorAll(".lead-cal__row");
      const tz = root.querySelector(".lead-schedule__tz");

      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      if (head) {
        tl.fromTo(head, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.38 });
      }
      if (weekdays) {
        tl.fromTo(weekdays, { opacity: 0 }, { opacity: 1, duration: 0.22 }, "-=0.18");
      }
      if (rows.length) {
        tl.fromTo(
          rows,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.055 },
          "-=0.12"
        );
      }
      if (tz) {
        tl.fromTo(tz, { opacity: 0 }, { opacity: 1, duration: 0.28 }, "-=0.2");
      }
    }, root);

    return () => ctx.revert();
  }, [step]);

  useLayoutEffect(() => {
    if (step !== 1) {
      timesPrevKeyRef.current = null;
      return;
    }
    if (!selectedDateKey) {
      timesPrevKeyRef.current = null;
      return;
    }

    const el = leadTimesRef.current;
    if (!el) return;

    const hadPriorDate = timesPrevKeyRef.current !== null;
    timesPrevKeyRef.current = selectedDateKey;
    if (hadPriorDate) return;

    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { xPercent: 100, opacity: 0 },
        { xPercent: 0, opacity: 1, duration: 0.58, ease: "power3.out" }
      );
    }, el);

    return () => ctx.revert();
  }, [step, selectedDateKey]);

  const handleLeadSubmit = async (event) => {
    event.preventDefault();
    if (!isEmailJsConfigured()) {
      setSubmitError("Email is not configured. Add VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY to your environment.");
      setSubmitStatus("error");
      return;
    }
    if (!leadFormRef.current) return;

    setSubmitError(null);
    setSubmitStatus("sending");
    try {
      const reserveRes = await fetch("/api/record-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateKey: selectedDateKey, timeValue: selectedTime }),
      }).catch(() => null);

      if (reserveRes && reserveRes.status === 409) {
        const err409 = await reserveRes.json().catch(() => ({}));
        setSlotAvailability((prev) => ({
          ...prev,
          [selectedTime]: { booked: 2, remaining: 0 },
        }));
        setSelectedTime(null);
        setSubmitError(err409.error || "This time slot was just booked. Please pick another time.");
        setSubmitStatus("error");
        setStep(1);
        return;
      }

      await emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, leadFormRef.current, {
        publicKey: EMAILJS_PUBLIC_KEY,
      });
      setSubmitStatus("sent");

      setSlotAvailability((prev) => {
        const cur = prev[selectedTime]?.booked || 0;
        return { ...prev, [selectedTime]: { booked: cur + 1, remaining: Math.max(0, 2 - cur - 1) } };
      });

      fetch("/api/create-calendar-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateKey: selectedDateKey,
          timeValue: selectedTime,
          contactName,
          contactEmail,
          contactPhone,
          serviceRequested,
          issueDescription,
          vehicleYear,
          vehicleMake,
          vehicleModel,
          vehicleTrim,
        }),
      }).catch(() => {});
    } catch (err) {
      const msg =
        (typeof err?.text === "string" && err.text) ||
        err?.message ||
        (typeof err === "string" ? err : null) ||
        "Something went wrong. Please try again or call the shop.";
      setSubmitError(msg);
      setSubmitStatus("error");
    }
  };

  const selectedDateLabel =
    selectedDateKey &&
    parseDateKey(selectedDateKey).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

  const step1Complete = Boolean(selectedDateKey && selectedTime);
  const step2Complete =
    serviceRequested.trim().length > 0 &&
    vehicleMake.trim().length > 0 &&
    vehicleModel.trim().length > 0 &&
    vehicleYear.trim().length > 0;
  const step3Complete =
    contactName.trim().length > 0 &&
    contactEmail.trim().length > 0 &&
    contactPhone.trim().length > 0;

  useEffect(() => {
    if (!selectedDateKey) {
      setSlotAvailability({});
      return;
    }
    let cancelled = false;
    fetch(`/api/get-slot-availability?date=${selectedDateKey}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!cancelled && data?.slots) setSlotAvailability(data.slots);
      })
      .catch(() => {
        if (!cancelled) setSlotAvailability({});
      });
    return () => { cancelled = true; };
  }, [selectedDateKey]);

  const selectDay = (day) => {
    if (day == null) return;
    if (isClosedWeekday(year, month, day)) return;
    const candidate = new Date(year, month, day);
    candidate.setHours(0, 0, 0, 0);
    if (candidate < today) return;
    const key = dateKeyFromParts(year, month, day);
    setSelectedDateKey(key);
    setSelectedTime(null);
    if (window.innerWidth < 768) setCalCollapsed(true);
  };

  return (
    <div
      className={`marketing-card marketing-card--text marketing-card--lead${
        variant === "modal" ? " marketing-card--lead-modal" : ""
      }`}
    >
      <h3
        className="marketing-card__title"
        id={variant === "modal" ? "booking-wizard-title" : undefined}
      >
        {title}
      </h3>
      <p className="marketing-card__body">{body}</p>

      <div className="lead-wizard" aria-label="Schedule contact steps">
        <div className="lead-wizard__step-row">
          {step > 1 && (
            <button
              type="button"
              className="lead-wizard__step-back"
              onClick={() => setStep((s) => s - 1)}
              aria-label="Go back"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <p className="lead-wizard__step-label">
            {step === 1 &&
              (variant === "modal" ? "Select a date & time" : "1 — Pick a date & time")}
            {step === 2 && (variant === "modal" ? "Service & vehicle" : "2 — Service & vehicle")}
            {step === 3 && (variant === "modal" ? "Contact details" : "3 — Contact details")}
          </p>
          <ol className="lead-wizard__rail" aria-hidden="true">
            <li className={step >= 1 ? "lead-wizard__rail-dot is-active" : "lead-wizard__rail-dot"} />
            <li className={step >= 2 ? "lead-wizard__rail-dot is-active" : "lead-wizard__rail-dot"} />
            <li className={step >= 3 ? "lead-wizard__rail-dot is-active" : "lead-wizard__rail-dot"} />
          </ol>
        </div>

        <form
          ref={leadFormRef}
          className="lead-form lead-form--wizard"
          name="mechanic-lead"
          onSubmit={handleLeadSubmit}
        >
          {/* Field names should match your EmailJS template variables (e.g. {{user_name}}, {{message}}). */}
          <input
            type="hidden"
            name="title"
            value={`${selectedDateKey ? formatDateKeyMMDDYYYY(selectedDateKey) : "—"}, ${
              selectedTime
                ? LEAD_TIME_SLOTS.find((s) => s.value === selectedTime)?.label || selectedTime
                : "—"
            } - ${contactName.trim() || ""}`}
            readOnly
          />
          <input type="hidden" name="appointment_date" value={selectedDateKey || ""} readOnly />
          <input type="hidden" name="appointment_time" value={selectedTime || ""} readOnly />
          <input type="hidden" name="vehicle_make" value={vehicleMake} readOnly />
          <input type="hidden" name="vehicle_model" value={vehicleModel} readOnly />
          <input type="hidden" name="vehicle_year" value={vehicleYear} readOnly />
          <input type="hidden" name="vehicle_trim" value={vehicleTrim} readOnly />
          <input type="hidden" name="service_requested" value={serviceRequested} readOnly />
          <input type="hidden" name="issue_description" value={issueDescription} readOnly />
          <input type="hidden" name="customer_phone" value={contactPhone} readOnly />
          <input type="hidden" name="logo_url" value={`${window.location.origin}/images/ralph-sons-logo.png`} readOnly />
          <textarea name="message" readOnly className="lead-form__hidden" value={composedEmailBody} rows={1} />

          {step === 1 && (
            <div className="lead-wizard__panel lead-wizard__panel--schedule">
              <div className="lead-schedule">
                <div
                  className={`lead-schedule__layout${
                    selectedDateKey ? " lead-schedule__layout--with-times" : ""
                  }`}
                >
                  <div className="lead-schedule__calendar" ref={calendarColRef}>
                    {selectedDateKey && calCollapsed && (
                      <button
                        type="button"
                        className="lead-cal-toggle"
                        onClick={() => setCalCollapsed(false)}
                      >
                        <span className="lead-cal-toggle__label">
                          {selectedDateLabel} <span className="lead-cal-toggle__change">Change date</span>
                        </span>
                        <span className="lead-cal-toggle__icon" aria-hidden="true">▼</span>
                      </button>
                    )}
                    <div className={`lead-cal${calCollapsed && selectedDateKey ? " lead-cal--collapsed" : ""}`}>
                      <div className="lead-cal__head">
                        <button
                          type="button"
                          className="lead-cal__nav"
                          disabled={!canGoPrev}
                          onClick={() =>
                            setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                          }
                          aria-label="Previous month"
                        >
                          ‹
                        </button>
                        <span className="lead-cal__title">
                          {monthAnchor.toLocaleString("en-US", { month: "long", year: "numeric" })}
                        </span>
                        <button
                          type="button"
                          className="lead-cal__nav"
                          onClick={() =>
                            setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                          }
                          aria-label="Next month"
                        >
                          ›
                        </button>
                      </div>
                      <div className="lead-cal__weekdays">
                        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                          <span key={`wd-${i}`}>{d}</span>
                        ))}
                      </div>
                      <div className="lead-cal__grid" role="grid" aria-label="Choose a day">
                        {rows.map((week, wi) => (
                          <div key={wi} className="lead-cal__row" role="row">
                            {week.map((day, di) => {
                              if (day == null) {
                                return (
                                  <div key={`e-${wi}-${di}`} className="lead-cal__cell lead-cal__cell--empty" />
                                );
                              }
                              const disabled =
                                isClosedWeekday(year, month, day) ||
                                new Date(year, month, day) < today;
                              const key = dateKeyFromParts(year, month, day);
                              const isSelected = selectedDateKey === key;
                              const isToday = key === todayKey;
                              const isAvailable = !disabled && !isSelected;
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  role="gridcell"
                                  disabled={disabled}
                                  className={`lead-cal__day${isSelected ? " is-selected" : ""}${
                                    isAvailable ? " is-available" : ""
                                  }${isToday ? " is-today" : ""}`}
                                  title={isToday ? "Today" : undefined}
                                  onClick={() => selectDay(day)}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="lead-schedule__tz">Times shown in Eastern Time — US & Canada</p>
                  </div>

                  {selectedDateKey ? (
                    <div className="lead-times" ref={leadTimesRef} aria-live="polite">
                      <p className="lead-times__heading">{selectedDateLabel}</p>
                      <p className="lead-times__hint">Shop hours Mon–Sat · pick a start time</p>
                      <div className="lead-times__slots" aria-label="Available start times">
                        {LEAD_TIME_SLOTS.map((slot) => {
                          const isOn = selectedTime === slot.value;
                          const isSelectedToday = selectedDateKey === todayKey;
                          let isPast = false;
                          if (isSelectedToday) {
                            const now = new Date();
                            const cutoff = now.getHours() * 60 + now.getMinutes() + 30;
                            const [slotH, slotM] = slot.value.split(":").map(Number);
                            isPast = slotH * 60 + slotM <= cutoff;
                          }
                          if (isPast) return null;
                          const avail = slotAvailability[slot.value];
                          const booked = avail?.booked || 0;
                          const isFull = booked >= 2;
                          const lastSpot = booked === 1;
                          if (isFull) return null;
                          return (
                            <button
                              key={slot.value}
                              type="button"
                              aria-pressed={isOn}
                              className={`lead-times__slot${isOn ? " is-selected" : ""}${lastSpot ? " is-limited" : ""}`}
                              onClick={() => setSelectedTime(slot.value)}
                            >
                              {slot.label}
                              {lastSpot && <span className="lead-times__badge lead-times__badge--last">1 spot left</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="lead-wizard__panel lead-wizard__panel--vehicle">
              <label className="lead-wizard__field--full">
                <span>Select a service<span className="required-star">*</span></span>
                <select
                  value={serviceRequested}
                  onChange={(e) => setServiceRequested(e.target.value)}
                  required
                >
                  <option value="">Select a service</option>
                  {BOOKING_SERVICE_OPTIONS.map((title) => (
                    <option key={title} value={title}>
                      {title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="lead-wizard__field--full">
                <span>Describe the issue (optional)</span>
                <textarea
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  rows={3}
                  autoComplete="off"
                  placeholder="What symptoms, noises, or concerns should we know about?"
                />
              </label>
              <div className="lead-wizard__vehicle-grid">
                <label>
                  <span>Year<span className="required-star">*</span></span>
                  <select
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value)}
                    required
                  >
                    <option value="">Select year</option>
                    {VEHICLE_YEAR_OPTIONS.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Make<span className="required-star">*</span></span>
                  <select
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    required
                  >
                    <option value="">Select make</option>
                    {VEHICLE_MAKE_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Model<span className="required-star">*</span></span>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. Accord"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>Trim / notes (optional)</span>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. EX-L, hybrid"
                    value={vehicleTrim}
                    onChange={(e) => setVehicleTrim(e.target.value)}
                  />
                </label>
              </div>
            </div>
          )}

          {step === 3 && submitStatus === "sent" ? (
            <div className="lead-wizard__panel lead-wizard__panel--confirmation">
              <div className="lead-wizard__confirmation">
                <svg className="lead-wizard__confirmation-icon" viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
                  <circle cx="24" cy="24" r="22" fill="#dcfce7" stroke="#22c55e" strokeWidth="2" />
                  <path d="M14 25l7 7 13-13" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="lead-form__status lead-form__status--ok" role="status">
                  Request sent! We will be in touch soon.
                </p>
                <p className="lead-wizard__recap">
                  <strong>Requested time:</strong>{" "}
                  {parseDateKey(selectedDateKey).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })} · {LEAD_TIME_SLOTS.find((s) => s.value === selectedTime)?.label || selectedTime}
                  <br />
                  <strong>Service:</strong> {serviceRequested || "—"}
                  <br />
                  <strong>Vehicle:</strong> {vehicleYear} {vehicleMake} {vehicleModel}
                  {vehicleTrim ? ` · ${vehicleTrim}` : ""}
                </p>
              </div>
            </div>
          ) : step === 3 ? (
            <div className="lead-wizard__panel">
              <label>
                <span>Name<span className="required-star">*</span></span>
                <input
                  type="text"
                  name="user_name"
                  autoComplete="name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  required
                />
              </label>
              <label>
                <span>Email<span className="required-star">*</span></span>
                <input
                  type="email"
                  name="user_email"
                  autoComplete="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                />
              </label>
              <label>
                <span>Phone<span className="required-star">*</span></span>
                <input
                  type="tel"
                  name="user_phone"
                  autoComplete="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  required
                />
              </label>
              <p className="lead-wizard__recap">
                <strong>Requested time:</strong>{" "}
                {selectedDateKey && selectedTime
                  ? `${parseDateKey(selectedDateKey).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })} · ${LEAD_TIME_SLOTS.find((s) => s.value === selectedTime)?.label || selectedTime}`
                  : "—"}
                <br />
                <strong>Service:</strong> {serviceRequested || "—"}
                <br />
                <strong>Issue:</strong> {issueDescription.trim() || "—"}
                <br />
                <strong>Vehicle:</strong> {vehicleYear} {vehicleMake} {vehicleModel}
                {vehicleTrim ? ` · ${vehicleTrim}` : ""}
              </p>
            </div>
          ) : null}

          <div className="lead-wizard__footer">
            {submitStatus === "sent" ? (
              <>
                <a
                  href={buildGoogleCalendarUrl({
                    title: `${serviceRequested || "Appointment"} — ${SHOP_NAME}`,
                    dateKey: selectedDateKey,
                    timeValue: selectedTime,
                    description: [
                      `Service: ${serviceRequested}`,
                      issueDescription.trim() ? `Issue: ${issueDescription.trim()}` : "",
                      `Vehicle: ${vehicleYear} ${vehicleMake} ${vehicleModel}${vehicleTrim ? ` (${vehicleTrim})` : ""}`,
                      "",
                      `Contact: ${contactName} · ${contactEmail} · ${contactPhone}`,
                    ].filter(Boolean).join("\n"),
                    location: SHOP_ADDRESS,
                  })}
                  target="_blank"
                  rel="noreferrer"
                  className="lead-wizard__cal-btn lead-wizard__cal-btn--user"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="17" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M3 9h18" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  Add to your calendar
                </a>
                <button
                  type="button"
                  className="marketing-card__cta marketing-card__cta--dark lead-wizard__next"
                  onClick={() => onSubmitted?.()}
                >
                  Done
                </button>
              </>
            ) : (
              <>
                {step === 3 && submitError && (
                  <p className="lead-form__status lead-form__status--error lead-wizard__footer-error" role="alert">
                    {submitError}
                  </p>
                )}
                {step < 3 ? (
                  <button
                    type="button"
                    className="marketing-card__cta marketing-card__cta--dark lead-wizard__next"
                    disabled={(step === 1 && !step1Complete) || (step === 2 && !step2Complete)}
                    onClick={() => setStep((s) => s + 1)}
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="marketing-card__cta marketing-card__cta--dark lead-wizard__next"
                    disabled={!step3Complete || submitStatus === "sending"}
                  >
                    {submitStatus === "sending" ? "Sending…" : "Submit request"}
                  </button>
                )}
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function CardMedia({ section }) {
  if (section.mediaType === "video") {
    return (
      <video
        className="marketing-card__bg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      >
        <source src={section.mediaSrc} type="video/mp4" />
      </video>
    );
  }

  return <img src={section.mediaSrc} alt="Automotive service preview" className="marketing-card__bg" />;
}

function SectionCard({ section, onOpenBooking, onOpenServicesPage, onOpenReviewsPage }) {
  const reviewsTrackRef = useRef(null);
  const reviewsTrackCloneRef = useRef(null);
  const reviewsTrackWrapRef = useRef(null);
  const hasReviews = Boolean(section.reviews?.length);

  useReviewsMarquee({
    trackWrapRef: reviewsTrackWrapRef,
    trackRef: reviewsTrackRef,
    cloneTrackRef: reviewsTrackCloneRef,
    enabled: hasReviews,
    introStaggerPx: 36,
    introDuration: 1,
    introStagger: 0.05,
    speedPxPerSec: 72,
    extraDeps: [section.reviews],
  });

  if (section.type === "image") {
    if (section.variant === "focus") {
      return (
        <div className="marketing-card marketing-card--image marketing-card--focus">
          <CardMedia section={section} />
          <div className="image-focus__top">
            <span className="image-focus__badge">{section.badge}</span>
          </div>
          <div className="image-focus__bottom">
            <h3 className="marketing-card__title">{section.title}</h3>
            <p className="marketing-card__body">{section.body}</p>
            {section.cta && (
              <a
                href={section.ctaLink || "#"}
                target={section.ctaLink && isExternalHttpUrl(section.ctaLink) ? "_blank" : undefined}
                rel={section.ctaLink && isExternalHttpUrl(section.ctaLink) ? "noreferrer" : undefined}
                onClick={
                  section.ctaLink && opensBookingModal(section.ctaLink)
                    ? (event) => {
                        event.preventDefault();
                        onOpenBooking();
                      }
                    : undefined
                }
                className={`marketing-card__cta ${
                  section.ctaStyle === "light" ? "marketing-card__cta--light" : "marketing-card__cta--dark"
                }`}
              >
                {section.cta}
              </a>
            )}
          </div>
        </div>
      );
    }

    if (section.variant === "engage") {
      return (
        <div className="marketing-card marketing-card--image marketing-card--engage">
          <CardMedia section={section} />
          <div className="image-engage__metric">
            <strong>{section.metric}</strong>
            <span>{section.metricLabel}</span>
          </div>
          <div className="image-engage__content">
            <h3 className="marketing-card__title">{section.title}</h3>
            <p className="marketing-card__body">{section.body}</p>
            {section.cta && (
              <a
                href={ctaHrefWithBookingDefault(section)}
                target={isExternalHttpUrl(ctaHrefWithBookingDefault(section)) ? "_blank" : undefined}
                rel={isExternalHttpUrl(ctaHrefWithBookingDefault(section)) ? "noreferrer" : undefined}
                onClick={
                  section.ctaLink === "#services"
                    ? (event) => {
                        event.preventDefault();
                        onOpenServicesPage();
                      }
                    : opensBookingModal(ctaHrefWithBookingDefault(section))
                      ? (event) => {
                          event.preventDefault();
                          onOpenBooking();
                        }
                      : undefined
                }
                className={`marketing-card__cta ${
                  section.ctaStyle === "secondary" ? "marketing-card__cta--secondary" : "marketing-card__cta--dark"
                }`}
              >
                {section.cta}
              </a>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="marketing-card marketing-card--image marketing-card--scale">
        <CardMedia section={section} />
        <div className="image-scale__offer">
          <p>{section.offer}</p>
          <span>{section.offerDetail}</span>
        </div>
        <div className="image-scale__content">
          <h3 className="marketing-card__title">{section.title}</h3>
          <p className="marketing-card__body">{section.body}</p>
          {section.cta && (
            <a
              href={ctaHrefWithBookingDefault(section)}
              target={isExternalHttpUrl(ctaHrefWithBookingDefault(section)) ? "_blank" : undefined}
              rel={isExternalHttpUrl(ctaHrefWithBookingDefault(section)) ? "noreferrer" : undefined}
              onClick={
                opensBookingModal(ctaHrefWithBookingDefault(section))
                  ? (event) => {
                      event.preventDefault();
                      onOpenBooking();
                    }
                  : undefined
              }
              className="marketing-card__cta marketing-card__cta--dark"
            >
              {section.cta}
            </a>
          )}
        </div>
      </div>
    );
  }

  if (section.variant === "bright") {
    return (
      <div className="marketing-card marketing-card--text marketing-card--bright">
        <h3 className="marketing-card__title">{section.title}</h3>
        <p className="marketing-card__body">{section.body}</p>
        <ul className="feature-list">
          {section.points?.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        {(section.cta || section.subCta) && (
          <div className="card-actions">
            {section.cta && (
              <a
                href={ctaHrefWithBookingDefault(section)}
                target={isExternalHttpUrl(ctaHrefWithBookingDefault(section)) ? "_blank" : undefined}
                rel={isExternalHttpUrl(ctaHrefWithBookingDefault(section)) ? "noreferrer" : undefined}
                onClick={
                  opensBookingModal(ctaHrefWithBookingDefault(section))
                    ? (event) => {
                        event.preventDefault();
                        onOpenBooking();
                      }
                    : undefined
                }
                className="marketing-card__cta marketing-card__cta--dark"
              >
                {section.cta}
              </a>
            )}
            {section.subCta && (
              <a href={section.subCtaLink || "#"} className="text-link">
                {section.subCta}
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  if (section.variant === "dark") {
    return (
      <div className="marketing-card marketing-card--text marketing-card--dark">
        <h3 className="marketing-card__title">{section.title}</h3>
        <p className="marketing-card__body">{section.body}</p>
        <div className="pricing-box">
          <strong>{section.price}</strong>
          <span>{section.period}</span>
        </div>
        <div className="marketing-card__chips">
          {section.points?.map((point) => (
            <span key={point} className="chip">
              {point}
            </span>
          ))}
        </div>
        {section.cta && (
          <a
            href={ctaHrefWithBookingDefault(section)}
            target={isExternalHttpUrl(ctaHrefWithBookingDefault(section)) ? "_blank" : undefined}
            rel={isExternalHttpUrl(ctaHrefWithBookingDefault(section)) ? "noreferrer" : undefined}
            onClick={
              opensBookingModal(ctaHrefWithBookingDefault(section))
                ? (event) => {
                    event.preventDefault();
                    onOpenBooking();
                  }
                : undefined
            }
            className="marketing-card__cta marketing-card__cta--light"
          >
            {section.cta}
          </a>
        )}
      </div>
    );
  }

  if (section.variant === "map") {
    return (
      <div className="marketing-card marketing-card--text marketing-card--map">
        <div className="marketing-card__map-header">
          <div>
            <h3 className="marketing-card__title">{section.title}</h3>
            <p className="marketing-card__body">{section.body}</p>
          </div>
          {section.cta && (
            <a
              href={section.ctaLink || SHOP_MAP_URL}
              target="_blank"
              rel="noreferrer"
              className="marketing-card__cta marketing-card__cta--dark marketing-card__map-cta"
            >
              {section.cta}
            </a>
          )}
        </div>
        <div className="marketing-card__map-wrap">
          <iframe
            title="Ralph and Sons Auto Repair map widget"
            src={SHOP_MAP_EMBED_URL}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <p className="marketing-card__notice">
          <strong>Note:</strong> Ralph is no longer located at SLR Auto Repair in White Plains. Our only location is here in Fleetwood, Mount Vernon.
        </p>
      </div>
    );
  }

  if (section.variant === "lead") {
    return (
      <div className="marketing-card marketing-card--text marketing-card--lead">
        <h3 className="marketing-card__title">{section.title}</h3>
        <p className="marketing-card__body">{section.body}</p>
        <button type="button" className="marketing-card__cta marketing-card__cta--dark" onClick={onOpenBooking}>
          Book appointment
        </button>
      </div>
    );
  }

  if (section.reviews) {
    return (
      <section className="reviews-ticker" aria-label="Customer reviews ticker">
        <div className="reviews-list" aria-label="Customer reviews">
          <div className="reviews-list__top">
            <p className="reviews-list__score" aria-label={`${section.googleRating || "4.8/5"} stars`}>
              Reviews {section.googleRating || "4.8/5"} {"★★★★☆"}
            </p>
            <div className="reviews-list__actions">
              <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noreferrer" className="reviews-list__cta">
                Leave a Google Review
              </a>
              <button type="button" className="reviews-list__view-all" onClick={onOpenReviewsPage}>
                View all reviews
              </button>
            </div>
          </div>
          <div className="reviews-stream">
            <div className="reviews-track-wrap" ref={reviewsTrackWrapRef}>
              <div className="reviews-track" ref={reviewsTrackRef}>
                {section.reviews.map((review) => (
                  <article key={`${review.name}-${review.date}`} className="review-item">
                    <div className="review-item__top">
                      <strong>{review.name}</strong>
                      <span>{review.date}</span>
                    </div>
                    <p className="review-item__rating" aria-label="5 out of 5 stars">
                      {"★★★★★"}
                    </p>
                    <p className="review-item__quote">"{review.quote}"</p>
                  </article>
                ))}
              </div>
              <div className="reviews-track" ref={reviewsTrackCloneRef} aria-hidden="true">
                {section.reviews.map((review) => (
                  <article key={`${review.name}-${review.date}-clone`} className="review-item">
                    <div className="review-item__top">
                      <strong>{review.name}</strong>
                      <span>{review.date}</span>
                    </div>
                    <p className="review-item__rating" aria-label="5 out of 5 stars">
                      {"★★★★★"}
                    </p>
                    <p className="review-item__quote">"{review.quote}"</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
          <div className="reviews-list__mobile-actions">
            <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noreferrer" className="reviews-list__cta">
              Leave a Google Review
            </a>
            <button type="button" className="reviews-list__view-all" onClick={onOpenReviewsPage}>
              View all reviews
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="marketing-card marketing-card--text marketing-card--minimal">
      <h3 className="marketing-card__title">{section.title}</h3>
      <p className="marketing-card__body">{section.body}</p>
      <div className="kpi-grid">
        {section.points?.map((point) => (
          <div key={point} className="kpi-cell">
            {point}
          </div>
        ))}
      </div>
      {(section.cta || section.subCta) && (
        <div className="card-actions">
          {section.cta && (
            <a
              href={ctaHrefWithBookingDefault(section)}
              target={isExternalHttpUrl(ctaHrefWithBookingDefault(section)) ? "_blank" : undefined}
              rel={isExternalHttpUrl(ctaHrefWithBookingDefault(section)) ? "noreferrer" : undefined}
              onClick={
                opensBookingModal(ctaHrefWithBookingDefault(section))
                  ? (event) => {
                      event.preventDefault();
                      onOpenBooking();
                    }
                  : undefined
              }
              className="marketing-card__cta marketing-card__cta--dark"
            >
              {section.cta}
            </a>
          )}
          {section.subCta && (
            <a href={section.subCtaLink || "#"} className="text-link">
              {section.subCta}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function BookingModal({ isOpen, onClose, wizardKey }) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-wizard-title">
      <div className="booking-modal__backdrop" onClick={onClose} />
      <div className="booking-modal__panel">
        <button type="button" className="booking-modal__close" onClick={onClose}>
          Close
        </button>
        <div className="booking-modal__scroll">
          <MechanicLeadWizard
            key={wizardKey}
            title={LEAD_CARD_TITLE}
            body={LEAD_CARD_BODY}
            variant="modal"
            onSubmitted={onClose}
          />
        </div>
      </div>
    </div>
  );
}

function ServicesPage({ onGoHome, onOpenBooking, onOpenReviewsPage, enableMobileDetailsPreview }) {
  const servicesReviewsTrackRef = useRef(null);
  const servicesReviewsTrackCloneRef = useRef(null);
  const servicesReviewsTrackWrapRef = useRef(null);
  const [isServicesMobile, setIsServicesMobile] = useState(
    typeof window !== "undefined" ? window.matchMedia("(max-width: 1199px)").matches : false
  );
  const [showAllServiceDetails, setShowAllServiceDetails] = useState(false);
  const shouldShowCollapsedDetails = Boolean(enableMobileDetailsPreview && isServicesMobile && !showAllServiceDetails);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 1199px)");
    const updateIsMobile = (event) => {
      setIsServicesMobile(event.matches);
      if (!event.matches) setShowAllServiceDetails(false);
    };

    setIsServicesMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", updateIsMobile);
    return () => mediaQuery.removeEventListener("change", updateIsMobile);
  }, []);

  useEffect(() => {
    setShowAllServiceDetails(false);
  }, [enableMobileDetailsPreview]);

  useReviewsMarquee({
    trackWrapRef: servicesReviewsTrackWrapRef,
    trackRef: servicesReviewsTrackRef,
    cloneTrackRef: servicesReviewsTrackCloneRef,
    enabled: true,
    introStaggerPx: 24,
    introDuration: 0.8,
    introStagger: 0.04,
    speedPxPerSec: 72,
    extraDeps: [],
  });

  return (
    <section className="services-page-view" aria-labelledby="services-page-title">
      <button type="button" className="services-page-view__back" onClick={onGoHome}>
        <svg className="services-page-view__back-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 6L6 12L12 18" />
          <path d="M6 12H19" />
        </svg>
        <span>Back</span>
      </button>
      <div className="services-page-view__top">
        <div>
          <p className="services-page-view__eyebrow">Our Services</p>
          <h1 id="services-page-title" className="services-page-view__title">
            Complete auto repair and maintenance services
          </h1>
          <p className="services-page-view__intro">
            We specialize in diagnosing and repairing a variety of automotive issues, including
            engine problems, electrical faults, and brake system concerns.
          </p>
        </div>
      </div>
      <section className="services-page-view__details" aria-label="Popular services and pricing">
        <p className="services-page-view__eyebrow">Service Details</p>
        <h2 className="services-page-view__details-title">Popular repair services and what to expect</h2>
        <div
          className={`services-page-view__details-grid-wrap ${
            shouldShowCollapsedDetails ? "services-page-view__details-grid-wrap--collapsed" : ""
          }`}
        >
          <div className="services-page-view__details-grid">
            {serviceDetails.map((service) => (
              <article key={service.title} className="services-page-view__detail-card">
                <div className="services-page-view__detail-head">
                  <h3>{service.title}</h3>
                  <span className={service.startingPrice === "Request a Quote" ? "services-page-view__badge--quote" : ""}>
                    {service.startingPrice}
                  </span>
                </div>
                <div className="services-page-view__detail-lists">
                  <div>
                    <p className="services-page-view__detail-label">Common symptoms</p>
                    <ul className="services-page-view__detail-list services-page-view__detail-list--symptoms">
                      {service.symptoms.map((symptom) => (
                        <li key={symptom}>{symptom}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="services-page-view__detail-label">What is included</p>
                    <ul className="services-page-view__detail-list services-page-view__detail-list--included">
                      {service.included.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
        {shouldShowCollapsedDetails && (
          <div className="services-page-view__details-more-wrap">
            <button
              type="button"
              className="services-page-view__details-more"
              onClick={() => setShowAllServiceDetails(true)}
            >
              See more services
            </button>
          </div>
        )}
      </section>
      <section className="services-page-view__book-section" aria-label="Book your appointment">
        <div className="services-page-view__book-top">
          <div>
            <p className="services-page-view__book-eyebrow">Ready to get your vehicle fixed right?</p>
            <h2 className="services-page-view__book-title">Book your appointment in under a minute.</h2>
            <p className="services-page-view__book-copy">
              Choose a time that works for you and our team will take care of the rest.
            </p>
          </div>
          <div className="services-page-view__book-total">
            <strong>★★★★☆ 4.8/5</strong>
            <span>320+ verified reviews</span>
          </div>
        </div>
        <div className="services-page-view__book-reviews" aria-label="Featured customer reviews">
          <div className="reviews-stream">
            <div className="reviews-track-wrap" ref={servicesReviewsTrackWrapRef}>
              <div className="reviews-track" ref={servicesReviewsTrackRef}>
                {CUSTOMER_REVIEWS.map((review) => (
                  <article key={`${review.name}-${review.date}-services`} className="review-item">
                    <div className="review-item__top">
                      <strong>{review.name}</strong>
                      <span>{review.date}</span>
                    </div>
                    <p className="review-item__rating" aria-label="5 out of 5 stars">
                      {"★★★★★"}
                    </p>
                    <p className="review-item__quote">"{review.quote}"</p>
                  </article>
                ))}
              </div>
              <div className="reviews-track" ref={servicesReviewsTrackCloneRef} aria-hidden="true">
                {CUSTOMER_REVIEWS.map((review) => (
                  <article key={`${review.name}-${review.date}-services-clone`} className="review-item">
                    <div className="review-item__top">
                      <strong>{review.name}</strong>
                      <span>{review.date}</span>
                    </div>
                    <p className="review-item__rating" aria-label="5 out of 5 stars">
                      {"★★★★★"}
                    </p>
                    <p className="review-item__quote">"{review.quote}"</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="services-page-view__book-actions">
          <button type="button" className="marketing-card__cta marketing-card__cta--dark" onClick={onOpenBooking}>
            Book Appointment
          </button>
          <button type="button" className="services-page-view__book-view-all" onClick={onOpenReviewsPage}>
            View all reviews
          </button>
        </div>
      </section>
      <section className="services-page-view__local" aria-label="Location and neighborhoods served">
        <div className="services-page-view__local-top">
          <div>
            <p className="services-page-view__eyebrow">Local Service Area</p>
            <h2 className="services-page-view__details-title">Serving drivers across lower Westchester</h2>
            <p className="services-page-view__intro">
              Visit us in Mount Vernon or schedule an appointment if you are in one of our nearby neighborhoods.
            </p>
          </div>
        </div>
        <div className="services-page-view__local-grid">
          <div className="services-page-view__map-wrap">
            <iframe
              title="Ralph and Sons Auto Repair map"
              src="https://maps.google.com/maps?q=701%20N%20Macquesten%20Pkwy%20Mount%20Vernon%20NY%2010552&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="services-page-view__areas">
            <p className="services-page-view__detail-label">Neighborhoods we serve</p>
            <ul>
              {SERVICE_AREAS.map((area) => (
                <li key={area}>{area}</li>
              ))}
            </ul>
            <p className="services-page-view__areas-more">And more!</p>
          </div>
        </div>
      </section>
    </section>
  );
}

function ReviewsPage({ onGoHome, onOpenBooking }) {
  return (
    <section className="reviews-page-view" aria-labelledby="reviews-page-title">
      <div className="reviews-page-view__back-row">
        <button type="button" className="services-page-view__back" onClick={onGoHome}>
          <svg className="services-page-view__back-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 6L6 12L12 18" />
            <path d="M6 12H19" />
          </svg>
          <span>Back</span>
        </button>
      </div>
      <div className="reviews-page-view__top">
        <div className="reviews-page-view__intro-block">
          <p className="services-page-view__eyebrow">Customer Reviews</p>
          <h1 id="reviews-page-title" className="services-page-view__title">
            What our customers are saying
          </h1>
          <p className="services-page-view__intro">
            Trusted feedback from local drivers who rely on Ralph & Sons for honest, high-quality service.
          </p>
        </div>
        <div className="reviews-page-view__meta-card">
          <p className="reviews-page-view__score" aria-label="4.8 out of 5 stars from over 320 reviews">
            <strong>{"★★★★☆ 4.8/5"}</strong>
            <span>320+ verified reviews</span>
          </p>
          <div className="reviews-page-view__actions">
            <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noreferrer" className="reviews-list__cta">
              Leave a Google Review
            </a>
          </div>
        </div>
      </div>
      <div className="reviews-page-view__grid" aria-label="All customer reviews">
        {CUSTOMER_REVIEWS.map((review) => (
          <article key={`${review.name}-${review.date}-full`} className="reviews-page-view__card">
            <div className="review-item__top">
              <strong>{review.name}</strong>
              <span>{review.date}</span>
            </div>
            <p className="review-item__rating" aria-label="5 out of 5 stars">
              {"★★★★★"}
            </p>
            <p className="review-item__quote">"{review.quote}"</p>
          </article>
        ))}
      </div>
      <div className="reviews-page-view__book-row">
        <button type="button" className="marketing-card__cta marketing-card__cta--dark" onClick={onOpenBooking}>
          Book Appointment
        </button>
      </div>
    </section>
  );
}

function CardsFooter({ className = "", compact = false }) {
  return (
    <section className={`cards-footer ${className}`.trim()} aria-label="Cards footer">
      <div className="cards-footer__row">
        <div className="cards-footer__lead">
          <p className="cards-footer__brand">{SHOP_NAME}</p>
          {!compact && (
            <>
              <p className="cards-footer__body">{SHOP_ADDRESS}</p>
              <p className="cards-footer__phone">
                <a href={SHOP_PHONE_HREF}>{SHOP_PHONE}</a>
              </p>
            </>
          )}
        </div>
        <div className="cards-footer__meta">
          <div className="cards-footer__socials" aria-label="Contact links">
            <a href="tel:9147765331" aria-label="Phone" className="social-icon">
              <span className="social-icon__emoji" aria-hidden="true">
                📞
              </span>
              <span className="social-icon__label">Call</span>
            </a>
            <a
              href="https://maps.google.com/?q=701+N+Macquesten+Pkwy+Mount+Vernon+NY+10552"
              target="_blank"
              rel="noreferrer"
              aria-label="Address"
              className="social-icon"
            >
              <span className="social-icon__emoji" aria-hidden="true">
                📍
              </span>
              <span className="social-icon__label">Directions</span>
            </a>
          </div>
          <p className="cards-footer__legal">All rights reserved. 2026.</p>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const appRef = useRef(null);
  const servicesEntrySourceRef = useRef(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingModalKey, setBookingModalKey] = useState(0);
  const [enableServicesMobileDetailsPreview, setEnableServicesMobileDetailsPreview] = useState(false);
  const [activePage, setActivePage] = useState(
    typeof window !== "undefined" ? getActivePageFromHash(window.location.hash) : "home"
  );

  const openBookingModal = () => {
    setBookingModalKey((k) => k + 1);
    setIsBookingModalOpen(true);
  };
  const closeBookingModal = () => setIsBookingModalOpen(false);
  useEffect(() => {
    resetScrollToTop();
    requestAnimationFrame(resetScrollToTop);
  }, [activePage]);

  const openServicesPage = (source = "link") => {
    servicesEntrySourceRef.current = source;
    setEnableServicesMobileDetailsPreview(source === "nav");
    window.location.hash = "services";
    setActivePage("services");
  };
  const openReviewsPage = () => {
    window.location.hash = "reviews";
    setActivePage("reviews");
  };
  const openHomePage = () => {
    window.location.hash = "";
    setActivePage("home");
  };

  useEffect(() => {
    const onHashChange = () => {
      const page = getActivePageFromHash(window.location.hash);
      setActivePage(page);
      if (page === "services") {
        const source = servicesEntrySourceRef.current;
        setEnableServicesMobileDetailsPreview(source === "nav");
      } else {
        setEnableServicesMobileDetailsPreview(false);
      }
      servicesEntrySourceRef.current = null;
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (!appRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".site-header",
        { y: -14, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.1, ease: "power3.out", clearProps: "transform,opacity" }
      );
    }, appRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!appRef.current) return;

    const ctx = gsap.context(() => {

      if (activePage === "services") {
        gsap.fromTo(
          ".services-page-view",
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.2, ease: "power3.out", clearProps: "transform,opacity" }
        );
        gsap.fromTo(
          ".services-page-view__back",
          { x: -10, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.85, delay: 0.26, ease: "power3.out", clearProps: "transform,opacity" }
        );
        gsap.fromTo(
          ".services-page-view__group",
          { y: 14, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.95,
            delay: 0.34,
            stagger: 0.2,
            ease: "power3.out",
            clearProps: "transform,opacity",
          }
        );
        gsap.fromTo(
          ".services-page-view__book-section",
          { y: 10, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, delay: 0.62, ease: "power3.out", clearProps: "transform,opacity" }
        );
        return;
      }

      if (activePage === "reviews") {
        gsap.fromTo(
          ".reviews-page-view",
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.1, ease: "power3.out", clearProps: "transform,opacity" }
        );
        gsap.fromTo(
          ".reviews-page-view .services-page-view__back, .reviews-page-view__actions",
          { y: 10, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.85, delay: 0.2, ease: "power3.out", clearProps: "transform,opacity" }
        );
        gsap.fromTo(
          ".reviews-page-view__card",
          { y: 14, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.82,
            delay: 0.3,
            stagger: 0.08,
            ease: "power3.out",
            clearProps: "transform,opacity",
          }
        );
        return;
      }

      gsap.fromTo(
        ".panel--primary, .hours-preview--desktop, .cards-footer--desktop",
        { y: 14, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.2,
          ease: "power3.out",
          clearProps: "transform,opacity",
        }
      );

      const rightColumnCards = gsap.utils.toArray(".scroll-column .card-slot");
      rightColumnCards.forEach((card) => {
        gsap.fromTo(
          card,
          { y: 26, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1.05,
            ease: "power3.out",
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: card,
              start: "top 88%",
              toggleActions: "play none none none",
            },
          }
        );
      });

      gsap.fromTo(
        ".cards-footer--mobile",
        { y: 18, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          delay: 0.35,
          ease: "power3.out",
          clearProps: "transform,opacity",
        }
      );
    }, appRef);

    return () => ctx.revert();
  }, [activePage]);

  return (
    <div ref={appRef}>
      <script type="application/ld+json">{JSON.stringify(localBusinessSchema)}</script>
      <header className="site-header">
        <a
          href="#"
          className="logo"
          onClick={(event) => {
            event.preventDefault();
            openHomePage();
          }}
        >
          <img src="/images/ralph-sons-logo.svg?v=2" alt="Ralph and Sons logo" className="logo__img" />
        </a>
        <nav className="top-nav" aria-label="Header actions">
          <a
            href="#services"
            className="top-nav__link"
            onClick={(event) => {
              event.preventDefault();
              openServicesPage("nav");
            }}
          >
            Services
          </a>
          <a
            href="#reviews"
            className="top-nav__link"
            onClick={(event) => {
              event.preventDefault();
              openReviewsPage();
            }}
          >
            Reviews
          </a>
          <button type="button" className="header-cta" onClick={openBookingModal}>
            Book Appointment
          </button>
        </nav>
      </header>

      {activePage === "services" ? (
        <main className="layout">
          <div className="services-page-wrap">
            <ServicesPage
              onGoHome={openHomePage}
              onOpenBooking={openBookingModal}
              onOpenReviewsPage={openReviewsPage}
              enableMobileDetailsPreview={enableServicesMobileDetailsPreview}
            />
          </div>
        </main>
      ) : activePage === "reviews" ? (
        <main className="layout">
          <div className="services-page-wrap">
            <ReviewsPage onGoHome={openHomePage} onOpenBooking={openBookingModal} />
          </div>
        </main>
      ) : (
        <main className="layout">
          <div className="left-rail">
            <section className="panel panel--primary" aria-labelledby="section-1-title">
              <div className="panel__inner panel__inner--hero">
                <p className="hero__location-pin">Fleetwood - Mount Vernon, NY</p>
                <h1 id="section-1-title" className="hero__title">
                  Reliable automotive care from a team that puts honesty first.
                </h1>
                <p className="hero__subtitle">
                  Our skilled technicians handle routine maintenance, diagnostics, and major repairs with
                  exceptional customer service and quality&nbsp;workmanship.
                </p>
                <div className="hero__actions">
                  <button type="button" className="hero__cta" onClick={openBookingModal}>
                    Book Appointment
                  </button>
                  <a href="tel:9147765331" className="hero__cta hero__cta--secondary">
                    📞 {SHOP_PHONE}
                  </a>
                </div>
              </div>
            </section>
            <section className="hours-preview hours-preview--desktop" aria-label="Shop hours">
              <p className="hours-preview__label">Hours</p>
              <p>Mon - Fri: 7:30 AM - 6:30 PM</p>
              <p>Saturday: 8:00 AM - 2:00 PM</p>
              <p>Sunday: Closed</p>
            </section>
            <CardsFooter className="cards-footer--desktop" />
          </div>

          <div className="scroll-column">
            {cards.map((section) => (
              <section
                key={section.id}
                className={`card-slot ${section.type === "image" ? "card-slot--media" : "card-slot--text"} ${section.reviews ? "card-slot--ticker" : ""}`}
                aria-label={`Section ${section.id}`}
              >
                <SectionCard
                  section={section}
                  onOpenBooking={openBookingModal}
                  onOpenServicesPage={openServicesPage}
                  onOpenReviewsPage={openReviewsPage}
                />
              </section>
            ))}
            <CardsFooter className="cards-footer--mobile" />
          </div>
        </main>
      )}
      <BookingModal isOpen={isBookingModalOpen} onClose={closeBookingModal} wizardKey={bookingModalKey} />
    </div>
  );
}
