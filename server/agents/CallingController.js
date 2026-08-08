import twilio from "twilio";
import { getCallingReply } from "./agent.js";

function getClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// ── In-memory call sessions ──────────────────────────────────────────────────
const callSessions = new Map();

// ── TwiML builder ────────────────────────────────────────────────────────────
function buildGatherTwiML(sayText, actionUrl) {
  const twiml = new twilio.twiml.VoiceResponse();

  const gather = twiml.gather({
    input: "speech",
    action: actionUrl,
    method: "POST",
    speechTimeout: "auto",
    language: "en-IN",
    timeout: 12,
    hints: "yes, no, okay, help, coming, who is this, what happened, where, thank you, goodbye",
  });

  gather.say({ voice: "Polly.Aditi", language: "en-IN" }, sayText);

  twiml.say(
    { voice: "Polly.Aditi", language: "en-IN" },
    "I could not hear you. Please call one one two for emergency assistance. Goodbye."
  );
  twiml.hangup();

  return twiml.toString();
}

// ── Exported helper: trigger a call from ChatController ─────────────────────
// opts.opening: prebuilt template opening (skips the LLM — used by the SOS path)
export async function triggerCall(to, situation, context, opts = {}) {
  const baseUrl = process.env.PUBLIC_URL;
  if (!baseUrl) throw new Error("Set PUBLIC_URL in .env (ngrok URL)");

  const openingReply = opts.opening ||
    await getCallingReply(situation, context, []);

  const tempKey = `tmp_${Date.now()}`;
  callSessions.set(tempKey, {
    situation,
    context,
    conversationHistory: [{ role: "assistant", content: openingReply }],
    phoneNumber: to,
    openingReply,
  });

  const call = await getClient().calls.create({
    to,
    from: process.env.TWILIO_PHONE_NUMBER,
    url: `${baseUrl}/twiml/answer?session=${tempKey}`,
    method: "GET",
    statusCallback: `${baseUrl}/twiml/status`,
    statusCallbackMethod: "POST",
  });

  const data = callSessions.get(tempKey);
  callSessions.delete(tempKey);
  callSessions.set(call.sid, data);

  console.log(`📞 Call placed!  SID: ${call.sid}  Status: ${call.status}`);
  return { callSid: call.sid, status: call.status, to, openingMessage: openingReply };
}

// ── POST /api/call ───────────────────────────────────────────────────────────
export async function initiateCall(req, res) {
  const { to, situation, context } = req.body;

  if (!to)        return res.status(400).json({ error: "Missing: to (e.g. +91XXXXXXXXXX)" });
  if (!situation) return res.status(400).json({ error: "Missing: situation" });
  if (!process.env.PUBLIC_URL)
    return res.status(500).json({ error: "Set PUBLIC_URL in .env (ngrok URL)" });

  try {
    console.log(`\n⏳ Generating opening for ${to}...`);
    const result = await triggerCall(to, situation, context || "A contact who may assist");
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("❌ Call error:", err.message);
    res.status(500).json({ error: err.message });
  }
}

// ── GET /twiml/answer ── person picks up ─────────────────────────────────────
export function twimlAnswer(req, res) {
  const { session, CallSid } = req.query;

  let sessionData = callSessions.get(session) || callSessions.get(CallSid);

  if (!sessionData) {
    const vr = new twilio.twiml.VoiceResponse();
    vr.say({ voice: "Polly.Aditi" }, "Hello, this is LifeLink Emergency Service. Please call one one two immediately.");
    vr.hangup();
    return res.type("text/xml").send(vr.toString());
  }

  if (CallSid && !callSessions.has(CallSid)) {
    callSessions.set(CallSid, sessionData);
    callSessions.delete(session);
  }

  const activeSid = CallSid || session;
  const twiml = buildGatherTwiML(
    sessionData.openingReply,
    `${process.env.PUBLIC_URL}/twiml/respond?callSid=${activeSid}`
  );
  res.type("text/xml").send(twiml);
}

// ── POST /twiml/respond ── each time person speaks ───────────────────────────
export async function twimlRespond(req, res) {
  const { callSid }  = req.query;
  const speechResult = (req.body.SpeechResult || "").trim();
  const confidence   = parseFloat(req.body.Confidence || "0");

  console.log(`🗣  [${callSid}] Person: "${speechResult}" (${(confidence * 100).toFixed(0)}%)`);

  const session = callSessions.get(callSid);
  if (!session) {
    const vr = new twilio.twiml.VoiceResponse();
    vr.say({ voice: "Polly.Aditi" }, "Thank you. Please call one one two for assistance. Goodbye.");
    vr.hangup();
    return res.type("text/xml").send(vr.toString());
  }

  const endWords = ["bye", "goodbye", "ok thanks", "thank you bye", "on my way",
    "coming now", "i will come", "i'll be there", "understood", "will do"];
  const wantsToEnd = endWords.some(w => speechResult.toLowerCase().includes(w));

  if (speechResult) {
    session.conversationHistory.push({ role: "user", content: speechResult });
  }

  if (wantsToEnd) {
    const farewell = "Thank you so much. Please hurry. Your help means everything right now. Stay safe.";
    const vr = new twilio.twiml.VoiceResponse();
    vr.say({ voice: "Polly.Aditi", language: "en-IN" }, farewell);
    vr.hangup();
    console.log(`📴 [${callSid}] Ended gracefully\n`);
    callSessions.delete(callSid);
    return res.type("text/xml").send(vr.toString());
  }

  let agentReply;
  try {
    agentReply = await getCallingReply(session.situation, session.context, session.conversationHistory);
  } catch (err) {
    console.error("Agent error:", err.message);
    agentReply = "I apologize for the difficulty. Please call one one two immediately. Thank you.";
  }

  session.conversationHistory.push({ role: "assistant", content: agentReply });
  console.log(`🤖 [${callSid}] Agent: "${agentReply}"\n`);

  const twiml = buildGatherTwiML(
    agentReply,
    `${process.env.PUBLIC_URL}/twiml/respond?callSid=${callSid}`
  );
  res.type("text/xml").send(twiml);
}

// ── POST /twiml/status ── call lifecycle events ──────────────────────────────
export function twimlStatus(req, res) {
  const { CallSid, CallStatus, Duration } = req.body;
  const icons = { ringing: "🔔", answered: "✅", completed: "✅", "no-answer": "❌", busy: "📵", failed: "💥" };
  console.log(`${icons[CallStatus] || "📊"} [${CallSid}] ${CallStatus}${Duration ? ` — ${Duration}s` : ""}`);

  if (["completed", "failed", "busy", "no-answer", "canceled"].includes(CallStatus)) {
    callSessions.delete(CallSid);
  }
  res.sendStatus(200);
}

// ── GET /api/sessions ── debug ───────────────────────────────────────────────
export function getSessions(req, res) {
  const list = [];
  for (const [sid, d] of callSessions.entries()) {
    list.push({ callSid: sid, to: d.phoneNumber, situation: d.situation, turns: d.conversationHistory.length });
  }
  res.json({ count: list.length, sessions: list });
}
