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

      // 여러 아티스트를 콤마로 분리
      let artistFormatted = artistRaw.split(";").map(a => a.trim()).join(", ");

      // 앨범 커버 처리
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

// === 주기적 갱신 ===
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

<script>
async function fetchDiscordPresence() {
  try {
    const res = await fetch(`/api/discord-status/1256264184996565135?_=${Date.now()}`);
    const data = await res.json();

    // === 요소 선택 ===
    const avatarImg = document.querySelector("#discordAvatar");
    const name = document.querySelector("#discordName");
    const dot = document.querySelector("#discordDot");
    const titleEl = document.querySelector("#songTitle");
    const artistEl = document.querySelector("#songArtists");
    const albumArt = document.querySelector("#albumArt");
    const card = document.querySelector("#discordCard");

    // === 아바타 & 상태 ===
    if (data.avatar_url) avatarImg.src = `${data.avatar_url}?v=${Date.now()}`;
    dot.className = "status-dot";
    dot.classList.add(`status-${data.status || "offline"}`);
    name.textContent = data.username || "Unknown";

    // === 활동 (Spotify만 2줄 표시) ===
    if (data.activity?.name === "Spotify") {
      const title = data.activity.details || "제목 없음";
      const artists = (data.activity.state || "")
        .split(";")
        .map(a => a.trim())
        .join(", ") || "가수 미상";

      titleEl.textContent = title;
      artistEl.textContent = artists;

      if (data.activity.album_art_url) {
        albumArt.src = data.activity.album_art_url;
        albumArt.classList.remove("hidden");
      } else {
        albumArt.classList.add("hidden");
      }
    } else if (data.activity) {
      // 기타 활동
      titleEl.textContent = data.activity.formatted || data.activity.name || "활동 없음";
      artistEl.textContent = "";
      albumArt.classList.add("hidden");
    } else {
      // 완전 비활동 상태
      titleEl.textContent = "현재 활동 없음";
      artistEl.textContent = "";
      albumArt.classList.add("hidden");
    }

    // === 배경 ===
    card.style.backgroundImage = data.banner_url
      ? `url(${data.banner_url})`
      : "linear-gradient(135deg,#1e1f22,#2b2d31)";
  } catch (err) {
    console.error("Discord Presence Fetch Error:", err);
    document.querySelector("#songTitle").textContent = "불러오기 실패";
    document.querySelector("#songArtists").textContent = "";
  }
}

// 초기 호출 + 15초마다 갱신
fetchDiscordPresence();
setInterval(fetchDiscordPresence, 15000);
</script>



