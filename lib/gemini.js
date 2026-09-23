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
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned no text");
  }

  return text.trim();
}

module.exports = { draftPost };
