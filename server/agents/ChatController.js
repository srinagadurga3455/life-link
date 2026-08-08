import * as sdk from "microsoft-cognitiveservices-speech-sdk";

import { getChatReply } from "./agent.js";
import { triggerCall } from "./CallingController.js";
import { sendSMS } from "./MessagingController.js";

// ── Emergency Config ─────────────────────────────────────────────────────────
// Fallback number used by the AI chat keyword-trigger (no userId available here).
// For explicit SOS with user contacts use POST /api/sos instead.
const EMERGENCY_CONTACT = "+917330873455";

// ── Situation Classifier → map query ────────────────────────────────────────
export function classifyEmergency(situation) {
  const s = (situation || '').toLowerCase();
  if (/heart attack|chest pain|cardiac|cardio\b|angina|heart failure|myocardial|sweating.*pain|palpitation/.test(s))
    return { type: 'cardiac', mapQuery: 'cardiology hospital', label: 'Cardiology Hospitals', icon: '❤️', specialist: 'Cardiology' };
  if (/stroke|brain|neuro|paralysis|unconscious|seizure|epilepsy|numbness.*face|sudden weakness/.test(s))
    return { type: 'neuro', mapQuery: 'neurology hospital', label: 'Neurology Hospitals', icon: '🧠', specialist: 'Neurology' };
  if (/accident|severe bleed|fracture|broken bone|trauma|road accident|crush|amputation/.test(s))
    return { type: 'trauma', mapQuery: 'trauma centre emergency hospital', label: 'Trauma Centers', icon: '🚑', specialist: 'Trauma Center' };
  if (/bleed|wound|laceration|cut/.test(s))
    return { type: 'trauma', mapQuery: 'emergency hospital', label: 'Emergency Hospitals', icon: '🚑', specialist: 'Trauma Center' };
  if (/snake ?bite|scorpion|poison|poisoning|toxin|overdose/.test(s))
    return { type: 'poison', mapQuery: 'hospital antivenom emergency', label: 'Emergency Hospitals', icon: '🏥', specialist: 'General Emergency' };
  if (/burn|fire|burning|scald/.test(s))
    return { type: 'burn', mapQuery: 'burn centre hospital', label: 'Burn Centers', icon: '🔥', specialist: 'Burn Care' };
  if (/child|baby|infant|pediatric|newborn/.test(s))
    return { type: 'pediatric', mapQuery: 'children hospital paediatric', label: "Children's Hospitals", icon: '👶', specialist: 'Pediatrics' };
  if (/mental|suicide|self.?harm|depression|anxiety crisis/.test(s))
    return { type: 'mental', mapQuery: 'psychiatry mental health hospital', label: 'Mental Health Centers', icon: '🧠', specialist: 'Psychiatry' };
  if (/maternity|delivery|labor|labour|pregnancy|pregnant|obstetric|contraction/.test(s))
    return { type: 'maternity', mapQuery: 'maternity hospital gynaecology', label: 'Maternity Hospitals', icon: '🤱', specialist: 'Obstetrics' };
  if (/eye|vision|ophthalmol/.test(s))
    return { type: 'eye', mapQuery: 'eye hospital ophthalmology', label: 'Eye Hospitals', icon: '👁️', specialist: 'Ophthalmology' };
  if (/fracture|bone|orthop|sprain|dislocation/.test(s))
    return { type: 'ortho', mapQuery: 'orthopaedic hospital', label: 'Orthopaedic Hospitals', icon: '🦴', specialist: 'Orthopedics' };
  if (/chok|not breathing|can't breathe|cannot breathe|breathing difficult|breathlessness|drown|asphyxia/.test(s))
    return { type: 'respiratory', mapQuery: 'emergency hospital', label: 'Emergency Hospitals', icon: '🫁', specialist: 'General Emergency' };
  return { type: 'general', mapQuery: 'emergency hospital', label: 'Emergency Hospitals', icon: '🏥', specialist: 'General Emergency' };
}

// ── Severity Extractor ────────────────────────────────────────────────────────
export function extractSeverity(replyText) {
  const m = replyText.match(/Emergency Level:\s*(CRITICAL|HIGH|MODERATE|LOW)/i);
  return m ? m[1].toUpperCase() : null;
}

// ── Emergency Summary Extractor ──────────────────────────────────────────────
function extractEmergencySummary(replyText) {
  const idx = replyText.indexOf('Emergency Summary');
  if (idx === -1) return null;
  return replyText.slice(idx).trim();
}

// ── Google Places Nearby Search (skipped if no API key) ─────────────────────
async function fetchNearbyPlaces(lat, lng, mapQuery) {
  const key = process.env.GOOGLE_MAPS_KEY;
  if (!key || !lat || !lng) return null;
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.location',
          'places.rating',
          'places.regularOpeningHours.openNow',
        ].join(','),
      },
      body: JSON.stringify({
        textQuery: mapQuery,
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 10000.0,
          },
        },
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      console.warn('Places API status:', response.status, data?.error?.message || '');
      return null;
    }
    return (data.places || []).slice(0, 3).map(p => ({
      id:      p.id,
      name:    p.displayName?.text ?? null,
      address: p.formattedAddress ?? null,
      rating:  p.rating ?? null,
      lat:     p.location?.latitude ?? null,
      lng:     p.location?.longitude ?? null,
      open:    p.regularOpeningHours?.openNow ?? null,
    }));
  } catch (e) {
    console.warn('Places API error:', e.message);
    return null;
  }
}

