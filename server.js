import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.static("public")); // index.html 제공

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const PORT = process.env.PORT || 10000;
const TARGET_USER_ID = "1256264184996565135"; // 감시할 유저 ID

// Discord 봇 클라이언트 설정
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
  status: "offline",
  activity: "없음",
  avatar: "",
};

// 봇 로그인 및 Presence 업데이트 감지
client.on("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const guilds = await client.guilds.fetch();
  for (const [guildId] of guilds) {
    const guild = await client.guilds.fetch(guildId);
    const member = await guild.members.fetch(TARGET_USER_ID).catch(() => null);
    if (member) {
      updatePresence(member);
    }
  }
});

// Presence 업데이트 실시간 감지
client.on("presenceUpdate", (oldPresence, newPresence) => {
  if (newPresence?.userId === TARGET_USER_ID) {
    updatePresence(newPresence.member);
  }
});

function updatePresence(member) {
  if (!member) return;
  const presence = member.presence;

  userPresence.username = member.user.globalName || member.user.username;
  userPresence.avatar = member.user.displayAvatarURL({ size: 256 });
  userPresence.status = presence?.status || "offline";

  const activity = presence?.activities?.find((a) => a.type === 2 || a.type === 0); // 음악 or 일반 활동
  if (activity) {
    if (activity.type === 2 && activity.name === "Spotify") {
      userPresence.activity = `${activity.state} - ${activity.details}`; // 가수 - 곡명
    } else {
      userPresence.activity = activity.name;
    }
  } else {
    userPresence.activity = "없음";
  }

  console.log("🔄 Presence updated:", userPresence);
}

// ✅ API 엔드포인트
app.get("/api/discord-status", (req, res) => {
  res.json(userPresence);
});

// ✅ 루트 index.html 제공
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// ✅ 서버 시작
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

// ✅ 봇 로그인
client.login(DISCORD_TOKEN);
