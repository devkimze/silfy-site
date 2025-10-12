// === server.js ===
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "public"))); // public 폴더 내 HTML, CSS, JS 서빙

// === Discord Presence 캐시 ===
let presenceCache = new Map();

// === Presence 가져오기 함수 ===
async function getDiscordPresence(userId) {
  // 캐시에 있으면 바로 반환 (1분 캐시)
  const cached = presenceCache.get(userId);
  if (cached && Date.now() - cached.timestamp < 60000) {
    return cached.data;
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/users/${userId}`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` },
    });
    const data = await response.json();

    if (!data.id) {
      return { status: "unknown", activity: "데이터 없음" };
    }

    const presenceData = {
      status: "dnd",
      activity: data.username || "활동 없음",
    };

    // 캐시에 저장
    presenceCache.set(userId, { data: presenceData, timestamp: Date.now() });

    return presenceData;
  } catch (err) {
    console.error("Presence fetch error:", err);
    return { status: "offline", activity: "불러오기 실패" };
  }
}

// === API 라우트 ===
app.get("/api/discord-status/:id", async (req, res) => {
  const userId = req.params.id;
  const presence = await getDiscordPresence(userId);
  res.json(presence);
});

// === 기본 페이지 (index.html) ===
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// === 서버 실행 ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
