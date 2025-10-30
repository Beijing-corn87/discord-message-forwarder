import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const channelId = process.env.CHANNEL_ID;
const webhookUrl = process.env.WEBHOOK_URL;
const MAX_RETRIES = 5;        // Max attempts per message
const RETRY_DELAY = 2000;     // 2 seconds between retries

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

async function sendToWebhook(payload, attempt = 1) {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`⚠️ Webhook responded with status ${response.status}`);
      if (attempt < MAX_RETRIES) {
        console.log(`⏱ Retrying in ${RETRY_DELAY / 1000}s (Attempt ${attempt + 1})`);
        setTimeout(() => sendToWebhook(payload, attempt + 1), RETRY_DELAY);
      } else {
        console.error(`❌ Failed after ${MAX_RETRIES} attempts`);
      }
      return;
    }

    console.log(`✅ Webhook POST succeeded with status ${response.status}`);
    const text = await response.text();
    console.log("Webhook response body:", text);

  } catch (err) {
    console.error(`❌ Error sending to webhook: ${err}`);
    if (attempt < MAX_RETRIES) {
      console.log(`⏱ Retrying in ${RETRY_DELAY / 1000}s (Attempt ${attempt + 1})`);
      setTimeout(() => sendToWebhook(payload, attempt + 1), RETRY_DELAY);
    }
  }
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.channel.id === channelId) {
    console.log(`💬 Received message: ${message.content}`);
    
    await sendToWebhook({
      content: message.content,
      author: {
        username: message.author.username,
        id: message.author.id, // ✅ User ID for mentions
        discriminator: message.author.discriminator // Optional
      }
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
