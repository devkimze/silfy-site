import { REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const commands = [
  new SlashCommandBuilder()
    .setName("download")
    .setDescription("다운로드"),

  new SlashCommandBuilder()
    .setName("dl")
    .setDescription("다운로드"),

  new SlashCommandBuilder()
    .setName("upload")
    .setDescription("ini 업로드")
    .addStringOption(o =>
      o.setName("name")
        .setDescription("config 이름") 
        .setRequired(true)
    )
    .addAttachmentOption(o =>
      o.setName("file")
        .setDescription("ini 파일") 
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("update")
    .setDescription("ini 업데이트")
    .addStringOption(o =>
      o.setName("name")
        .setDescription("config 이름")
        .setRequired(true)
    )
    .addAttachmentOption(o =>
      o.setName("file")
        .setDescription("ini 파일")
        .setRequired(true)
    ),
  
  new SlashCommandBuilder()
  .setName("suser")
  .setDescription("유저 관리")
  .addSubcommand(sub =>
    sub.setName("add")
      .setDescription("등록")
      .addStringOption(o =>
        o.setName("name").setDescription("닉네임").setRequired(true))
      .addStringOption(o =>
        o.setName("id").setDescription("발로 ID").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("get")
      .setDescription("조회")
      .addStringOption(o =>
        o.setName("name").setDescription("닉네임").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("delete")
      .setDescription("삭제")
      .addStringOption(o =>
        o.setName("name").setDescription("닉네임").setRequired(true))
  )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

await rest.put(
  Routes.applicationCommands(process.env.CLIENT_ID),
  { body: commands }
);

console.log("등록 완료");
