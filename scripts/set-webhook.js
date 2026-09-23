// One-time setup script: tells Telegram where to send updates.
// Usage:
//   TELEGRAM_BOT_TOKEN=xxxx node scripts/set-webhook.js https://your-app.vercel.app/api/webhook

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const url = process.argv[2];

  if (!token) {
    console.error("Set TELEGRAM_BOT_TOKEN in your environment first.");
    process.exit(1);
  }
  if (!url) {
    console.error(
      "Usage: TELEGRAM_BOT_TOKEN=xxxx node scripts/set-webhook.js https://your-app.vercel.app/api/webhook"
    );
    process.exit(1);
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  const data = await response.json();
  console.log(data);
}

main();
