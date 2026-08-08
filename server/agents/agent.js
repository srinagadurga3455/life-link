import OpenAI from "openai";

const endpoint =
  process.env.AZURE_ENDPOINT ||
  "https://lifelink.services.ai.azure.com/openai/v1";

const apiKey = process.env.AZURE_API_KEY;

const deploymentName =
  process.env.AZURE_DEPLOYMENT || "gpt-4.1-mini";

if (!apiKey) {
  throw new Error("AZURE_API_KEY is not configured");
}

const openai = new OpenAI({
  baseURL: endpoint,
  apiKey,
});

// ─────────────────────────────────────────────────────────────────────────────
// Timeout helper
// ─────────────────────────────────────────────────────────────────────────────

function withTimeout(promise, ms, label = "Request") {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms
      )
    ),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat Agent
// ─────────────────────────────────────────────────────────────────────────────

export async function getChatReply(
  messages,
  { maxTokens = 350, temperature = 0.35 } = {}
) {
  try {
    const response = await withTimeout(
      openai.responses.create({
        model: deploymentName,
        input: messages,
        max_output_tokens: maxTokens,
        temperature,
      }),
      15000,
      "Azure AI inference"
    );

    const content = response.output_text;

    if (!content) {
      throw new Error("Azure AI returned an empty response");
    }

    return content.trim();
  } catch (error) {
    console.error("Azure AI error:", error);

    if (error?.status === 401) {
      throw new Error(
        "Azure AI authentication failed. Check AZURE_API_KEY."
      );
    }

    if (error?.status === 429) {
      throw new Error(
        "Azure AI is temporarily rate-limited. Please try again."
      );
    }

    if (error?.status === 404) {
      throw new Error(
        `Azure AI deployment '${deploymentName}' was not found.`
      );
    }

    if (error?.status === 400) {
      throw new Error(
        `Azure AI bad request: ${error?.message || "Invalid request"}`
      );
    }

    throw new Error(
      error?.message || "Azure AI model request failed"
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Calling Agent
// ─────────────────────────────────────────────────────────────────────────────

export async function getCallingReply(
  situation,
  context,
  conversationHistory = []
) {
  const systemPrompt = `You are LifeLink, an AI emergency voice agent making a phone call in South India.

EMERGENCY SITUATION: ${situation}

ABOUT THE PERSON YOU ARE CALLING: ${context}

RULES:
- First message: introduce yourself as "LifeLink Emergency Service", state the person's name if known, then clearly describe their exact situation word-for-word.
- Be calm, clear, and urgent.
- Maximum 2-3 sentences per response.
- No markdown or lists.
- Use natural spoken language only.
- If they reply in Telugu, Hindi, or Tamil, respond in that language.
- If they confirm they are coming or helping, thank them and prepare to end.
- Do not invent medical details or facts that were not provided.
- Do not provide a diagnosis.
- If the situation appears immediately life-threatening, encourage contacting emergency services such as 112.`;

  return getChatReply(
    [
      {
        role: "system",
        content: systemPrompt,
      },
      ...conversationHistory.slice(-10),
    ],
    {
      maxTokens: 180,
      temperature: 0.4,
    }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SMS Agent
// ─────────────────────────────────────────────────────────────────────────────

export async function generateSMSMessage(
  situation,
  context,
  recipientName
) {
  const systemPrompt = `You are LifeLink, an AI emergency messaging service in South India.

EMERGENCY SITUATION: ${situation}

ABOUT THE RECIPIENT: ${context}

RECIPIENT NAME: ${recipientName || "contact"}

RULES:
- Write a clear, urgent emergency SMS.
- Start with exactly: "LifeLink Emergency Alert:"
- Include the emergency situation.
- Ask the recipient for immediate assistance.
- Keep the message under 160 characters.
- No markdown.
- Plain text only.
- Be direct, urgent, and calm.
- Do not invent information.
- Do not provide a medical diagnosis.`;

  return getChatReply(
    [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: "Generate the emergency SMS message now.",
      },
    ],
    {
      maxTokens: 100,
      temperature: 0.3,
    }
  );
}
