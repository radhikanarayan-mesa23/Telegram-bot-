const fs = require("fs");
const path = require("path");

// Current Gemini Flash model. Override with GEMINI_MODEL if Google ships a
// newer flash model you want to switch to.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

function loadVoiceInstructions() {
  const filePath = path.join(process.cwd(), "voice-instructions.md");
  try {
    return fs.readFileSync(filePath, "utf8").trim();
  } catch {
    return "";
  }
}

async function draftPost(note) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const voiceInstructions = loadVoiceInstructions();

  const prompt = [
    "You are helping a founder named Meera turn a quick note into a polished social post, written in her own voice.",
    voiceInstructions
      ? `Here are Meera's writing style instructions:\n${voiceInstructions}`
      : "",
    "If the note refers to current events, news, or a factual claim you're not certain about, use Google Search to check for current, verified information before writing — don't guess or rely on outdated knowledge.",
    `Here is Meera's note:\n"""${note}"""`,
    "Write a draft post based on this note, in Meera's voice. Reply with only the draft post text, no preamble or explanation.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text).join("");

  if (!text) {
    throw new Error("Gemini returned no text");
  }

  const sources = (candidate?.groundingMetadata?.groundingChunks || [])
    .map((chunk) => chunk.web)
    .filter(Boolean)
    .slice(0, 5);

  return { draft: text.trim(), sources };
}

module.exports = { draftPost };