const EMERGENCY_KEYWORDS = [
  // English
  "injured", "hurt", "bleeding", "accident", "crash", "fell", "fallen",
  "help", "need help", "emergency", "attack", "heart attack", "unconscious",
  "not breathing", "choking", "drowning", "stroke", "seizure", "snake bite",
  "harassed", "stalked", "unsafe", "danger", "threatened", "assaulted",
  "fire", "burning", "trapped", "pain", "severe pain", "dying", "fainted",
  "i am hurt", "i got hurt", "i need help", "please help", "save me",
  "cannot breathe", "can't breathe", "chest pain",
  // Telugu
  "సహాయం", "నొప్పి", "ప్రమాదం", "గాయపడ్డాను",
  // Hindi
  "help karo", "bachao", "madad", "dard", "chot lagi",
  // Tamil
  "உதவி", "காயம்", "ஆபத்து",
];

function isEmergency(message) {
  const lower = message.toLowerCase();
  return EMERGENCY_KEYWORDS.some(kw => lower.includes(kw));
}

function buildSituation(message, history) {
  const userMessages = [
    ...history.filter(m => m.role === "user").map(m => m.content),
    message,
  ].slice(-4).join(" | ");
  return userMessages.length > 300 ? userMessages.slice(0, 300) + "..." : userMessages;
}

async function triggerEmergencyServices(situation) {
  const results = { message: null, call: null };
  const ctx = "Emergency contact of the person in distress. They need immediate assistance.";

  try {
    console.log(`\n🚨 [Emergency] Sending SMS to ${EMERGENCY_CONTACT}...`);
    results.message = await sendSMS(EMERGENCY_CONTACT, situation, ctx, "Emergency Contact");
    console.log(`✅ [Emergency] SMS sent — SID: ${results.message.messageSid}`);
  } catch (err) {
    console.error("❌ [Emergency] SMS failed:", err.message);
    results.message = { error: err.message };
  }

  try {
    console.log(`📞 [Emergency] Placing call to ${EMERGENCY_CONTACT}...`);
    results.call = await triggerCall(EMERGENCY_CONTACT, situation, ctx);
    console.log(`✅ [Emergency] Call placed — SID: ${results.call.callSid}`);
  } catch (err) {
    console.error("❌ [Emergency] Call failed:", err.message);
    results.call = { error: err.message };
  }

  return results;
}

// ── Language Detection ───────────────────────────────────────────────────────
export function detectLanguage(text) {
  if (/[\u0C00-\u0C7F]/.test(text)) return { code: "te-IN", name: "Telugu" };
  if (/[\u0B80-\u0BFF]/.test(text)) return { code: "ta-IN", name: "Tamil" };
  if (/[\u0C80-\u0CFF]/.test(text)) return { code: "kn-IN", name: "Kannada" };
  if (/[\u0900-\u097F]/.test(text)) return { code: "hi-IN", name: "Hindi" };
  return { code: "en-IN", name: "English" };
}

// ── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are LifeLink — an AI Emergency Response Assistant integrated into a mobile safety application.

Your purpose is to help users during medical emergencies by analyzing their situation, providing first aid guidance, recommending appropriate hospitals nearby, and triggering SOS assistance when necessary.

Always follow this exact workflow in every response:

