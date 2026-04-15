import { REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const commands = [
  new SlashCommandBuilder().setName("download").setDescription("다운로드"),
  new SlashCommandBuilder().setName("dl").setDescription("다운로드"),
  new SlashCommandBuilder()
  .setName("upload")
  .addStringOption(o => o.setName("name").setRequired(true))
  .addAttachmentOption(o => o.setName("file").setRequired(true)),

new SlashCommandBuilder()
  .setName("update")
  .addStringOption(o => o.setName("name").setRequired(true))
  .addAttachmentOption(o => o.setName("file").setRequired(true))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

await rest.put(
  Routes.applicationCommands(process.env.CLIENT_ID),
  { body: commands }
);

console.log("등록 완료");
