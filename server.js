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

// =========================
// 📁 nvidia 폴더
// =========================
if (!fs.existsSync("./nvidia")) {
  fs.mkdirSync("./nvidia", { recursive: true });
}

// 웹 접근
app.use("/nvidia", express.static("nvidia"));

// =========================
// 📦 nip 저장 함수
// =========================
async function saveNip(url, name) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();

  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "");
  const filePath = `./nvidia/${safeName}.nip`;

  fs.writeFileSync(filePath, Buffer.from(buffer));
  return filePath;
}

// =========================
// 🤖 Discord
// =========================
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`Discord Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // =====================
  // nip 업로드
  // =====================
  if (interaction.commandName === "nip") {
    await interaction.deferReply({ ephemeral: true });

    try {
      const attachment = interaction.options.getAttachment("file");
      const name = interaction.options.getString("name");

      const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "");
      const filePath = `./nvidia/${safeName}.nip`;

      if (fs.existsSync(filePath)) {
        return interaction.editReply("❌ 이미 존재함");
      }

      await saveNip(attachment.url, safeName);

      const url = `https://silfy.dev/nvidia/${safeName}.nip`;

      await interaction.editReply(`✅ 업로드 완료\n🌐 ${url}`);
    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ 업로드 실패");
    }
  }

  // =====================
  // download / dl
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
// 🌐 API
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
