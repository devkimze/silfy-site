import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const PORT = process.env.PORT || 10000;

// ✅ 단일 사용자 Presence 조회
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
      status: "online", // Discord API v10에서는 Presence 정보는 Gateway 전용이므로 단순 표시
      activity: data.activities?.[0]?.name || "데이터 없음",
    });
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Failed to fetch Discord user data" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
