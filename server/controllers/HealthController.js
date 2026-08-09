import crypto from "crypto";
import { getChatReply } from "../agents/agent.js";

// ── In-Memory Stores ─────────────────────────────────────────────────────────
const bookings = new Map();   // bookingId → booking object
const reminders = new Map();   // userId   → [ reminder, … ]

// ── Helper: timestamp tag for console logs ───────────────────────────────────
const ts = () => new Date().toISOString();

// ── Language Detection (mirrors ChatController pattern) ──────────────────────
function detectLanguage(text) {
  if (/[\u0C00-\u0C7F]/.test(text)) return "te";
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta";
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  return "en";
}

const LANG_NAMES = { en: "English", te: "Telugu", ta: "Tamil", kn: "Kannada", hi: "Hindi" };

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE 1 — Symptom Checker
// POST /api/health/symptom-check
// ═════════════════════════════════════════════════════════════════════════════
export const symptomCheck = async (req, res) => {
  try {
    console.log("[Health] symptom-check", ts());
    const { symptoms, language = "en", history = [] } = req.body;

    if (!symptoms) {
      return res.status(400).json({ error: "symptoms field is required" });
    }

    const detectedLang = detectLanguage(symptoms) !== "en"
      ? detectLanguage(symptoms)
      : language;

    const langName = LANG_NAMES[detectedLang] || "English";

    const systemPrompt = `You are LifeLink Health Assistant — a helpful, empathetic medical symptom checker.

RULES:
- The user describes their symptoms. Analyze them carefully.
- Ask 1-2 intelligent follow-up questions if the symptoms are vague.
- Suggest self-care steps when appropriate.
- Clearly recommend seeing a doctor when symptoms sound serious.
- At the END of your reply, on a NEW line, output exactly one of these tags:
  SEVERITY:low   SEVERITY:medium   SEVERITY:high
  and on the next line:
  RECOMMEND_DOCTOR:true   or   RECOMMEND_DOCTOR:false
- Respond in ${langName} if the user writes in ${langName}; otherwise match their language.
- Do NOT use markdown. Use plain, conversational text.
- Be calm, supportive, and never diagnose definitively — you are an AI assistant, not a doctor.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10),
      { role: "user", content: symptoms },
    ];

    const raw = await getChatReply(messages, { maxTokens: 500, temperature: 0.35 });

    // Parse severity & recommendDoctor from the tail of the reply
    const severityMatch = raw.match(/SEVERITY:(low|medium|high)/i);
    const doctorMatch = raw.match(/RECOMMEND_DOCTOR:(true|false)/i);

    const severity = severityMatch ? severityMatch[1].toLowerCase() : "medium";
    const recommendDoctor = doctorMatch ? doctorMatch[1] === "true" : severity !== "low";

    // Strip the tags from the visible reply
    const reply = raw
      .replace(/SEVERITY:(low|medium|high)/i, "")
      .replace(/RECOMMEND_DOCTOR:(true|false)/i, "")
      .trim();

    return res.json({ reply, severity, recommendDoctor, language: detectedLang });
  } catch (error) {
    console.error("[Health] symptom-check error:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE 2a — Find Doctors (mock)
// POST /api/health/find-doctors
// ═════════════════════════════════════════════════════════════════════════════

// TODO: Replace mock data with a real provider API (Google Places / Practo / external DB)
const MOCK_DOCTORS = [
  { id: "doc-001", name: "Dr. Priya Sharma", specialization: "General Physician", hospital: "Apollo Clinic", rating: 4.5, distance: "1.2 km", availableSlots: ["09:00", "11:00", "14:00", "16:00"] },
  { id: "doc-002", name: "Dr. Ramesh Reddy", specialization: "Cardiologist", hospital: "Care Hospitals", rating: 4.8, distance: "2.5 km", availableSlots: ["10:00", "13:00", "15:30"] },
  { id: "doc-003", name: "Dr. Lakshmi Menon", specialization: "Dermatologist", hospital: "KIMS Hospital", rating: 4.3, distance: "3.1 km", availableSlots: ["08:30", "12:00", "17:00"] },
  { id: "doc-004", name: "Dr. Suresh Babu", specialization: "Orthopedic", hospital: "Yashoda Hospital", rating: 4.6, distance: "4.0 km", availableSlots: ["09:30", "11:30", "14:30"] },
  { id: "doc-005", name: "Dr. Anjali Rao", specialization: "Pediatrician", hospital: "Rainbow Hospital", rating: 4.7, distance: "1.8 km", availableSlots: ["10:30", "13:30", "16:30"] },
  { id: "doc-006", name: "Dr. Venkat Krishnan", specialization: "ENT Specialist", hospital: "Global Hospital", rating: 4.4, distance: "5.2 km", availableSlots: ["08:00", "12:30", "15:00"] },
  { id: "doc-007", name: "Dr. Kavitha Nair", specialization: "Gynecologist", hospital: "Fernandez Hospital", rating: 4.9, distance: "2.0 km", availableSlots: ["09:00", "14:00", "17:30"] },
  { id: "doc-008", name: "Dr. Arjun Patel", specialization: "Neurologist", hospital: "NIMS Hospital", rating: 4.5, distance: "6.3 km", availableSlots: ["10:00", "15:00"] },
];

export const findDoctors = async (req, res) => {
  try {
    console.log("[Health] find-doctors", ts());
    const { specialization, location, lat, lng, language = "en" } = req.body;

    // TODO: When a real API is integrated, use lat/lng + specialization to query
    //       Google Places / Practo / a custom database. For now, filter mock data.

    let results = MOCK_DOCTORS;

    if (specialization) {
      const spec = specialization.toLowerCase();
      results = results.filter(d =>
        d.specialization.toLowerCase().includes(spec) ||
        d.name.toLowerCase().includes(spec)
      );
    }

    // If filter yields nothing, return all (mock behaviour)
    if (results.length === 0) results = MOCK_DOCTORS;

    // TODO: Sort by real distance using lat/lng with Haversine formula when
    //       real coordinates are available.

    return res.json({
      doctors: results,
      total: results.length,
      language,
      // TODO: include pagination when backed by a real data source
    });
  } catch (error) {
    console.error("[Health] find-doctors error:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE 2b — Book Appointment
// POST /api/health/book-appointment
// ═════════════════════════════════════════════════════════════════════════════
export const bookAppointment = async (req, res) => {
  try {
    console.log("[Health] book-appointment", ts());
    const { doctorId, slot, patientName, phone, language = "en" } = req.body;

    if (!doctorId || !slot || !patientName || !phone) {
      return res.status(400).json({ error: "doctorId, slot, patientName, and phone are required" });
    }

    // TODO: Validate slot availability against a real scheduling system
    const doctor = MOCK_DOCTORS.find(d => d.id === doctorId);
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    const bookingId = crypto.randomUUID();
    const booking = {
      bookingId,
      doctor: doctor.name,
      hospital: doctor.hospital,
      specialization: doctor.specialization,
      slot,
      patientName,
      phone,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };

    bookings.set(bookingId, booking);
    console.log(`[Health] Booking confirmed: ${bookingId} → ${doctor.name} @ ${slot}`);

    // TODO: Send confirmation SMS via Twilio MessagingController
    // TODO: Persist booking to MongoDB instead of in-memory Map

    return res.json({ ...booking, language });
  } catch (error) {
    console.error("[Health] book-appointment error:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE 3 — Medicine Scanner (gpt-4.1-mini Vision)
// POST /api/health/scan-medicine
// ═════════════════════════════════════════════════════════════════════════════
export const scanMedicine = async (req, res) => {
  try {
    console.log("[Health] scan-medicine", ts());
    const { imageBase64, language = "en" } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 field is required" });
    }

    const langName = LANG_NAMES[language] || "English";

    const systemPrompt = `You are LifeLink Medicine Analyzer — an AI that reads medicine packaging / strips from images.

TASK:
Analyze the image of a medicine strip or packaging and extract the following information.
Respond ONLY with a valid JSON object (no markdown, no code fences) with these exact keys:
{
  "name": "medicine name",
  "usage": "what it is used for",
  "dosage": "recommended dosage",
  "sideEffects": ["side effect 1", "side effect 2"],
  "warnings": ["warning 1", "warning 2"]
}

RULES:
- If you cannot read the medicine name clearly, set name to "Unknown" and note it in warnings.
- Keep descriptions concise (1-2 sentences each).
- List at least 2 side effects and 1 warning if information is available.
- Respond in ${langName} for the text values.`;

    // Build multimodal message with image content block
    const dataUri = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "input_text", text: "Analyze this medicine image and return the JSON." },
          { type: "input_image", image_url: { url: dataUri } },
        ],
      },
    ];

    const raw = await getChatReply(messages, { maxTokens: 600, temperature: 0.2 });

    // Try to parse the JSON from the response
    let parsed;
    try {
      // Strip possible markdown code fences the model might add despite instructions
      const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // If parsing fails, return structured fallback
      parsed = {
        name: "Unknown",
        usage: raw,
        dosage: "See packaging",
        sideEffects: [],
        warnings: ["Could not fully parse medicine information from image"],
      };
    }

    return res.json({
      name: parsed.name || "Unknown",
      usage: parsed.usage || "",
      dosage: parsed.dosage || "",
      sideEffects: parsed.sideEffects || [],
      warnings: parsed.warnings || [],
      language,
    });
  } catch (error) {
    console.error("[Health] scan-medicine error:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE 4 — Pill Reminders (CRUD + interval checker)
// ═════════════════════════════════════════════════════════════════════════════

// ── Add Reminder ─────────────────────────────────────────────────────────────
// POST /api/health/reminders
export const addReminder = async (req, res) => {
  try {
    console.log("[Health] add-reminder", ts());
    const { medicine, times, userId, language = "en" } = req.body;

    if (!medicine || !times || !userId) {
      return res.status(400).json({ error: "medicine, times, and userId are required" });
    }

    if (!Array.isArray(times) || times.length === 0) {
      return res.status(400).json({ error: "times must be a non-empty array of HH:MM strings" });
    }

    const reminderId = crypto.randomUUID();
    const reminder = {
      reminderId,
      medicine,
      times,          // e.g. ["08:00", "20:00"]
      userId,
      nextDue: computeNextDue(times),
      missed: [],
      createdAt: new Date().toISOString(),
    };

    if (!reminders.has(userId)) reminders.set(userId, []);
    reminders.get(userId).push(reminder);

    console.log(`[Health] Reminder created: ${reminderId} → ${medicine} for user ${userId}`);

    return res.json({ ...reminder, language });
  } catch (error) {
    console.error("[Health] add-reminder error:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ── Get Reminders ────────────────────────────────────────────────────────────
// GET /api/health/reminders/:userId
export const getReminders = async (req, res) => {
  try {
    console.log("[Health] get-reminders", ts());
    const { userId } = req.params;
    const { language = "en" } = req.query;

    const userReminders = reminders.get(userId) || [];

    // Refresh nextDue for each reminder
    for (const r of userReminders) {
      r.nextDue = computeNextDue(r.times);
    }

    return res.json({ reminders: userReminders, total: userReminders.length, language });
  } catch (error) {
    console.error("[Health] get-reminders error:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ── Delete Reminder ──────────────────────────────────────────────────────────
// DELETE /api/health/reminders/:reminderId
export const deleteReminder = async (req, res) => {
  try {
    console.log("[Health] delete-reminder", ts());
    const { reminderId } = req.params;
    const { language = "en" } = req.query;

    for (const [userId, list] of reminders) {
      const idx = list.findIndex(r => r.reminderId === reminderId);
      if (idx !== -1) {
        const removed = list.splice(idx, 1)[0];
        console.log(`[Health] Reminder deleted: ${reminderId}`);
        return res.json({ deleted: true, reminder: removed, language });
      }
    }

    return res.status(404).json({ error: "Reminder not found" });
  } catch (error) {
    console.error("[Health] delete-reminder error:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Given an array of HH:MM strings, return the next upcoming time today or
 * the earliest time tomorrow if all today's slots have passed.
 */
function computeNextDue(times) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD

  const upcoming = times
    .map(t => new Date(`${today}T${t}:00`))
    .filter(d => d > now);

  if (upcoming.length > 0) {
    return upcoming.sort((a, b) => a - b)[0].toISOString();
  }

  // All times passed today → next is the earliest slot tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const sorted = [...times].sort();
  return new Date(`${tomorrowStr}T${sorted[0]}:00`).toISOString();
}

// ── Interval Checker (every 60 seconds) ──────────────────────────────────────
// TODO: Connect to Twilio SMS / push notification service instead of console.log
setInterval(() => {
  const now = new Date();
  const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  for (const [userId, list] of reminders) {
    for (const r of list) {
      if (r.times.includes(nowHHMM)) {
        console.log(
          `[Health] ⏰ REMINDER DUE — User: ${userId} | Medicine: ${r.medicine} | Time: ${nowHHMM}`
        );
        // TODO: Send Twilio SMS / push notification to user
        // TODO: If not acknowledged within X minutes, add to r.missed[]
      }
    }
  }
}, 60_000);
