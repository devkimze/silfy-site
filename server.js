import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";
import fs from "fs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
  ],
});

let cachedUserData = {};
const DOWNLOAD_URL = "https://pcpg.netlify.app/pcp.exe";

client.once("ready", () => {
  console.log(`Discord Logged in as ${client.user.tag}`);
});


// 🔥 디코 슬래시 명령 처리
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // 📦 다운로드
  if (interaction.commandName === "download" || interaction.commandName === "dl") {
    await interaction.reply({
      content: "pcp file",
      files: ["./public/pcp.exe"],
      ephemeral: true,
    });
  }

  // 🔥 ini 업로드
  if (interaction.commandName === "upload") {
    const file = interaction.options.getAttachment("file");

    if (!file) {
      return interaction.reply({ content: "파일 없음", ephemeral: true });
    }

    // ini 검사
    if (!file.name.endsWith(".ini")) {
      return interaction.reply({ content: "ini 파일만 가능", ephemeral: true });
    }

    try {
      const res = await fetch(file.url);
      const buffer = await res.arrayBuffer();

      const filePath = `./uploads/${Date.now()}-${file.name}`;
      fs.writeFileSync(filePath, Buffer.from(buffer));

      await interaction.reply({
        content: "업로드 완료 ✅",
        ephemeral: true,
      });

    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: "업로드 실패 ❌",
        ephemeral: true,
      });
    }
  }
});


// 🔥 presence 캐싱
client.on("presenceUpdate", async (oldPresence, newPresence) => {
  if (!newPresence?.userId) return;

  const user = await newPresence.user.fetch();
  const status = newPresence.status || "offline";
  const activity = newPresence.activities?.[0] || null;

  let activityData = null;

  if (activity) {
    activityData = {
      type: activity.type,
      name: activity.name,
      details: activity.details,
      state: activity.state,
      assets: activity.assets || null,
    };

    if (activity.name === "Spotify") {
      const title = activity.details || "";
      const artistRaw = activity.state || "";
      let artistFormatted = artistRaw.split(",").map(a => a.trim()).join(", ");

      let albumArt = null;
      if (activity.assets?.largeImage) {
        const asset = activity.assets.largeImage;
        if (asset.startsWith("spotify:")) {
          const id = asset.replace("spotify:", "");
          albumArt = `https://i.scdn.co/image/${id}`;
        }
      }

      activityData.formatted = `${title} - ${artistFormatted}`;
      activityData.album_art_url = albumArt;
    }
  }

  cachedUserData[newPresence.userId] = {
    id: newPresence.userId,
    username: user.username,
    status,
    avatar_url: user.displayAvatarURL({ format: "webp", size: 256 }),
    banner_url: user.bannerURL({ size: 1024 }),
    activity: activityData,
  };

  console.log(`[PRESENCE] Updated for ${user.username}: ${status}`);
});


// 🔥 API
app.get("/api/discord-status/:userId", async (req, res) => {
  const userId = req.params.userId;

  if (cachedUserData[userId]) {
    return res.json(cachedUserData[userId]);
  }

  try {
    const user = await client.users.fetch(userId);

    return res.json({
      id: user.id,
      username: user.username,
      status: "offline",
      avatar_url: user.displayAvatarURL({ format: "webp", size: 256 }),
      banner_url: user.bannerURL({ size: 1024 }),
      activity: null,
    });
  } catch (err) {
    console.error("API fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch user presence" });
  }
});

app.get("/dl", (req, res) => {
  res.redirect(DOWNLOAD_URL);
});

app.get("/download", (req, res) => {
  res.redirect(DOWNLOAD_URL);
});

app.get("/ping", (req, res) => res.send("pong"));

app.use(express.static("public"));

app.get("*", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});


// 🔥 서버 실행
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);
