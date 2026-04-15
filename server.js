import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";
import multer from "multer";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

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

// =========================
// 🔥 multer 설정 (유저별 폴더)
// =========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const username = req.params.name;

    if (!username) {
      return cb(new Error("이름 없음"), null);
    }

    const dir = `uploads/${username}`;

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },

  filename: (req, file, cb) => {
    cb(null, file.originalname); // 항상 같은 이름
  },
});

const fileFilter = (req, file, cb) => {
  if (path.extname(file.originalname) === ".ini") {
    cb(null, true);
  } else {
    cb(new Error("ini만 가능"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1024 * 50 },
});

// =========================
// Discord
// =========================
client.once("ready", () => {
  console.log(`Discord Logged in as ${client.user.tag}`);
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

// =========================
// 🔥 업로드 API
// =========================
app.post("/upload/:name", upload.single("file"), (req, res) => {
  try {
    res.json({
      success: true,
      name: req.params.name,
      file: req.file.originalname,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "업로드 실패" });
  }
});

// =========================
// 🔥 다운로드 API (핵심)
// =========================
app.get("/files/format/download/:name", (req, res) => {
  const username = req.params.name;

  const filePath = `uploads/${username}/RiotUserSettings.ini`;

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("파일 없음");
  }

  // 🔥 다운로드 이름 강제 설정
  res.download(filePath, "RiotUserSettings.ini");
});

// =========================
// 기타 API
// =========================
app.get("/ping", (req, res) => res.send("pong"));

app.use(express.static("public"));

app.get("*", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// =========================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);
