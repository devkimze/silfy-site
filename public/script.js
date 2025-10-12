async function fetchDiscordPresence() {
  try {
    const res = await fetch(`/api/discord-status/1256264184996565135?_=${Date.now()}`);
    const data = await res.json();

    const avatarImg = document.querySelector(".discord-avatar img");
    const name = document.querySelector(".discord-name");
    const dot = document.querySelector(".status-dot");
    const activity = document.querySelector(".discord-activity");
    const albumArt = document.querySelector(".album-art");
    const card = document.querySelector(".social-item.discord");

    // === 아바타 & 상태 ===
    avatarImg.src = `${data.avatar_url}?v=${Date.now()}`;
    dot.className = "status-dot";
    dot.classList.add(`status-${data.status || "offline"}`);
    name.textContent = data.username || "Unknown";

    // === 활동 (Spotify만 2줄 표시) ===
    if (data.activity?.name === "Spotify") {
      const title = data.activity.details || "";
      const artists = (data.activity.state || "").split(";").map(a => a.trim()).join(", ");

      activity.innerHTML = `
        <div class="song-title">${title}</div>
        <div class="song-artists">${artists}</div>
      `;

      if (data.activity.album_art_url) {
        albumArt.src = data.activity.album_art_url;
        albumArt.classList.remove("hidden");
      } else {
        albumArt.classList.add("hidden");
      }
    } else {
      const actText = data.activity?.formatted || data.activity?.name || "활동 없음";
      activity.innerHTML = `<div class="song-title">${actText}</div>`;
      albumArt.classList.add("hidden");
    }

    // === 배경 ===
    card.style.backgroundImage = data.banner_url
      ? `url(${data.banner_url})`
      : "linear-gradient(135deg,#1e1f22,#2b2d31)";
  } catch (err) {
    console.error(err);
    document.querySelector(".discord-activity").innerHTML =
      `<div class="song-title">불러오기 실패</div>`;
  }
}

fetchDiscordPresence();
setInterval(fetchDiscordPresence, 15000);
