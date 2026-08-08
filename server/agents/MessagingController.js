import twilio from "twilio";
import { generateSMSMessage } from "./agent.js";

function getClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// ── Exported helper: trigger SMS from ChatController ─────────────────────────
export async function sendSMS(to, situation, context, recipientName) {
  const body = await generateSMSMessage(
    situation,
    context || "A contact who may assist",
    recipientName
  );

  const message = await getClient().messages.create({
    to,
    from: process.env.TWILIO_PHONE_NUMBER,
    body,
  });

  console.log(`✉️  SMS sent  SID: ${message.sid}  To: ${to}`);
  return { messageSid: message.sid, status: message.status, to, body };
}

// ── POST /api/message ────────────────────────────────────────────────────────
export async function sendMessage(req, res) {
  const { to, situation, context, recipientName, customMessage } = req.body;

  if (!to) return res.status(400).json({ error: "Missing: to (e.g. +91XXXXXXXXXX)" });
  if (!situation && !customMessage)
    return res.status(400).json({ error: "Missing: situation or customMessage" });

  try {
    let messageBody;

    if (customMessage) {
      messageBody = customMessage;
      console.log(`\n📝 Using custom message for ${to}`);
    } else {
      console.log(`\n⏳ Generating message for ${to}...`);
      messageBody = await generateSMSMessage(
        situation,
        context || "A contact who may assist",
        recipientName
      );
      console.log(`✅ Message ready: "${messageBody}"`);
    }

    const message = await getClient().messages.create({
      to,
      from: process.env.TWILIO_PHONE_NUMBER,
      body: messageBody,
    });

    console.log(`\n✉️  Message sent!  SID: ${message.sid}  Status: ${message.status}`);
    console.log(`   To: ${to}  Body: "${messageBody}"\n`);

    res.json({ success: true, messageSid: message.sid, status: message.status, to, body: messageBody });
  } catch (err) {
    console.error("❌ Message error:", err.message);
    res.status(500).json({ error: err.message });
  }
}

// ── POST /api/message/bulk ───────────────────────────────────────────────────
export async function sendBulk(req, res) {
  const { recipients, situation, context } = req.body;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0)
    return res.status(400).json({ error: "Missing: recipients array" });
  if (!situation)
    return res.status(400).json({ error: "Missing: situation" });

  console.log(`\n⏳ Sending bulk messages to ${recipients.length} recipients...`);

  const results = await Promise.allSettled(
    recipients.map(async ({ to, recipientName }) => {
      const body = await generateSMSMessage(
        situation,
        context || "A contact who may assist",
        recipientName
      );
      const message = await getClient().messages.create({
        to,
        from: process.env.TWILIO_PHONE_NUMBER,
        body,
      });
      console.log(`   ✉️  Sent to ${to}  SID: ${message.sid}`);
      return { to, messageSid: message.sid, status: message.status, body };
    })
  );

  const sent   = results.filter(r => r.status === "fulfilled").map(r => r.value);
  const failed = results.filter(r => r.status === "rejected").map(r => ({ error: r.reason?.message }));

  console.log(`\n📊 Bulk done — ${sent.length} sent, ${failed.length} failed\n`);
  res.json({ success: true, sent, failed, total: recipients.length });
}

// ── GET /api/message/status/:sid ─────────────────────────────────────────────
export async function getMessageStatus(req, res) {
  const { sid } = req.params;
  try {
    const message = await getClient().messages(sid).fetch();
    res.json({
      messageSid: message.sid,
      to: message.to,
      from: message.from,
      status: message.status,
      body: message.body,
      dateSent: message.dateSent,
      errorMessage: message.errorMessage || null,
    });
  } catch (err) {
    console.error("❌ Status fetch error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
