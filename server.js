import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Client, GatewayIntentBits } from "discord.js";

dotenv.config();

// --- 경로 설정 ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Express 초기화 ---
const app = express();
app.use(cors());
app.use(express.json());

// --- 정적 파일 (index.html 서빙) ---
app.use(express.static(__dirname));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// --- Discord 클라이언트 설정 ---
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

client.once("ready", () => {
  console.log(`🤖 Discord Logged in as ${client.user.tag}`);
});

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

    // 🎵 Spotify 전용 포맷 (제목 - 가수, 피처링 등)
    if (activity.name === "Spotify") {
      const title = activity.details || "";
      const artist = activity.state || "";
      const formattedArtist = artist.replace(/;/g, ", ");
      activityData.formatted = `${title} - ${formattedArtist}`;
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

// --- TikTok 데이터 ---
async function fetchTikTokData() {
  try {
    const res = await fetch("https://www.tiktok.com/@silfyxd");
    const text = await res.text();
    const match = text.match(/<script id="SIGI_STATE" type="application\/json">(.*?)<\/script>/);
    if (!match) throw new Error("TikTok structure changed");

    const json = JSON.parse(match[1]);
    const user = json?.UserModule?.users?.silfyxd;
    const stats = json?.StatsModule?.stats?.[user?.id_str];
    if (!user || !stats) throw new Error("TikTok data missing");

    cachedTikTok = {
      username: user.uniqueId,
      nickname: user.nickname,
      avatar_url: user.avatarThumb,
      followers: stats.followerCount,
      likes: stats.heartCount,
    };
    console.log(`✅ TikTok data updated for @${cachedTikTok.username}`);
  } catch (err) {
    console.error("⚠️ TikTok fetch failed:", err.message);
  }
}

// --- YouTube 데이터 ---
async function fetchYouTubeData() {
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&forHandle=@지후7&key=${process.env.YOUTUBE_API_KEY}`
    );
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

app.get("/api/tiktok", (_, res) =>
  cachedTikTok ? res.json(cachedTikTok) : res.status(404).json({ error: "not ready" })
);
app.get("/api/youtube", (_, res) =>
  cachedYouTube ? res.json(cachedYouTube) : res.status(404).json({ error: "not ready" })
);

setInterval(fetchTikTokData, 1000 * 60 * 5);
setInterval(fetchYouTubeData, 1000 * 60 * 5);
fetchTikTokData();
fetchYouTubeData();

// --- 서버 실행 ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// --- Discord 로그인 ---
client.login(process.env.DISCORD_TOKEN);
