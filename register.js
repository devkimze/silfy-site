import { REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const commands = [

  // =====================
  // download
  // =====================
  new SlashCommandBuilder()
    .setName("download")
    .setDescription("다운로드"),

  // =====================
  // dl (별칭)
  // =====================
  new SlashCommandBuilder()
    .setName("dl")
    .setDescription("다운로드"),

  // =====================
  // nip 업로드
  // =====================
  new SlashCommandBuilder()
    .setName("nip")
    .setDescription("nip 업로드")
    .addStringOption(o =>
      o.setName("name")
        .setDescription("파일 이름")
        .setRequired(true)
    )
    .addAttachmentOption(o =>
      o.setName("file")
        .setDescription("nip 파일")
        .setRequired(true)
    )

].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

await rest.put(
  Routes.applicationGuildCommands(
    process.env.CLIENT_ID,
    process.env.GUILD_ID
  ),
  { body: [] } // 💣 전체 삭제
);

console.log("모든 명령어 삭제됨");

console.log("등록 완료 (download / dl / nip만)");
