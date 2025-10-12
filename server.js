// ✅ server.js (Render 완전호환 버전)
import express from "express";
import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";

dotenv.config(); // .env 파일이 있을 경우 로드, Render에서는 환경변수 그대로 사용됨

const app = express();
const port = process.env.PORT || 10000;

// ✅ 환경변수 로드 확인
if (!process.env.DISCORD_TOKEN) {
  console.error("❌ DISCORD_TOKEN이 설정되지 않았습니다. Render Environment 탭 확인하세요.");
} else {
  console.log("✅ DISCORD_TOKEN 로드 완료");
}

// ✅ Discord 클라이언트 생성
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
  ],
});

// ✅ 봇 로그인 완료 시
client.once("ready", () => {
  console.log(`🤖 Discord 봇 로그인 성공: ${client.user.tag}`);
});

// ✅ 로그인 시도
client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error("❌ Discord 로그인 실패:", err.message);
});

// ✅ API 라우트: 특정 유저 상태 조회
app.get("/api/discord-status/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await client.users.fetch(userId, { force: true }).catch(() => null);

    if (!user || !user.presence) {
      return res.json({ status: "unknown", activity: "데이터 없음" });
    }

    const status = user.presence?.status || "unknown";
    const activity = user.presence?.activities?.[0]?.name || "없음";

    res.json({ status, activity });
  } catch (error) {
    console.error("❌ 상태 조회 오류:", error);
    res.json({ status: "unknown", activity: "오류" });
  }
});

// ✅ 서버 시작
app.listen(port, () => {
  console.log(`🚀 서버 실행 중: 포트 ${port}`);
});
