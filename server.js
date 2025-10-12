import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const PORT = process.env.PORT || 10000;
const TARGET_USER_ID = "1256264184996565135";

// ✅ 경로 유틸 (Render 환경에서 절대경로 문제 방지)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === 정적 파일 서빙 (index.html, css, js, img 등) ===
app.use(express.static(path.join(__dirname, "public"))); 
// public 폴더 안에 index.html을 두면 자동으로 불러옴

// === Discord 클라이언트 ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

let userPresence = {
  id: TARGET_USER_ID,
  username: "Unknown",
  global_name: "Unknown",
  status: "offline",
  activity: null,
};

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  for (const [, guild] of client.guilds.cache) {
    try {
      const member = await guild.members.fetch(TARGET_USER_ID).catch(() => null);
      if (member && member.presence) updatePresence(member.presence);
    } catch (err) {
      console.error("초기 Presence 불러오기 실패:", err);
    }
  }
});

client.on("presenceUpdate", (oldPresence, newPresence) => {
  if (!newPresence || newPresence.userId !== TARGET_USER_ID) return;
  updatePresence(newPresence);
});

function updatePresence(presence) {
  const activity = presence.activities?.[0];
  let activityText = null;

  if (activity) {
    if (activity.type === 0) activityText = `🎮 ${activity.name}`;
    else if (activity.type === 2) activityText = `🎧 ${activity.name}`;
    else if (activity.type === 1) activityText = `📺 Streaming`;
    else activityText = activity.name;
  }

  userPresence = {
    id: presence.userId,
    username: presence.user?.username || "Unknown",
    global_name: presence.user?.globalName || "Unknown",
    status: presence.status || "offline",
    activity: activityText,
  };

  console.log("🔄 Presence 업데이트:", userPresence);
}

// === API ===
app.get("/api/discord-status", (req, res) => {
  res.json(userPresence);
});

// ✅ index.html을 루트 경로에서 직접 응답
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

client.login(DISCORD_TOKEN);
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
