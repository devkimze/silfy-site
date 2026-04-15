import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`Discord Logged in as ${client.user.tag}`);
});

// =========================
// 공통 저장 함수
// =========================
async function saveIni(url, configName) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();

  const dir = `./uploads/${configName}`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filePath = `${dir}/RiotUserSettings.ini`;
  fs.writeFileSync(filePath, Buffer.from(buffer));

  return filePath;
}

// =========================
// Discord 명령어
// =========================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // =====================
  // upload (신규만)
  // =====================
  if (interaction.commandName === "upload") {
    await interaction.deferReply({ ephemeral: true });

    try {
      const attachment = interaction.options.getAttachment("file");
      const name = interaction.options.getString("name");

      const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "");
      const filePath = `./uploads/${safeName}/RiotUserSettings.ini`;

      if (fs.existsSync(filePath)) {
        return interaction.editReply("❌ 이미 존재함 → /update 써라");
      }

      await saveIni(attachment.url, safeName);

      await interaction.editReply(`✅ 생성 완료: ${safeName}`);
    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ 업로드 실패");
    }
  }

  // =====================
  // update (덮어쓰기)
  // =====================
  if (interaction.commandName === "update") {
    await interaction.deferReply({ ephemeral: true });

    try {
      const attachment = interaction.options.getAttachment("file");
      const name = interaction.options.getString("name");

      const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "");
      const filePath = `./uploads/${safeName}/RiotUserSettings.ini`;

      if (!fs.existsSync(filePath)) {
        return interaction.editReply("❌ 없음 → 먼저 /upload");
      }

      await saveIni(attachment.url, safeName);

      await interaction.editReply(`🔄 업데이트 완료: ${safeName}`);
    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ 업데이트 실패");
    }
  }

  // =====================
  // exe 다운로드
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
// 다운로드 API
// =========================
app.get("/files/format/download/:name", (req, res) => {
  const safeName = req.params.name.replace(/[^a-zA-Z0-9_-]/g, "");

  const filePath = `./uploads/${safeName}/RiotUserSettings.ini`;

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("파일 없음");
  }

  res.download(filePath, "RiotUserSettings.ini");
});

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
