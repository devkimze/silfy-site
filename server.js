import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// === Discord 클라이언트 ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
  ],
});

let cachedUserData = {};
let cachedTikTok = null;
let cachedYouTube = null;

client.once("ready", () => console.log(`🤖 Discord Logged in as ${client.user.tag}`));

client.on("presenceUpdate", async (_, newPresence) => {
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

    if (activity.name === "Spotify") {
      const title = activity.details || "";
      const artist = activity.state || "";
      activityData.formatted = `${title} – ${artist}`;
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
});

app.get("/api/discord-status/:userId", async (req, res) => {
  const id = req.params.userId;
  if (cachedUserData[id]) return res.json(cachedUserData[id]);
  try {
    const user = await client.users.fetch(id);
    res.json({
      id: user.id,
      username: user.username,
      status: "offline",
      avatar_url: user.displayAvatarURL({ format: "webp", size: 256 }),
      banner_url: user.bannerURL({ size: 1024 }),
      activity: null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch presence" });
  }
});

// === TikTok ===
async function fetchTikTokData() {
  try {
    const res = await fetch("https://www.tiktok.com/@silfyxd?__a=1&__d=dis");
    const text = await res.text();
    const jsonMatch = text.match(/{\"props\":.*\"appContext\":.*}}<\/script>/);
    if (!jsonMatch) throw new Error("TikTok API response changed");
    const data = JSON.parse(jsonMatch[0].replace(/<\/script>$/, ""));
    const user = data?.props?.pageProps?.userInfo?.user;
    const stats = data?.props?.pageProps?.userInfo?.stats;
    cachedTikTok = {
      username: user?.uniqueId || "silfyxd",
      nickname: user?.nickname || "Unknown",
      avatar: user?.avatarThumb || "",
      followers: stats?.followerCount || 0,
      likes: stats?.heartCount || 0,
    };
    console.log(`✅ TikTok data updated for @${cachedTikTok.username}`);
  } catch (err) {
    console.error("⚠️ TikTok fetch failed:", err);
  }
}

// === YouTube ===
async function fetchYouTubeData() {
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&forHandle=@지후7&key=${process.env.YOUTUBE_API_KEY}`);
    const json = await res.json();
    const ch = json.items?.[0];
    if (!ch) throw new Error("Channel not found");
    cachedYouTube = {
      handle: ch.snippet.customUrl || "@지후7",
      title: ch.snippet.title,
      thumbnail: ch.snippet.thumbnails?.default?.url || "",
      subscribers: ch.statistics.subscriberCount,
      views: ch.statistics.viewCount,
    };
    console.log(`✅ YouTube data updated for ${cachedYouTube.handle}`);
  } catch (err) {
    console.error("⚠️ YouTube fetch failed:", err);
  }
}

app.get("/api/tiktok", (_, res) => cachedTikTok ? res.json(cachedTikTok) : res.status(404).json({ error: "not ready" }));
app.get("/api/youtube", (_, res) => cachedYouTube ? res.json(cachedYouTube) : res.status(404).json({ error: "not ready" }));

setInterval(fetchTikTokData, 1000 * 60 * 5);
setInterval(fetchYouTubeData, 1000 * 60 * 5);
fetchTikTokData();
fetchYouTube
