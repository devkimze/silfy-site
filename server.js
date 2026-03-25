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

// === Discord Ready ===
client.once("ready", () => {
  console.log(`🤖 Discord Logged in as ${client.user.tag}`);
});

// === Presence Update ===
client.on("presenceUpdate", async (oldPresence, newPresence) => {
  if (!newPresence?.userId) return;

  const user = await newPresence.user.fetch();
  const status = newPresence.status || "offline";

  // 🔥 Spotify 우선 탐지 (중요)
  const activity =
    newPresence.activities.find(a => a.name === "Spotify") ||
    newPresence.activities[0] ||
    null;

  let activityData = null;

  if (activity) {
    activityData = {
      type: activity.type,
      name: activity.name,
    };

    // === 🎵 Spotify ===
    if (activity.name === "Spotify") {
      const title = activity.details || "";
      const artistRaw = activity.state || "";
      const artist = artistRaw.split(",").map(a => a.trim()).join(", ");

      let albumArt = null;
      if (activity.assets?.largeImage) {
        const asset = activity.assets.largeImage;
        if (asset.startsWith("spotify:")) {
          const id = asset.replace("spotify:", "");
          albumArt = `https://i.scdn.co/image/${id}`;
        }
      }

      activityData = {
        typeFormatted: "listening",
        title,
        artist,
        album_art_url: albumArt,
      };
    }

    // === 🎮 Game / Other ===
    else {
      activityData = {
        typeFormatted: "playing",
        name: activity.name,
      };
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

  console.log(`[PRESENCE] ${user.username} → ${status}`);
});

// === API ===
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

// === Ping ===
app.get("/ping", (req, res) => res.send("pong"));

// === Static ===
app.use(express.static("public"));
app.get("*", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// === Server Start ===
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🌐 Server running on ${PORT}`));

// === Login ===
client.login(process.env.DISCORD_TOKEN);
