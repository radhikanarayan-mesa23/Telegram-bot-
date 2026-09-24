const { draftPost } = require("../lib/gemini");
const { sendMessage } = require("../lib/telegram");
const {
  scorePost,
  isScoreTrigger,
  isReplyScoreTrigger,
  isPureScoreRequest,
} = require("../lib/scoring");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(200).send("OK");
    return;
  }

  try {
    const update = req.body || {};
    // Telegram sends normal DMs/group messages as "message", but posts in a
    // channel the bot admins come through as "channel_post" instead.
    const message = update.message || update.channel_post;

    if (!message || !message.text) {
      res.status(200).send("OK");
      return;
    }

    const chatId = message.chat.id;
    const note = message.text;
    const repliedText = message.reply_to_message && message.reply_to_message.text;

    try {
      let reply;

      if (repliedText && isReplyScoreTrigger(note)) {
        // Scoring an existing post: Meera replied to the draft she means.
        const scoreBlock = await scorePost(repliedText);
        reply = `${repliedText}\n\n${scoreBlock}`;
      } else if (!repliedText && isPureScoreRequest(note)) {
        // "score this" with nothing to attach it to.
        reply =
          'Reply directly to the post you want scored, then send "score this" again.';
      } else {
        const { draft, sources } = await draftPost(note);
        const parts = [draft];
        if (sources.length) {
          parts.push(
            `—\nChecked against:\n${sources
              .map((s) => `${s.title || "source"}: ${s.uri}`)
              .join("\n")}`
          );
        }
        if (isScoreTrigger(note)) {
          parts.push(await scorePost(draft));
        }
        reply = parts.join("\n\n");
      }

      await sendMessage(chatId, reply);
    } catch (err) {
      console.error("Failed to generate/send draft:", err);
      try {
        await sendMessage(
          chatId,
          "Sorry, I couldn't turn that into a draft just now. Please try again in a bit."
        );
      } catch (sendErr) {
        console.error("Failed to send error message to Telegram:", sendErr);
      }
    }

    res.status(200).send("OK");
  } catch (err) {
    // Whatever happens, Telegram must get a fast 200 or it will keep retrying.
    console.error("Webhook handler error:", err);
    res.status(200).send("OK");
  }
};
