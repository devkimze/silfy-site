import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ HTML, CSS, JS 등 정적 파일 서빙
app.use(express.static(path.join(__dirname, "public")));

// ✅ 루트 URL은 index.html 반환
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Discord 상태 API (Lanyard 이용)
app.get("/api/discord-status/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const response = await fetch(`https://api.lanyard.rest/v1/users/${userId}`);
    const data = await response.json();

    if (!data.success) {
      return res.status(500).json({ status: "offline" });
    }

    const discord = data.data;

    // 상태
    const status = discord.discord_status || "offline";

    // 활동 (게임 / Spotify / Custom 등)
    let activity = null;
    if (discord.activities && discord.activities.length > 0) {
      const act = discord.activities.find(a => a.type === 0); // Playing
      if (act) activity = act.name;
    }

    res.json({
      status,
      activity: activity || null
    });
  } catch (err) {
    console.error("❌ Discord API Error:", err);
    res.status(500).json({ status: "offline" });
  }
});

// ✅ 서버 실행
app.listen(PORT, () => {
  console.log(`🚀 Silfy site running on port ${PORT}`);
});
