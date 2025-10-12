import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";

dotenv.config();

const app = express();
app.use(cors());

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const PORT = process.env.PORT || 10000;
const TARGET_USER_ID = "1256264184996565135"; // ✅ 감시할 유저 ID

// === Discord 클라이언트 설정 ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
  ],
});

let userPresence = {
  id: TARGET_USER_ID,
  username: "Unknown",
  global_name: "Unknown",
  status: "offline",
  activity: null,
};

// === 봇 로그인 ===
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // 혹시 이미 캐시된 멤버 정보 있으면 초기화
  try {
    for (const [guildId, guild] of client.guilds.cache) {
      const member = await guild.members.fetch(TARGET_USER_ID).catch(() => null);
      if (member && member.presence) {
        updatePresence(member.presence);
      }
    }
  } catch (err) {
    console.error("초기 Presence 불러오기 실패:", err);
  }
});

// === Presence 변경 감시 ===
client.on("presenceUpdate", (oldPresence, newPresence) => {
  if (!newPresence || newPresence.userId !== TARGET_USER_ID) return;
  updatePresence(newPresence);
});

// === Presence 업데이트 함수 ===
function updatePresence(presence) {
  userPresence = {
    id: presence.userId,
    username: presence.user?.username || "Unknown",
    global_name: presence.user?.globalName || "Unknown",
    status: presence.status || "offline",
    activity: presence.activities?.[0]?.name || null,
  };
  console.log("🟢 Presence 업데이트됨:", userPresence);
}

// === API 엔드포인트 ===
app.get("/api/discord-status", (req, res) => {
  res.json(userPresence);
});

// === 서버 실행 ===
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// === 봇 로그인 ===
client.login(DISCORD_TOKEN);
