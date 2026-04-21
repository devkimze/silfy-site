import { REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

// =====================
const commands = [

  new SlashCommandBuilder()
    .setName("download")
    .setDescription("다운로드"),

  new SlashCommandBuilder()
    .setName("dl")
    .setDescription("다운로드"),

  new SlashCommandBuilder()
    .setName("updateexe")
    .setDescription("pcp.exe 업데이트 (관리자 전용)")
    .addAttachmentOption(o =>
      o.setName("file")
        .setDescription("exe 파일")
        .setRequired(true)
    ),

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

// =====================
// REST
// =====================
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

// =====================
// 실행
// =====================
(async () => {
  try {
    console.log("🧹 글로벌 명령어 삭제 중...");
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: [] }
    );

    console.log("🧹 길드 명령어 초기화 중...");
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: [] }
    );

    console.log("🚀 명령어 등록 중...");
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("✅ 완료 (download / dl / nip / updateexe)");
  } catch (err) {
    console.error(err);
  }
})();
