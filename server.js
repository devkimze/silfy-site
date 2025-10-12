import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Client, GatewayIntentBits } from "discord.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// 🔧 경로 설정 (Render 환경에서도 경로 오류 방지)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// ✅ public 폴더 (혹은 index.html이 있는 폴더) 서빙
app.use(express.static(path.join(__dirname, "public")));

// ✅ 기본 라우트 → index.html 전달
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Discord 봇 초기화
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences],
});

client.once("ready", () => {
  console.log(`✅ Discord 봇 로그인 성공: ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

// ✅ 서버 실행
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: 포트 ${PORT}`);
});
