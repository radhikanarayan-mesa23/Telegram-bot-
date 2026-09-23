const { draftPost } = require("../lib/gemini");
const { sendMessage } = require("../lib/telegram");

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

    try {
      const draft = await draftPost(note);
      await sendMessage(chatId, draft);
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
