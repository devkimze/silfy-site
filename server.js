import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";

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

import multer from "multer";
import path from "path";

// 저장 위치 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + file.originalname;
    cb(null, unique);
  }
});

// 파일 필터 (.ini만 허용)
const fileFilter = (req, file, cb) => {
  if (path.extname(file.originalname) === ".ini") {
    cb(null, true);
  } else {
    cb(new Error("ini 파일만 업로드 가능"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1024 * 50 } // 50KB 제한 (ini니까 작게)
});

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

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "download" || interaction.commandName === "dl") {
    await interaction.reply({
      content: "pcp file",
      files: ["./public/pcp.exe"],
      ephemeral: true,
    });
  }
});

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

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);
