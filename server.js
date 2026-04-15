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

// =========================
// Discord
// =========================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});

client.once("ready", () => {
  console.log(`Discord Logged in as ${client.user.tag}`);
});

// =========================
// 🔥 업로드 처리 함수
// =========================
async function saveIniFromDiscord(url, configName) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();

  const dir = `./uploads/${configName}`;

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filePath = `${dir}/RiotUserSettings.ini`;

  fs.writeFileSync(filePath, Buffer.from(buffer));
}

// =========================
// Discord 명령어
// =========================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // =====================
  // upload
  // =====================
  if (interaction.commandName === "upload") {
    await interaction.deferReply({ ephemeral: true });

    try {
      const attachment = interaction.options.getAttachment("file");
      const configName = interaction.options.getString("name");

      if (!attachment || !configName) {
        return interaction.editReply("값 없음");
      }

      // 🔥 이름 sanitize (보안)
      const safeName = configName.replace(/[^a-zA-Z0-9_-]/g, "");

      await saveIniFromDiscord(attachment.url, safeName);

      await interaction.editReply(`✅ 업로드 완료: ${safeName}`);
    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ 업로드 실패");
    }
  }

  // =====================
  // download exe
  // =====================
  if (interaction.commandName === "download" || interaction.commandName === "dl") {
    await interaction.reply({
      content: "pcp file",
      files: ["./public/pcp.exe"],
      ephemeral: true,
    });
  }
});

// =========================
// 🔥 다운로드 API (핵심)
// =========================
app.get("/files/format/download/:name", (req, res) => {
  const configName = req.params.name;
  const safeName = configName.replace(/[^a-zA-Z0-9_-]/g, "");

  const filePath = `./uploads/${safeName}/RiotUserSettings.ini`;

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("파일 없음");
  }

  // 👉 항상 동일 이름으로 다운로드
  res.download(filePath, "RiotUserSettings.ini");
});

// =========================
// 기타
// =========================
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
