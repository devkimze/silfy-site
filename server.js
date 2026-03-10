// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// === Discord.js 클라이언트 ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
  ],
});

// === Presence 캐시 ===
let cachedUserData = {};

// === Discord Presence ===
client.once("ready", () => {
  console.log(`🤖 Discord Logged in as ${client.user.tag}`);
});

client.on("presenceUpdate", async (oldPresence, newPresence) => {
  if (!newPresence?.userId) return;
  const user = await newPresence.user.fetch();
  const status = newPresence.status || "offline";
  const activity = newPresence.activities?.[0] || null;

  let activityData = null;
  if (activity) {
    activityData = {
      type: activity.type,
      name: activity.name,
      details: activity.details,
      state: activity.state,
      assets: activity.assets || null,
    };

    // === Spotify 처리 ===
    if (activity.name === "Spotify") {
      const title = activity.details || "";
      const artistRaw = activity.state || "";
      let artistFormatted = artistRaw.split(";").map(a => a.trim()).join(", ");

      let albumArt = null;
      if (activity.assets?.largeImage) {
        const asset = activity.assets.largeImage;
        if (asset.startsWith("spotify:")) {
          const id = asset.replace("spotify:", "");
          albumArt = `https://i.scdn.co/image/${id}`;
        }
      }

      activityData.formatted = `${title} - ${artistFormatted}`;
      activityData.album_art_url = albumArt;
    }
  }

  cachedUserData[newPresence.userId] = {
    id: newPresence.userId,
    username: user.username,
    status,
    avatar_url: user.displayAvatarURL({ format: "webp", size: 256 }),
    banner_url: user.bannerURL({ size: 1024 }),
    activity: activityData,
  };

  console.log(`[PRESENCE] Updated for ${user.username}: ${status}`);
});

// === Discord Presence API ===
app.get("/api/discord-status/:userId", async (req, res) => {
  const userId = req.params.userId;
  if (cachedUserData[userId]) return res.json(cachedUserData[userId]);

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

// === 상태 확인용 핑 ===
app.get("/ping", (req, res) => res.send("pong"));

// === 정적 파일 제공 ===
app.use(express.static("public"));
app.get("*", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// === 서버 실행 ===
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// === Discord 로그인 ===
client.login(process.env.DISCORD_TOKEN);
