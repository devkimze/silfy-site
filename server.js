import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// ✅ public 폴더(HTML, CSS, JS 등) 정적 서빙
app.use(express.static(path.join(__dirname, "public")));

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const PORT = process.env.PORT || 10000;

// ✅ 단일 사용자 Presence 조회 API
app.get("/api/discord-status/:userId", async (req, res) => {
  const userId = req.params.userId;

  if (!DISCORD_TOKEN) {
    return res.status(500).json({ error: "DISCORD_TOKEN not found in environment" });
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/users/${userId}/profile`, {
      headers: { Authorization: `Bot ${DISCORD_TOKEN}` },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Discord API Error:", text);
      return res.status(response.status).json({ error: "Discord API failed", details: text });
    }

    const data = await response.json();

    res.json({
      id: data.user.id,
      username: data.user.username,
      global_name: data.user.global_name,
      status: "online", // Presence는 Gateway 전용이라 고정값
      activity: data.activities?.[0]?.name || "데이터 없음",
    });
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Failed to fetch Discord user data" });
  }
});

// ✅ 루트("/") 요청 시 index.html 반환
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
