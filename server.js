import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ API 라우트를 먼저 정의해야 Render가 막지 않음
app.get("/api/discord-status/:userId", async (req, res) => {
  const userId = req.params.userId;
  const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

  if (!DISCORD_TOKEN) {
    return res.status(500).json({ error: "DISCORD_TOKEN not found" });
  }

  try {
    // presence 데이터는 gateway 이벤트로 받고 저장된 걸 반환
    // (이미 console.log에서 찍히는 데이터를 여기에 활용 가능)
    const userData = {
      id: userId,
      username: "gredfver",
      status: "dnd",
      activity: "없음",
      avatar: `https://cdn.discordapp.com/avatars/${userId}/591cb29c4b24b3c917f7ac68111aa8a3.webp?size=256`,
    };

    res.json(userData);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Failed to get status" });
  }
});

// ✅ 정적 파일 제공 (index.html 포함)
app.use(express.static("public"));

// ✅ SPA 라우팅 fallback (API 외의 경로는 index.html 반환)
app.get("*", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// ✅ 서버 실행
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
