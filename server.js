import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// === Discord.js 클라이언트 생성 ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
  ],
});

// === 실시간 presence 저장용 메모리 ===
let cachedUserData = {};

// === 봇 로그인 ===
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// === presence 업데이트 감지 ===
client.on("presenceUpdate", async (oldPresence, newPresence) => {
  if (!newPresence || !newPresence.userId) return;
  const user = await newPresence.user.fetch();

  const status = newPresence.status || "offline";
  const activity = newPresence.activities?.[0] || null;

  cachedUserData[newPresence.userId] = {
    id: newPresence.userId,
    username: user.username,
    status,
    avatar_url: user.displayAvatarURL({ format: "webp", size: 256 }),
    banner_url: user.bannerURL({ size: 1024 }),
    activity: activity
      ? {
          type: activity.type,
          name: activity.name,
          details: activity.details,
          state: activity.state,
        }
      : null,
  };

  console.log(`[PRESENCE] Updated for ${user.username}: ${status}`);
});

// === API 엔드포인트 ===
app.get("/api/discord-status/:userId", async (req, res) => {
  const userId = req.params.userId;

  if (cachedUserData[userId]) {
    return res.json(cachedUserData[userId]);
  }

  try {
    const user = await client.users.fetch(userId);
    return res.json({
      id: user.id,
      username: user.username,
      status: "offline",
      avatar_url: user.displayAvatarURL({ format: "webp", size: 256 }),
      banner_url: user.bannerURL({ size: 1024 }),
      activity: null,
    });
  } catch (err) {
    console.error("API fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch user presence" });
  }
});

// === 정적 파일 ===
app.use(express.static("public"));

// === SPA fallback ===
app.get("*", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// === 서버 실행 ===
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

// === Discord 로그인 ===
client.login(process.env.DISCORD_TOKEN);