STEP 1 — UNDERSTAND THE SITUATION
Analyze the user's message and extract: symptoms, injuries, accident details, number of people involved, urgency indicators (bleeding, unconscious, breathing issues, etc.). Never ignore critical symptoms.

STEP 2 — IDENTIFY POSSIBLE EMERGENCY TYPE
Based on symptoms, estimate the most likely emergency category. Examples:
- Chest pain + sweating → Possible heart attack
- Severe bleeding → Trauma emergency
- Burn injury → Burn emergency
- Unconscious person → Neurological or cardiac emergency
- Pregnancy pain → Obstetric emergency
- Seizures → Neurology emergency
IMPORTANT: Never give a definite diagnosis. Always say "possible condition".

STEP 3 — DETERMINE SEVERITY LEVEL
Classify into: LOW | MODERATE | HIGH | CRITICAL
- LOW: Minor injury, mild symptoms
- MODERATE: Needs medical attention but not immediately life-threatening
- HIGH: Serious condition requiring urgent hospital care
- CRITICAL: Life-threatening — unconsciousness, severe bleeding, chest pain, breathing difficulty, stroke, severe burns, major accidents

STEP 4 — DETERMINE REQUIRED MEDICAL SPECIALIST
Cardiology / Trauma Center / Neurology / Burn Care / Orthopedics / Obstetrics / Pediatrics / General Emergency

STEP 5 — PROVIDE FIRST AID GUIDANCE
Maximum 5 clear steps. Immediate actions only. Safety first.

STEP 6 — HOSPITAL RECOMMENDATION
Say: "Searching for nearby hospitals with [specialty] care."

STEP 7 — SOS DECISION
- If HIGH: Recommend activating SOS.
- If CRITICAL: Strongly instruct the user to trigger SOS immediately.
SOS actions: contacting emergency services, notifying emergency contacts, sharing live location, sending AI-generated emergency summary.

STEP 8 — GENERATE EMERGENCY SUMMARY (only if HIGH or CRITICAL)
Include:
Emergency Summary
Possible Condition: ...
Symptoms: ...
Severity: HIGH/CRITICAL
Recommended Specialist: ...

RESPONSE FORMAT — always use this exact structure:

Situation Analysis:
(brief explanation)

Possible Condition:
(estimated medical issue)

Emergency Level:
LOW / MODERATE / HIGH / CRITICAL

Recommended Specialist:
(type of doctor or hospital)

First Aid Guidance:
1.
2.
3.
4.
5.

Hospital Recommendation:
Searching for nearby hospitals with [specialty].

Emergency Advice:
(state whether SOS should be activated)

Emergency Summary:
(include only if HIGH or CRITICAL)

CRITICAL RULES:
- Always respond in the SAME LANGUAGE the user speaks (Telugu, Tamil, Kannada, Hindi, or English)
- Be CALM, CLEAR, AUTHORITATIVE — you are their lifeline right now
- Do NOT panic the user. Stay calm and clear.
- Never give long explanations. Focus on actionable instructions.
- If the user reports life-threatening symptoms, strongly recommend activating SOS immediately.
- Always include relevant emergency numbers when appropriate:
  * Ambulance / Medical: 108  * Police: 100  * Women's Helpline: 1091  * National Emergency: 112
