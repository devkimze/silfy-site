// =====================
// updateexe (관리자 전용)
// =====================
if (interaction.commandName === "updateexe") {
  await interaction.deferReply({ ephemeral: true });

  try {
    // 🔒 관리자 체크 (서버 권한 기준)
    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.editReply("❌ 관리자만 사용 가능");
    }

    const attachment = interaction.options.getAttachment("file");

    // exe만 허용
    if (!attachment.name.endsWith(".exe")) {
      return interaction.editReply("❌ exe 파일만 업로드 가능");
    }

    const res = await fetch(attachment.url);
    const buffer = await res.arrayBuffer();

    const filePath = "./public/pcp.exe";

    fs.writeFileSync(filePath, Buffer.from(buffer));

    await interaction.editReply("✅ pcp.exe 업데이트 완료");
  } catch (err) {
    console.error(err);
    await interaction.editReply("❌ 업데이트 실패");
  }
}
