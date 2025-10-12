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
    if (data.avatar_url) avatarImg.src = `${data.avatar_url}?v=${Date.now()}`;
    name.textContent = data.username ? `@${data.username}` : "@unknown";

    dot.className = "status-dot"; // reset
    dot.classList.add(`status-${data.status || "offline"}`);

    // === 활동 처리 ===
    const act = data.activity;

    if (act) {
      // Spotify 활동일 때
      if (act.name === "Spotify") {
        const title = act.details || "제목 없음";
        const artists = (act.state || "").split(";").map(a => a.trim()).join(", ");

        activity.innerHTML = `
          <div class="song-title">${title}</div>
          <div class="song-artists">${artists}</div>
        `;

        if (act.album_art_url) {
          albumArt.src = act.album_art_url;
          albumArt.classList.remove("hidden");
        } else {
          albumArt.classList.add("hidden");
        }
      } else {
        // Spotify 외 활동
        const title = act.name || "활동";
        const details = act.details ? ` (${act.details})` : "";
        const state = act.state || "";

        activity.innerHTML = `
          <div class="song-title">${title}${details}</div>
          <div class="song-artists">${state}</div>
        `;
        albumArt.classList.add("hidden");
      }
    } else {
      // 활동 없을 때
      activity.innerHTML = `<div class="song-title">활동 없음</div>`;
      albumArt.classList.add("hidden");
    }

    // === 카드 배경 ===
    if (data.banner_url) {
      card.style.backgroundImage = `url(${data.banner_url})`;
      card.style.backgroundSize = "cover";
      card.style.backgroundPosition = "center";
    } else {
      card.style.backgroundImage = "linear-gradient(135deg,#1e1f22,#2b2d31)";
    }
  } catch (err) {
    console.error(err);
    document.querySelector(".discord-activity").innerHTML =
      `<div class="song-title">불러오기 실패</div>`;
  }
}

// 첫 실행 및 주기적 갱신
fetchDiscordPresence();
setInterval(fetchDiscordPresence, 15000);
