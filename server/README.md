# LifeLink — Emergency Response Server

Express + MongoDB backend behind the SafeGuard mobile app. One tap on SOS fires a background alerting pipeline (templated SMS + AI voice calls to emergency contacts via Twilio), then powers a multilingual voice agent (Azure Speech TTS/STT, GPT-4o-mini) that streams audio to the app. Exposes auth, emergency contacts, nearby services, and health/doctor endpoints.

---

## Requirements

| Requirement | Details |
|---|---|
| **Node.js** | v18 or higher (native `fetch`) |
| **MongoDB** | Local or Atlas — `MONGODB_URI` |
| **Twilio** | Trial works — needs a number with Voice + SMS, verified destination numbers |
| **Azure Speech** | TTS + STT (region `eastus` / `centralindia` / `southeastasia`…) |
| **GitHub AI Inference or Azure OpenAI** | GPT-4o-mini access (`GITHUB_TOKEN` or Azure `API_KEY` + `AZURE_DEPLOYMENT`) |
| **ngrok** | Exposes localhost so Twilio webhooks can reach `/twiml/*` |

---

## Installation

```bash
cd server
npm install
# create .env (below)
npm run dev        # nodemon (hot reload) — recommended
# npm start        # plain node
```

---

## Environment Variables

```env
# ── Server ─────────────────────────────
PORT=3000                              # default 3000, ours: 3001
MONGODB_URI=mongodb://localhost:27017/safeguard

# ── Azure Speech (TTS + STT) ────────────
AZURE_SPEECH_KEY=your_key
AZURE_SPEECH_REGION=eastus
AZURE_ENDPOINT=https://eastus.api.cognitive.microsoft.com/

# ── LLM (either works) ─────────────────
GITHUB_TOKEN=github_pat_xxx
# or Azure AI inference:
AZURE_ENDPOINT=https://your-model.inference.ai.azure.com/
AZURE_API_KEY=your_key
AZURE_DEPLOYMENT=model-name

# ── Twilio (SMS + calls) ───────────────
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
PUBLIC_URL=https://xxxx.ngrok-free.app   # update after every ngrok restart

# ── Google Places (nearby services) ────
GOOGLE_MAPS_KEY=AIza...
```

> **Twilio trial caveat:** SMS and calls only reach phone numbers verified in the Twilio Console. Unverified destinations fail fast with a clear error in the SOS status payload — add all real contact numbers as Verified Caller IDs before live use.

---

## How the Flow Works

### SOS alerting (mobile app)
```
POST /api/sos  ── 202 { queued, sessionId }   (instant; nothing blocks the user)
        │
        ▼  (background)
runAlertPipeline(sessionId)
   ├─ for each emergency contact:
   │     ├─ SMS  → buildAlertSMS()  (pre-written template, NO LLM)
   │     └─ Call → buildCallOpening() + CallingController.triggerCall(opts.opening)
   └─ sosAlerts Map tracks per-contact, per-channel status
        │
        ▼
GET /api/sos/status/:sessionId   (app polls every 2.5 s while alerting)
   → { status: queued|sending|done, deliveredCount,
       contacts: [{ name, to, sms: pending/ok/error, call: …, errorDetail }] }
```

- Follow-up `/api/sos/assist` sends a templated "help has arrived / what happened" SMS, throttled to one attempt / 2 minutes per contact.
- All alert texts are templates — the LLM never sits on the critical path.

### Agent voice loop (mobile)
```
app → POST /api/chat { message, history, lang, emergencyAlreadyTriggered }
   → GPT-4o-mini reply (same language as user)          agents/agent.js
app → GET /api/tts?text=…&lang=en-IN
   → Azure neural voice streamed as audio/mpeg (chunked, ~2 s first byte)
app → POST /api/transcribe (WAV m4a) → ffmpeg decode → Azure STT → { text, lang }
```

### Legacy Twilio call loop (Twilio → server)
```
ngrok → /twiml/answer → plays pre-generated opening → contact speaks
     → /twiml/respond → AI reply → loop until goodbye / call end
     → /twiml/status  → TwiML lifecycle events
```

---

## Project Structure

