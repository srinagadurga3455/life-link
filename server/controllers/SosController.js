import mongoose from "mongoose";
import Emergency from "../models/EmergencyModel.js";
import { triggerCall } from "../agents/CallingController.js";
import { sendSMS }     from "../agents/MessagingController.js";
import { getChatReply } from "../agents/agent.js";
import { detectLanguage, classifyEmergency, extractSeverity } from "../agents/ChatController.js";

// Fallback: a Twilio-verified number used when the user has no contacts
// or when a contact's number is not verified in the Twilio trial account.
const FALLBACK_NUMBER = "+917330873455";

// ── Shared: fetch this user's emergency contacts (with Twilio-safe fallback) ──
async function fetchContactsForUser(userId) {
  let contacts = [];
  if (!mongoose.isValidObjectId(userId)) {
    console.warn(`⚠ userId "${userId}" is not an ObjectId — using fallback contact.`);
  } else {
    try {
      const doc = await Emergency.findOne({ userId });
      if (doc?.emergencyContacts?.length) {
        contacts = doc.emergencyContacts.map(c => ({
          name:  c.name,
          phone: c.mobileNumber.trim().startsWith("+")
            ? c.mobileNumber.trim()
            : `+91${c.mobileNumber.trim()}`,
        }));
      }
    } catch (err) {
      console.error("❌ Failed to fetch emergency contacts:", err.message);
    }
  }
  if (!contacts.length) {
    console.warn("⚠ No emergency contacts found in DB — using fallback number.");
    contacts = [{ name: "Emergency Contact", phone: FALLBACK_NUMBER }];
  }
  return contacts;
}

// ── Instant alert templates (NO LLM in the emergency path — speed & reliability) ──
function buildAlertSMS(personText, situation, locationText) {
  const body =
    `🚨 SOS ALERT — ${personText} needs help NOW!${locationText ? ` ${locationText.trim()}` : ""}` +
    (situation ? ` ${situation}` : " Please call back immediately.");
  return body.slice(0, 159);
}

function buildCallOpening(personText, situation, locationText) {
  return (
    `This is LifeLink Emergency Service. ${personText} has sent an SOS alert and needs your help right away.` +
    `${locationText ? ` ${locationText.trim()}` : ""}` +
    ` ${situation ? `Details: ${situation}.` : ""} Can you reach them now?`
  );
}

// ── Live alert pipelines (background, polled by the app) ─────────────────────
// sessionId -> { status, deliveredCount, contacts: [{name,to,sms,call,smsError,callError}] }
const sosAlerts = new Map();

async function runAlertPipeline(entry, opts) {
  const { userId, userName, situation, location, address, silent } = opts;
  const locationText = address
    ? ` Location: ${address}${location ? ` (${location})` : ''}.`
    : location
      ? ` Location: ${location}.`
      : "";
  const personText     = userName ? userName : "A user";
  const builtSituation = situation?.trim() ||
    (silent
      ? `SILENT EMERGENCY — ${personText} is in danger and CANNOT SPEAK. Needs immediate help NOW!`
      : `SOS EMERGENCY — ${personText} needs immediate help!`);

  const contacts = await fetchContactsForUser(userId);
  entry.status  = "sending";
  entry.contacts = contacts.map(c => ({
    name: c.name, to: c.phone,
    sms: "pending", call: "pending", smsError: null, callError: null,
  }));

  const smsText  = buildAlertSMS(personText, builtSituation, locationText);
  const callText = buildCallOpening(personText, builtSituation, locationText);
  const ctx      = `Emergency contact of ${personText}. They need immediate help.${locationText}`;

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const row     = entry.contacts[i];
    console.log(`\n🆘 SOS → ${contact.name} (${contact.phone})`);

    // ── SMS (try, then fallback number) ──
    try {
      await sendSMS(contact.phone, smsText, ctx, contact.name);
      row.sms = "ok";
      console.log(`  ✉️  SMS sent`);
    } catch (err) {
      row.smsError = err.message;
      console.error(`  ❌ SMS failed (${contact.phone}): ${err.message}`);
      if (contact.phone !== FALLBACK_NUMBER) {
        try {
          await sendSMS(FALLBACK_NUMBER, smsText, ctx, "Emergency Contact");
          row.sms = "ok";
          console.log(`  ✉️  Fallback SMS sent to ${FALLBACK_NUMBER}`);
        } catch (fe) {
          row.smsError = fe.message;
        }
      }
    }

    // ── Call (try, then fallback number) ──
    try {
      await triggerCall(contact.phone, builtSituation, ctx, { opening: callText });
      row.call = "ok";
      console.log(`  📞 Call placed`);
    } catch (err) {
      row.callError = err.message;
      console.error(`  ❌ Call failed (${contact.phone}): ${err.message}`);
      if (contact.phone !== FALLBACK_NUMBER) {
        try {
          await triggerCall(FALLBACK_NUMBER, builtSituation, ctx, { opening: callText });
          row.call = "ok";
          console.log(`  📞 Fallback call placed to ${FALLBACK_NUMBER}`);
        } catch (fe) {
          row.callError = fe.message;
        }
      }
    }
  }

  entry.status         = "done";
  entry.deliveredCount = entry.contacts.filter(c => c.sms === "ok").length;
  console.log(`\n✅ SOS pipeline done — SMS delivered to ${entry.deliveredCount}/${entry.contacts.length} contact(s)\n`);
}

