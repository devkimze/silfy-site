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

// === Presence / Social 캐시 ===
let cachedUserData = {};
let cachedTikTok = null;
let cachedYouTube = null;

// === Discord Presence ===
client.once("ready", () => {
  console.log(`🤖 Discord Logged in as ${client.user.tag}`);
});

client.on("presenceUpdate", async (oldPresence, newPresence) => {
  if (!newPresence?.userId) return;
  const user = await newPresence.user.fetch();
  const status = newPresence.status || "offline";

  // 활동 감지 (Spotify 포함)
  const activities = newPresence.activities || [];
  const spotify = activities.find(a => a.name === "Spotify");
  const mainActivity = spotify || activities[0] || null;

  let activityData = null;

  if (mainActivity) {
    activityData = {
      type: mainActivity.type,
      name: mainActivity.name,
      details: mainActivity.details,
      state: mainActivity.state,
      assets: mainActivity.assets || null,
    };

    const miniArt = document.getElementById("spotifyMiniArt");

// Spotify 감지
if (data.activity?.name === "Spotify" && data.activity.details) {
  // 작은 앨범 커버 표시
  if (data.activity.album_art_url) {
    miniArt.src = data.activity.album_art_url;
    miniArt.classList.remove("hidden");
  } else {
    miniArt.classList.add("hidden");
  }

  // 노래 제목 및 가수 표시
  const artistRaw = data.activity.state || "";
  const artists = artistRaw.split(";").map(a => a.trim()).join(", ");
  activity.textContent = `${data.activity.details} - ${artists}`;
} else {
  miniArt.classList.add("hidden");
}


      // 앨범 아트 URL 처리
      let albumArt = null;
      if (spotify.assets?.largeImage) {
        const asset = spotify.assets.largeImage;
        if (asset.startsWith("spotify:")) {
          const id = asset.replace("spotify:", "");
          albumArt = `https://i.scdn.co/image/${id}`;
        }
      }

      activityData.formatted = `${title} - ${artistFormatted}`;
      activityData.album_art_url = albumArt;
    } else {
      // Spotify가 아닐 때는 단순 활동 이름 표시
      activityData.formatted = mainActivity.name || "";
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
  const cached = cachedUserData[userId];
  if (cached) return res.json(cached);

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

// === TikTok 데이터 ===
async function fetchTikTokData() {
  try {
    const res = await fetch(`https://www.tiktok.com/@silfyxd?__a=1&__d=dis`);
    const text = await res.text();

    const jsonMatch = text.match(/{\"props\":.*\"appContext\":.*}}<\/script>/);
    if (!jsonMatch) throw new Error("TikTok API response changed");

    const jsonStr = jsonMatch[0].replace(/<\/script>$/, "");
    const data = JSON.parse(jsonStr);
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

// === YouTube 데이터 ===
async function fetchYouTubeData() {
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&forHandle=@지후7&key=${process.env.YOUTUBE_API_KEY}`
    );
    const json = await res.json();
    const channel = json.items?.[0];
    if (!channel) throw new Error("Channel not found");

    cachedYouTube = {
      handle: channel.snippet.customUrl || "@지후7",
      title: channel.snippet.title,
      thumbnail: channel.snippet.thumbnails?.default?.url || "",
      subscribers: channel.statistics.subscriberCount,
      views: channel.statistics.viewCount,
    };
    console.log(`✅ YouTube data updated for ${cachedYouTube.handle}`);
  } catch (err) {
    console.error("⚠️ YouTube fetch failed:", err);
  }
}

// === API 엔드포인트 ===
app.get("/api/tiktok", (req, res) => {
  if (cachedTikTok) return res.json(cachedTikTok);
  res.status(404).json({ error: "TikTok data not ready" });
});

app.get("/api/youtube", (req, res) => {
  if (cachedYouTube) return res.json(cachedYouTube);
  res.status(404).json({ error: "YouTube data not ready" });
});

// === 주기적 갱신 (5분마다) ===
setInterval(fetchTikTokData, 1000 * 60 * 5);
setInterval(fetchYouTubeData, 1000 * 60 * 5);
fetchTikTokData();
fetchYouTubeData();

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