- For Telugu: respond in fluent Telugu script
- You have a warm, trustworthy South Indian personality — never robotic, never panicked
- Your purpose is to save time during emergencies.`;

// ── POST /api/chat ───────────────────────────────────────────────────────────
export async function chat(req, res) {
    
  const { message, history = [], emergencyAlreadyTriggered = false, location } = req.body;
  if (!message) return res.status(400).json({ error: "No message provided" });

  const detectedInputLang = detectLanguage(message);
  const keywordEmergency  = !emergencyAlreadyTriggered && isEmergency(message);

  // Always classify based on full conversation context
  const situation      = buildSituation(message, history);
  const classification = classifyEmergency(situation);

  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-8),
      { role: "user", content: message },
    ];

    // Get AI reply first so we can extract structured severity
    const reply = await getChatReply(messages, { maxTokens: 600, temperature: 0.3 });

    // Extract severity from AI's structured response
    const severity        = extractSeverity(reply);
    const emergencySummary = extractEmergencySummary(reply);
    const isHighOrCritical = severity === 'HIGH' || severity === 'CRITICAL';

    // Trigger emergency services: keyword detection OR HIGH/CRITICAL severity from AI
    const shouldTrigger = (keywordEmergency || isHighOrCritical) && !emergencyAlreadyTriggered;

    // Fetch nearby places whenever we have location (always — even for general queries)
    const shouldFetchPlaces = !!(location?.lat);

    const [emergencyActions, nearbyPlaces] = await Promise.all([
      shouldTrigger
        ? triggerEmergencyServices(situation)
        : Promise.resolve(null),
      // Server-side Places fetch (works only when server can reach Google)
      // Client will fallback to its own fetch if this returns null
      shouldFetchPlaces
        ? fetchNearbyPlaces(location.lat, location.lng, classification.mapQuery)
        : Promise.resolve(null),
    ]);

    const replyLang = detectLanguage(reply);

    if (shouldTrigger) {
      console.log(`\n🆘 Emergency triggered for: "${message.slice(0, 60)}"`);
      console.log(`   ⚠️  Severity: ${severity || 'keyword-detected'} | Type: ${classification.type}`);
      if (nearbyPlaces) console.log(`   🗺  Found ${nearbyPlaces.length} nearby place(s)`);
    }

    res.json({
      reply,
      detectedInputLang,
      replyLang,
      severity:          severity || null,
      emergencySummary:  emergencySummary || null,
      emergencyTriggered: shouldTrigger,
      emergencyActions,
      // Hospital lookup payload
      nearbyPlaces:  nearbyPlaces       || null,
      mapQuery:      classification.mapQuery,
      placeLabel:    classification.label,
      placeIcon:     classification.icon,
      situationType: classification.type,
      specialist:    classification.specialist,
    });
  } catch (err) {
    console.error("Chat error:", err.message);
    const isRateLimit = /rate.?limit|429|too many/i.test(err.message);
    const isTimeout   = /timed? out/i.test(err.message);

    // Even when AI fails, try to return nearby hospitals if location was provided
    let nearbyPlaces = null;
    if (location?.lat) {
      try {
        nearbyPlaces = await fetchNearbyPlaces(location.lat, location.lng, classification.mapQuery);
      } catch (_) {}
    }

    const errMsg = isRateLimit
      ? "AI service is temporarily rate-limited. Please wait a moment, or call 112 for immediate emergencies."
      : isTimeout
        ? "AI assistant is busy right now. Here are the nearest hospitals for you — or call 112 immediately."
        : "AI temporarily unavailable. Showing nearby hospitals below. Call 112 for emergencies.";

    return res.status(isRateLimit ? 429 : 200).json({
      reply:         errMsg,
      error:         isRateLimit ? errMsg : undefined,
      fallback:      "Please call 112 for immediate emergency assistance.",
      nearbyPlaces:  nearbyPlaces || null,
      mapQuery:      classification.mapQuery,
      placeLabel:    classification.label,
      placeIcon:     classification.icon,
      situationType: classification.type,
      specialist:    classification.specialist,
      severity:      null,
    });
  }
}

// ── POST /api/transcribe ─────────────────────────────────────────────────────
// Body: { audio: "<base64 string>", lang: "<hint locale>" }
// The phone records m4a (MP4/AAC) via expo-audio, but Azure's REST STT only
// accepts WAV/PCM, OGG/Opus, MP3 or FLAC — sending m4a yields "NoSpeech" even
// for clear speech. So we transcode m4a → 16 kHz mono PCM WAV with ffmpeg-static
// first, then recognize ON locale at a time (start from the client's hint) to
// avoid Azure's free-tier concurrency throttle (429 on parallel bursts).
import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";

const STT_LOCALES = ["en-IN", "hi-IN", "te-IN", "ta-IN", "kn-IN"];

// ffmpeg must be driven via raw stdio pipes — on Windows the execFile `input`
// option leaves ffmpeg waiting on stdin forever (garbage in, hang out).
function transcodeToWav(inputBuffer) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("ffmpeg-static binary not found"));
    const child = spawn(ffmpegPath, [
      "-hide_banner", "-loglevel", "error",
      "-i", "pipe:0",
      "-ac", "1", "-ar", "16000",
      "-f", "wav", "-acodec", "pcm_s16le",
      "pipe:1",
    ]);
    const out = [];
    let errOut = '';
    child.stdout.on("data", d => out.push(d));
    child.stderr.on("data", d => { errOut += d.toString(); });
    child.on("error", err => reject(err));
    child.on("close", code => {
      if (code !== 0 || !Buffer.concat(out).length) {
        reject(new Error(`ffmpeg exit ${code}: ${errOut.slice(0, 300) || 'no output'}`));
      } else {
        resolve(Buffer.concat(out));
      }
    });
    child.stdin.on("error", () => {});
    child.stdin.write(inputBuffer, () => child.stdin.end());
  });
}

async function recognizeSpeech(language, audioBuffer, contentType) {
  const region = process.env.AZURE_SPEECH_REGION;
  const key    = process.env.AZURE_SPEECH_KEY;
  const url = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1` +
              `?language=${language}&format=detailed&profanity=masked`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': contentType,
        'Accept':        'application/json',
      },
      body: audioBuffer,
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn(`STT REST error for ${language}: ${response.status} ${body.slice(0, 200)}`);
      return null;
    }
    return response.json();
  } catch (err) {
    console.warn(`STT request failed for ${language}:`, err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function transcribe(req, res) {
  const { audio, lang } = req.body;
  if (!audio) return res.status(400).json({ error: 'No audio provided' });

  if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
    console.warn('Azure Speech not configured — STT unavailable');
    return res.status(503).json({ error: 'Speech service not configured' });
  }

  try {
    const audioBuffer = Buffer.from(audio, 'base64');
    if (audioBuffer.length < 100) {
      console.warn('STT rejected: audio too small to contain speech:', audioBuffer.length, 'bytes');
      return res.json({ text: '', lang: lang || 'en-IN', noSpeech: true });
    }

    // m4a/MP4-AAC is NOT supported by Azure REST STT → decode to 16k mono PCM WAV
    let wavBuffer, contentType = 'audio/wav; codecs=audio/pcm';
    try {
      wavBuffer = await transcodeToWav(audioBuffer);
      console.log(`STT: decoded ${audioBuffer.length} bytes → ${wavBuffer.length} bytes WAV (16k mono)`);
    } catch (ffErr) {
      console.warn('ffmpeg decode failed — falling back to raw m4a upload:', ffErr.message);
      wavBuffer  = audioBuffer;
      contentType = 'audio/mp4';
    }

    // Sequential locale tries (no parallel → no 429) with the client's hint first
    const hint = STT_LOCALES.includes(lang) ? lang : null;
    const ordered = hint ? [hint, ...STT_LOCALES.filter(l => l !== hint)] : STT_LOCALES;

    for (const locale of ordered) {
      const data = await recognizeSpeech(locale, wavBuffer, contentType);
      if (!data) continue;
      const text = (data.DisplayText || '').trim();
      if (data.RecognitionStatus !== 'Success' || !text) {
        console.log(`STT ${locale}: ${data.RecognitionStatus || 'empty'} — trying next locale`);
        continue;
      }
      console.log(`✅ STT result (${detectLanguage(text).code} via ${locale}):`, text);
      return res.json({ text, lang: detectLanguage(text).code, noSpeech: false });
    }

    console.log('✅ STT result: (nothing recognised in any language)');
    res.json({ text: '', lang: hint || 'en-IN', noSpeech: true });
  } catch (err) {
    console.error('Transcribe error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ── GET /api/tts/stream ──────────────────────────────────────────────────────
// Streams Azure TTS mp3 chunks straight to the client (no base64 round-trip —
// the app plays the URL directly). Falls back through the b64 /api/speak route.
const TTS_VOICES = {
  "te-IN": "te-IN-ShrutiNeural",
  "ta-IN": "ta-IN-PallaviNeural",
  "kn-IN": "kn-IN-SapnaNeural",
  "hi-IN": "hi-IN-SwaraNeural",
  "en-IN": "en-IN-NeerjaNeural",
};

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function ttsStream(req, res) {
  const text = (req.query.text || "").slice(0, 2000);
  const lang = req.query.lang || "en-IN";
  if (!text.trim()) return res.status(400).json({ error: "No text provided" });

  const region = process.env.AZURE_SPEECH_REGION;
  const key    = process.env.AZURE_SPEECH_KEY;
  if (!key || !region) return res.status(503).json({ error: "Speech service not configured" });

  const ssml =
    `<speak version="1.0" xml:lang="${lang}"><voice name="${TTS_VOICES[lang] || TTS_VOICES['en-IN']}">` +
    `${escapeXml(text)}</voice></speak>`;

  try {
    const azure = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
        'User-Agent': 'LifeLink',
      },
      body: ssml,
    });
    if (!azure.ok) {
      const body = await azure.text().catch(() => '');
      console.error('TTS stream failed:', azure.status, body.slice(0, 200));
      return res.status(502).json({ error: `TTS stream failed (${azure.status})` });
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    Readable.fromWeb(azure.body).pipe(res);
  } catch (err) {
    console.error('TTS stream error:', err.message);
    res.status(500).json({ error: "Speech service unavailable" });
  }
}

// ── POST /api/speak ──────────────────────────────────────────────────────────
// Body: { text, lang } → returns { audio: "<base64 mp3>" }
export async function speak(req, res) {
  const { text, lang } = req.body;
  if (!text) return res.status(400).json({ error: "No text provided" });

  const voiceMap = {
    "te-IN": "te-IN-ShrutiNeural",
    "ta-IN": "ta-IN-PallaviNeural",
    "kn-IN": "kn-IN-SapnaNeural",
    "hi-IN": "hi-IN-SwaraNeural",
    "en-IN": "en-IN-NeerjaNeural",
  };

  const voiceName = voiceMap[lang] || "en-IN-NeerjaNeural";

  try {
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.AZURE_SPEECH_KEY,
      process.env.AZURE_SPEECH_REGION
    );
    speechConfig.speechSynthesisVoiceName = voiceName;
    speechConfig.speechSynthesisOutputFormat =
      sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

    synthesizer.speakTextAsync(
      text,
      (result) => {
        synthesizer.close();
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          const buf = Buffer.from(result.audioData);
          res.json({ audio: buf.toString("base64") });
        } else {
          console.error("TTS failed:", result.errorDetails);
          res.status(500).json({ error: "Speech synthesis failed" });
        }
      },
      (err) => {
        synthesizer.close();
        console.error("TTS exception:", err);
        res.status(500).json({ error: "Speech service error" });
      }
    );
  } catch (err) {
    console.error("Speak error:", err);
    res.status(500).json({ error: "Speech service unavailable" });
  }
}

