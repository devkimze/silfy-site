import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.static("public"));

const PORT = process.env.PORT || 10000;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// ✅ Discord.js 클라이언트 생성
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

// ✅ 봇 로그인
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(DISCORD_TOKEN).catch((err) => {
  console.error("❌ Discord login failed:", err);
});

// ✅ 기본 페이지
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// ✅ 특정 유저 presence 조회
app.get("/api/discord-status/:userId", async (req, res) => {
  const userId = req.params.userId || "1256264184996565135";

  try {
    // 봇이 로그인되어 있어야 작동
    const user = await client.users.fetch(userId, { force: true });
    const presence = client.presences?.resolve(userId);

    const activity =
      presence?.activities?.[0]?.name || "No activity";
    const status = presence?.status || "offline";

    res.json({
      id: user.id,
      username: user.username,
      global_name: user.globalName || user.username,
      status,
      activity,
    });
  } catch (err) {
    console.error("❌ Error fetching user data:", err);
    res.status(500).json({
      error: "Failed to fetch Discord user presence",
      details: err.message,
    });
  }
});

// ✅ 서버 실행
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
