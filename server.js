import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import { Client, GatewayIntentBits } from "discord.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// ✅ 메인 페이지 라우터 추가
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head><title>Silfy Site</title></head>
      <body style="font-family:sans-serif;text-align:center;margin-top:100px;">
        <h1>🚀 Silfy Server is Running!</h1>
        <p>Discord Presence Bot is connected.</p>
      </body>
    </html>
  `);
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