```
server/
├── index.js                  ← entry: Express + Mongoose + route mounting
├── main.html                 ← legacy browser voice UI (demo)
│
├── agents/
│   ├── agent.js              ← all LLM calls (chat, calling replies, SMS gen)
│   ├── ChatController.js     ← chat, streaming TTS (GET /api/tts), STT + ffmpeg transcode
│   ├── CallingController.js  ← outbound call, TwiML webhook handlers
│   ├── MessagingController.js← SMS (single + bulk)
│   └── NearbyController.js   ← Google Places nearby services
│
├── controllers/
│   ├── SosController.js      ← 202 + background alert pipeline + status map
│   ├── UserController.js     ← auth + profile
│   ├── EmergencyController.js← emergency contacts
│   └── HealthController.js   ← symptoms / doctor booking / reminders
│
├── models/                   ← UserModel, EmergencyModel (Mongoose)
├── routes/                   ← one router per domain (see below)
└── scripts/clean-db.js       ← wipe dev data
```

---

## API Endpoints

### SOS
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/sos` | Fire SOS → `202 { queued, sessionId }`, alerts run in background |
| `GET` | `/api/sos/status/:sessionId` | Per-contact SMS/call delivery status (poll target) |
| `POST` | `/api/sos/assist` | Follow-up "voice agent" SMS with 2-min retry cooldown |

### Chat / Voice
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | AI agent conversation (multilingual) |
| `POST` | `/api/speak` | Full-length TTS → base64 WAV (fallback path) |
| `GET` | `/api/tts` | **Streaming** TTS, `text` + `lang` query params, `audio/mpeg` |
| `POST` | `/api/transcribe` | STT: upload m4a/WAV → ffmpeg decode → Azure STT |
| `GET` | `/api/speech-token`, `/api/speech-health` | Azure health checks / browser STT token |

### Users / Emergency
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/users/signup`, `/login` | Auth |
| `GET/PUT/DELETE` | `/api/users/:id` | Profile |
| `PUT` | `/api/users/:id/change-password` | Password change |
| `GET` | `/api/emergency/:userId` | List emergency contacts |
| `POST/PUT` | `/api/emergency/create`, `/api/emergency/:userId` | Create / replace set |
| `POST/DELETE` | `/api/emergency/:userId/add`, `/:userId/:contactId` | Add / remove one |

### Calling / Messaging (legacy, used by SOS pipeline)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/call` | Outbound AI call (`opts.opening` skips LLM generation) |
| `GET` | `/api/sessions` | Debug: active call sessions |
| `POST` | `/api/message`, `/api/message/bulk` | Single / bulk AI-generated SMS |
| `GET` | `/api/message/status/:sid` | Twilio delivery check |

### Nearby + Health
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/nearby` | Hospitals / police / services near a location |
| `POST` | `/api/health/symptom-check`, `/find-doctors`, `/book-appointment`, `/scan-medicine` | Health features |
| `POST` | `/api/health/reminders` · `GET`/`DELETE` `/:userId` · `/:reminderId` | Medication reminders |

### Twilio TwiML (internal — called by Twilio only)
`GET /twiml/answer` · `POST /twiml/respond` · `POST /twiml/status`

---

## Key Design Decisions

- **202 + polling** — SOS answers instantly; the alert pipeline runs in the background and the app polls `/api/sos/status/:sessionId`.
- **Templated alerts** — `buildAlertSMS()` / `buildCallOpening()` are instant templates; LLM only generates richer text after the alerts land.
- **Streaming TTS** — Azure MP3 streams straight to `expo-audio`, first-audio latency ≈ 2 s.
- **ffmpeg-static transcode** — client m4a is decoded server-side before Azure STT (no client-side format guesses).
- **In-memory call/alert sessions** — `sosAlerts` + call session `Map`s keyed by sessionId / CallSid; answered `CallSid` cleanup on call end.
- **Lazy Twilio client** — `getClient()` at runtime so `.env` is always loaded first.
- **Singleton guard** + retry cooldowns so a permanently-failing SMS never double-fires an alert.
- **Multilingual** — Telugu, Tamil, Kannada, Hindi, English: language detected per turn, replies and TTS follow the user's language.