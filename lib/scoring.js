const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

// Matches an explicit ask to score a specific post (used together with a
// Telegram reply, or embedded in a note that's also asking to be drafted).
const SCORE_TRIGGER =
  /\bscore\s+(this|it)\b|\bwhat'?s\s+the\s+score\b|\bhow\s+(does|would|is)\s+this\s+(rate|score)\b|\brate\s+this\b|\bworth\s+posting\b|\bis\s+this\s+worth\s+posting\b|\bgood\s+enough\s+to\s+post\b/i;

// Matches a message that is ONLY a scoring request, with no post attached
// (i.e. not sent as a reply) — used to ask Meera to reply to the post instead
// of guessing which one she means.
const PURE_SCORE_REQUEST =
  /^(score\s*(this|it)?|what'?s\s+the\s+score|how\s+(does|would|is)\s+this\s+(rate|score)|rate\s+this|is\s+this\s+worth\s+posting|worth\s+posting|good\s+enough\s+to\s+post)[.!?\s]*$/i;

function isScoreTrigger(text) {
  return SCORE_TRIGGER.test(text);
}

function isPureScoreRequest(text) {
  return PURE_SCORE_REQUEST.test(text.trim());
}

const RUBRIC = `Score the post below exactly according to this rubric.

## 1. Voice fit (0-100) — score against Meera's actual rules, not generic writing quality

Her voice: she translates real technical expertise for a skeptical reader, opens with a scene or blunt claim, states her intent early, builds sequentially, names the objection before the reader can raise it, and closes on one short instruction. Credibility comes from admitted failure or uncertainty, never asserted authority.

- OPENING (0-25): opens with a concrete scene, a specific number, or a direct claim — not a general observation or rhetorical question.
- OBJECTION HANDLING (0-25): a distinct passage names and addresses the obvious counterargument or limitation ("I'm not saying X, I'm saying Y" / "I want to be honest/careful about...").
- CLOSING (0-25): ends on one short, standalone, quotable sentence that reads as a usable instruction or flat verdict — not a summary or "let me know your thoughts."
- HARD VIOLATIONS (0-25, start at 25, subtract): -25 for ANY of: marketing adjectives (amazing, game-changing, obsessed, glow, elevate, luxurious, must-have), any emoji, any hashtag, any exclamation mark, a bulleted/numbered list explaining a sequence, a warm sign-off other than a bare first name. Floor at 0.

## 2. Topic fit — classification, feeds into flags

Meera writes ONLY within: Ingredient Deep-Dive, Formulation Science, India-Specific Context, Industry Transparency, Consumer Education, Brand Philosophy/Founder Story, Clean Beauty/Natural Claims. NOT her voice even if skincare-adjacent: celebrity beauty, makeup trends, routines/hauls, influencer recommendations, seasonal shopping guides, K-beauty/J-beauty trend coverage (unless about the underlying science or regulation).

Classify topic_category and topic_confidence (0-100). If confidence is below 50, this is an automatic flag regardless of every other score.

## 3. Newsworthiness (0-100) — only if the post was triggered by a news story; omit this line entirely for evergreen posts, do not penalize them for it

- Fresh (published within 24 hours): 90-100
- Moderate (1-3 days old): 60-89
- Stale (more than 3 days old): below 60
Adjust within the band by how directly the story matches the seven topic categories above.

## 4. Claim safety (0-100)

Extract every specific factual/quantitative claim (percentages, named ingredient behavior, comparative statements, regulatory statements, anything about Skinstinct's own formulation specs). Flag each:

- internal_data_claim_unverified: a specific claim about Skinstinct's own product/process (pH, stability intervals, CoA, return rates) you cannot confirm against known formulation facts. Highest severity.
- unsourced_claim: an external factual claim (ingredient science, regulation, industry-wide) with no source given.
- competitor_mention: any claim about a specific third-party brand/product, named or implied. Always flag regardless of accuracy.
- regulatory_claim_unverified: a statement about what's legal, illegal, regulated, or required, without a cited source.
- medical_claim_risk: a statement reading as health/medical advice rather than mechanism explanation.

claim_safety_score = 100 minus 20 per internal_data_claim_unverified or unsourced_claim (floor 0). The other three don't reduce the score but must still be listed as flags.

## 5. Composite

composite_score = 0.40 × voice_fit + 0.25 × newsworthiness (use 75 as a neutral default here for evergreen, non-news-triggered posts) + 0.35 × claim_safety_score

## Output — respond with EXACTLY this block, nothing before or after it, nothing else. Plain text only — no headers larger than the line below, no tables, no markdown beyond what's shown. Fill in the real computed values.

---
CONTENT SCORE: {composite_score}/100

Voice fit: {voice_fit}/100 — {one sentence citing the actual line that earned or lost points}
Newsworthiness: {newsworthiness}/100 ({Fresh/Moderate/Stale}, or "not news-triggered") — {one sentence}
Claim safety: {claim_safety_score}/100 — {one sentence, or "no claims requiring verification" if clean}

Flags: {comma-separated flags with the specific claim quoted, or "none"}
{if topic_confidence < 50: "Note: reads as off-topic for Meera's usual categories ({best-guess category}, {topic_confidence}% confidence)."}
---`;

async function scorePost(postText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const prompt = [
    RUBRIC,
    `Here is the post to score:\n"""${postText}"""`,
  ].join("\n\n");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("");

  if (!text) {
    throw new Error("Gemini returned no score");
  }

  return text.trim();
}

module.exports = { scorePost, isScoreTrigger, isPureScoreRequest };