// ── GET /api/speech-health ───────────────────────────────────────────────────
// Quick diagnostic: verifies the Azure Speech key/region by probing STT + TTS.
export async function speechHealth(req, res) {
  const key    = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) {
    return res.json({ configured: false, stt: null, tts: null, hint: "AZURE_SPEECH_KEY / AZURE_SPEECH_REGION missing in server/.env" });
  }

  const probe = async (fn) => {
    try { return { status: await fn() }; } catch (e) { return { error: e.message }; }
  };

  // Minimal valid 16 kHz mono 16-bit WAV (44-byte header, no samples) —
  // Azure returns 200 NoSpeech for valid silence, 400 for empty/invalid bodies.
  const wavProbe = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x28, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
    0x66, 0x6d, 0x74, 0x20, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
    0x40, 0x1f, 0x00, 0x00, 0x80, 0x3e, 0x00, 0x00, 0x02, 0x00, 0x10, 0x00,
    0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x00,
  ]);

  const stt = await probe(async () => {
    const r = await fetch(`https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-IN&format=simple`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        'Accept': 'application/json',
      },
      body: wavProbe,
    });
    return r.status;
  });

  const q = '"';
  const tts = await probe(async () => {
    const r = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
        'User-Agent': 'LifeLink',
      },
      body: `<speak version=${q}1.0${q} xml:lang=${q}en-IN${q}><voice name=${q}en-IN-NeerjaNeural${q}>hi</voice></speak>`,
    });
    return r.status;
  });

  const ok = stt.status === 200 || tts.status === 200;
  res.json({
    configured: true,
    region,
    keyTail: key.slice(-6),
    stt,
    tts,
    healthy: ok,
    hint: ok ? "Speech service reachable with this key/region."
      : "Azure rejects this key/region (401). Verify AZURE_SPEECH_KEY + AZURE_SPEECH_REGION in server/.env against your Azure Speech resource (portal → Speech service → Keys and Endpoint).",
  });
}

// ── GET /api/speech-token ────────────────────────────────────────────────────
export async function speechToken(req, res) {
  try {
    const response = await fetch(
      `${process.env.AZURE_ENDPOINT}sts/v1.0/issueToken`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    if (!response.ok) throw new Error("Token fetch failed: " + response.status);
    const token = await response.text();
    res.json({ token, region: process.env.AZURE_SPEECH_REGION });
  } catch (err) {
    console.error("Speech token error:", err);
    res.status(500).json({ error: "Failed to get speech token" });
  }
}