/**
 * POST /api/sos
 * Body: { userId, userName, situation?, location?, address?, silent? }
 * Answers IMMEDIATELY (202) — the Twilio pipeline runs in the background and
 * its live status is polled via GET /api/sos/status/:sessionId.
 */
export async function triggerSOSForUser(req, res) {
  const { userId, userName, situation, location, address, silent } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const sessionId = `sos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const entry = { sessionId, status: "queued", deliveredCount: 0, contacts: [], startedAt: Date.now() };
  sosAlerts.set(sessionId, entry);

  res.status(202).json({ success: true, queued: true, sessionId });

  runAlertPipeline(entry, { userId, userName, situation, location, address, silent })
    .catch(err => {
      entry.status = "done";
      console.error("❌ SOS pipeline error:", err.message);
    });
}

/** GET /api/sos/status/:sessionId — live per-contact delivery status */
export function getSosStatus(req, res) {
  const entry = sosAlerts.get(req.params.sessionId);
  if (!entry) return res.status(404).json({ error: "Unknown SOS session" });
  res.json({
    sessionId:      entry.sessionId,
    status:         entry.status,
    deliveredCount: entry.deliveredCount ?? 0,
    contacts:       entry.contacts,
  });
}

// ── POST /api/sos/assist ──────────────────────────────────────────────────────
// The follow-up AI conversation AFTER the SOS alert went out.
// Body: { userId, userName, userMessage, history?, escalationId?, location?, address? }
//
// 1. The agent talks to the user in their language ("what happened?", first-aid).
// 2. When the situation is clearly an emergency (severity HIGH/CRITICAL or a
//    recognized emergency type), it sends ONE follow-up SMS to the user's saved
//    emergency contacts with the real situation details.
// 3. Returns a suggestCall action so the app can show a tap-to-dial button
//    (108 ambulance / 100 police / 101 fire). No auto-dialing happens here.
const SOS_ASSIST_PROMPT = `You are LifeLink — an AI emergency-response voice assistant inside a mobile safety app.

The user has ALREADY pressed SOS: their emergency contacts were alerted with the user's location, and help is presumably on the way. Your ONLY job now is to talk to the user:

RULES:
1. Reply in the SAME LANGUAGE the user speaks — Telugu, Tamil, Kannada, Hindi, or English — in the proper script. Match their language exactly.
2. Speak in short, calm, natural sentences (usually 1-3 sentences, never more than 4).
3. If the situation is not yet clear, ask ONE clear question at a time.
4. Provide immediate, clear first-aid steps when the user describes a medical issue.
5. NEVER give a medical diagnosis. NEVER mention that we "cannot" do anything.
6. Do NOT mention emergency contacts, staff, or other services unless the user asks.
7. When it becomes CLEAR which emergency service the user needs, append EXACTLY one line like:
   - Ambulance needed: [SUGGEST:108:Ambulance]
   - Threat to life / police needed: [SUGGEST:100:Police]
   - Fire: [SUGGEST:101:Fire Brigade]
   Only append the suggestion line WHEN the need is clear — otherwise add nothing.
8. Do not output markdown, lists, or "Emergency Level" headers — plain conversational speech only.`;

// Escalations already handled per SOS session (reset on server restart — fine for prototype)
const escalatedSessions = new Set();
// Cooldown map so a permanently-failing Twilio number isn't hit on every agent turn
const smsRetryAt = new Map(); // sessionKey -> ms timestamp when a retry is allowed again

export async function assistAfterSOS(req, res) {
  const { userId, userName, userMessage, history = [], escalationId, location, address } = req.body;
  if (!userId || !userMessage) return res.status(400).json({ error: "userId and userMessage are required" });

  const personText  = userName || "A user";
  const locationText = address
    ? ` Location: ${address}${location ? ` (${location})` : ''}.`
    : location
      ? ` Location: ${location}.`
      : "";

  // Full picture from this conversation session so far
  const situation = [
    ...history.filter(m => m.role === "user").map(m => m.content),
    userMessage,
  ].slice(-4).join(" | ").slice(0, 500) || userMessage;

  try {
    const detectedLang = detectLanguage(userMessage).code;
    const messages = [
      {
        role: "system",
        content:
          SOS_ASSIST_PROMPT +
          `\n\nCURRENT USER (if you already know their name, use it): ${personText}.` ,
      },
      ...history.slice(-16),
      { role: "user", content: userMessage },
    ];

    const reply = await getChatReply(messages, { maxTokens: 320, temperature: 0.35 });

    // Extract + strip suggestion marker if present
    const suggestMatch = reply.match(/\[SUGGEST:(\d{2,4}):([^\]]+)\]/);
    const suggestCall  = suggestMatch
      ? { number: suggestMatch[1], label: suggestMatch[2].trim() }
      : null;
    const cleanReply = reply.replace(/\[SUGGEST:[^\]]*\]/g, "").trim() || reply;

    // Fallback suggestion from the classifier when the marker is missing
    let finalSuggest = suggestCall;
    if (!finalSuggest) {
      const classification = classifyEmergency(situation);
      const severity       = extractSeverity(reply) || null;
      const urgent = severity === "HIGH" || severity === "CRITICAL" ||
                     /fire|burn|assault|attack|unsafe|danger|breathing|bleeding|unconscious|suicide|self.?harm|chok/i.test(situation);
      if (urgent && classification.type === 'burn')      finalSuggest = { number: "101", label: "Fire Brigade" };
      if (urgent && /assault|attack|unsafe|danger|harass|stalk|threaten/i.test(situation)) finalSuggest = { number: "100", label: "Police" };
      if (!finalSuggest && urgent)                       finalSuggest = { number: "108", label: "Ambulance" };
    }

    // ── Follow-up SMS to the user's contacts (once per SOS session) ────────
    const sessionKey = `${userId}:${escalationId || 'default'}`;
    const now = Date.now();
    let contactsNotified = false;
    const canAttempt = !escalatedSessions.has(sessionKey) &&
                       (!smsRetryAt.has(sessionKey) || now >= smsRetryAt.get(sessionKey));
    if (canAttempt) {
      const classification = classifyEmergency(situation);
      const severity       = extractSeverity(reply) || null;
      const isEmergency = (severity === "HIGH" || severity === "CRITICAL") || classification.type !== "general";

      if (isEmergency) {
        escalatedSessions.add(sessionKey);
        const contacts = await fetchContactsForUser(userId);
        const followUp = `UPDATE from ${personText} after SOS — they describe: "${situation}". Please check on them now!${locationText}`;

        const results = await Promise.allSettled(
          contacts.map(contact => {
            console.log(`\n🆘 [Assist] Follow-up SMS → ${contact.name} (${contact.phone})`);
            return sendSMS(contact.phone, followUp, `Emergency contact of ${personText}. Follow-up to an earlier SOS`, contact.name);
          })
        );
        const sentCount = results.filter(r => r.status === "fulfilled").length;
        if (results.some(r => r.status === "rejected")) {
          const firstError = results.find(r => r.status === "rejected")?.reason?.message;
          console.error("❌ Follow-up SMS error:", firstError);
          if (!sentCount) {
            // Don't fail the emergency conversation for a best-effort SMS —
            // allow one retry after the cooldown instead.
            escalatedSessions.delete(sessionKey);
            smsRetryAt.set(sessionKey, Date.now() + 120000);
          } else {
            escalatedSessions.add(sessionKey);
          }
        } else {
          escalatedSessions.add(sessionKey);
        }
        console.log(`✅ Follow-up brief sent to ${sentCount}/${contacts.length} contact(s)`);
        contactsNotified = sentCount > 0;
      }
    }

    const updatedHistory = [
      ...history,
      { role: "user",      content: userMessage },
      { role: "assistant", content: cleanReply },
    ].slice(-16);

    res.json({
      reply:           cleanReply,
      lang:            detectedLang,
      suggestedCall:   finalSuggest,
      contactsNotified,
      situationType:   classifyEmergency(situation).type,
      updatedHistory,
    });
  } catch (err) {
    console.error("Assist error:", err.message);
    if (res.headersSent) return;
    res.status(500).json({ error: "AI assistant temporarily unavailable" });
  }
}
