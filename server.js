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

// nvidia 폴더
if (!fs.existsSync("./nvidia")) {
  fs.mkdirSync("./nvidia", { recursive: true });
}

// 🔥 URL로 접근 가능하게
app.use("/nvidia", express.static("nvidia"));

async function saveNip(url, name) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();

  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "");
  const filePath = `./nvidia/${safeName}.nip`;

  fs.writeFileSync(filePath, Buffer.from(buffer));

  return filePath;
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`Discord Logged in as ${client.user.tag}`);
});

// =========================
// 📁 USER DB (JSON)
// =========================
const USER_DB_PATH = path.resolve("./data/users.json");

console.log("📁 USER_DB_PATH:", USER_DB_PATH);

// 폴더 생성
const dataDir = path.dirname(USER_DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// 파일 생성
if (!fs.existsSync(USER_DB_PATH)) {
  fs.writeFileSync(USER_DB_PATH, "{}");
  console.log("📦 users.json 생성됨");
}

// 로드 함수 (로그 추가)
function loadUsers() {
  const raw = fs.readFileSync(USER_DB_PATH, "utf-8");
  console.log("📖 DB READ:", raw);
  return JSON.parse(raw);
}

// 저장 함수 (로그 추가)
function saveUsers(data) {
  console.log("💾 DB WRITE:", data);
  fs.writeFileSync(USER_DB_PATH, JSON.stringify(data, null, 2));
}
// =========================
// 📦 INI 저장 함수
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
// 🤖 Discord 명령어
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
  // update
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
  // suser (핵심)
  // =====================
  if (interaction.commandName === "suser") {
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const name = interaction.options.getString("name");
    const id = interaction.options.getString("id");

    let db = loadUsers();

    // add
    if (sub === "add") {
      if (db[name]) {
        return interaction.editReply("❌ 이미 존재함");
      }

      db[name] = id;
      saveUsers(db);

      return interaction.editReply(`✅ 등록됨: ${name}`);
    }

    // get
    if (sub === "get") {
      if (!db[name]) {
        return interaction.editReply("❌ 없음");
      }

      return interaction.editReply(`🔎 ${name} → ${db[name]}`);
    }

    // delete
    if (sub === "delete") {
      if (!db[name]) {
        return interaction.editReply("❌ 없음");
      }

      delete db[name];
      saveUsers(db);

      return interaction.editReply(`🗑 삭제됨: ${name}`);
    }

    // list
    if (sub === "list") {
      const keys = Object.keys(db);

      if (keys.length === 0) {
        return interaction.editReply("📭 비어있음");
      }

      return interaction.editReply(
        "📜 목록:\n" + keys.map(k => `- ${k}`).join("\n")
      );
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
// 🌐 API
// =========================

// ini 다운로드
app.get("/files/format/download/:name", (req, res) => {
  const safeName = req.params.name.replace(/[^a-zA-Z0-9_-]/g, "");
  const filePath = `./uploads/${safeName}/RiotUserSettings.ini`;

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("파일 없음");
  }

  res.download(filePath, "RiotUserSettings.ini");
});

// 🔥 suser API
app.get("/api/user/:name", (req, res) => {
  const db = loadUsers();
  const name = req.params.name;

  if (!db[name]) {
    return res.status(404).json({ error: "없음" });
  }

  res.json({ name, id: db[name] });
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
