# Meera Notes Bot

Telegram bot: Meera sends a note as a text message, the bot asks Gemini to
turn it into a draft post in her voice, and sends the draft back in the same
chat.

## Setup

1. Install dependencies (there are none beyond Node itself, but this creates
   `node_modules`/lockfile if you add any later):
   ```bash
   npm install
   ```
2. Fill in `.env` with your real values:
   - `TELEGRAM_BOT_TOKEN` — from [@BotFather](https://t.me/BotFather)
   - `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/)
3. Replace the contents of `voice-instructions.md` with real notes on how
   Meera writes.
4. Deploy to Vercel and add `TELEGRAM_BOT_TOKEN` and `GEMINI_API_KEY` as
   environment variables in the Vercel project settings (do not commit
   `.env`).
5. Point Telegram at your deployed webhook:
   ```bash
   TELEGRAM_BOT_TOKEN=xxxx node scripts/set-webhook.js https://your-app.vercel.app/api/webhook
   ```

That's it — message the bot (or post in a channel it admins) and it will
reply with a draft.
