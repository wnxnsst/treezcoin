const socket = io();

const MILLION_EVENT_SCORE = 1_000_000;
const celebratedMillionPlayers = new Set();

let audioContext = null;

const cooldowns = {
  mine: 120,
  greed: 1200,
  mega: 2500,
  steal: 3000,
  tax: 4000,
  rug: 5000,
  jackpot: 7000
};

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playTone(freq, duration, type = "sine", volume = 0.08) {
  initAudio();

  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.start(now);
  osc.stop(now + duration);
}

function playCoinSound() {
  playTone(900, 0.08, "square", 0.06);

  setTimeout(() => {
    playTone(1350, 0.08, "triangle", 0.05);
  }, 45);

  setTimeout(() => {
    playTone(1800, 0.06, "sine", 0.04);
  }, 90);
}

function playRiskSound() {
  playTone(180, 0.14, "sawtooth", 0.06);

  setTimeout(() => {
    playTone(420, 0.18, "sawtooth", 0.05);
  }, 70);
}

function playJackpotSound() {
  playTone(520, 0.08, "square", 0.06);
  setTimeout(() => playTone(780, 0.08, "square", 0.06), 80);
  setTimeout(() => playTone(1040, 0.08, "square", 0.06), 160);
  setTimeout(() => playTone(1560, 0.16, "triangle", 0.07), 240);
}

function playExplosionSound() {
  playTone(120, 0.12, "sawtooth", 0.09);
  setTimeout(() => playTone(220, 0.12, "sawtooth", 0.08), 70);
  setTimeout(() => playTone(80, 0.22, "square", 0.07), 140);
  setTimeout(() => playTone(900, 0.08, "triangle", 0.06), 230);
}

function setName() {
  const name = document.getElementById("nameInput").value;
  socket.emit("setName", name);
  playCoinSound();
}

function sendAction(type, event) {
  const button = event.currentTarget;

  if (button.classList.contains("cooling")) {
    return;
  }

  socket.emit("action", type);

  if (type === "mine") {
    playCoinSound();
    createFloatingText(event.clientX, event.clientY, "+TREEZ");
  } else if (type === "jackpot") {
    playJackpotSound();
    createFloatingText(event.clientX, event.clientY, "JACKPOT?");
  } else {
    playRiskSound();
    createFloatingText(event.clientX, event.clientY, "RISK");
  }

  createParticles(event.clientX, event.clientY);
  startCooldown(button, cooldowns[type] || 500);
}

function startCooldown(button, duration) {
  const fill = button.querySelector(".cooldownFill");
  if (!fill) return;

  button.classList.add("cooling");

  const start = performance.now();

  function animate(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const remaining = 100 - progress * 100;

    fill.style.width = `${remaining}%`;

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      fill.style.width = "0%";
      button.classList.remove("cooling");
    }
  }

  fill.style.width = "100%";
  requestAnimationFrame(animate);
}

function formatScore(num) {
  return Math.floor(num).toLocaleString("tr-TR");
}

function createFloatingText(x, y, text) {
  const el = document.createElement("div");
  el.className = "floating";
  el.innerText = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;

  document.body.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, 900);
}

function createParticles(x, y) {
  for (let i = 0; i < 20; i++) {
    const p = document.createElement("div");
    p.className = "particle";

    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 70;

    const px = Math.cos(angle) * distance;
    const py = Math.sin(angle) * distance;

    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.setProperty("--x", `${px}px`);
    p.style.setProperty("--y", `${py}px`);

    document.body.appendChild(p);

    setTimeout(() => {
      p.remove();
    }, 650);
  }
}

function createExplosion(x, y) {
  for (let i = 0; i < 90; i++) {
    const p = document.createElement("div");
    p.className = "explosionParticle";

    const angle = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * 260;

    const px = Math.cos(angle) * distance;
    const py = Math.sin(angle) * distance;

    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.setProperty("--x", `${px}px`);
    p.style.setProperty("--y", `${py}px`);

    document.body.appendChild(p);

    setTimeout(() => {
      p.remove();
    }, 1000);
  }
}

function triggerMillionEvent(playerName) {
  const box = document.getElementById("megaEvent");
  if (!box) return;

  box.innerHTML = `${playerName}<br>1.000.000 TREEZ!`;
  box.classList.remove("show");

  void box.offsetWidth;

  box.classList.add("show");

  document.body.classList.add("screenShake");
  playExplosionSound();

  createExplosion(window.innerWidth / 2, window.innerHeight / 2);

  setTimeout(() => {
    box.classList.remove("show");
    document.body.classList.remove("screenShake");
  }, 1500);
}

function updateMoneyBoard(players) {
  const board = document.getElementById("moneyBoard");
  if (!board) return;

  let html = `<div class="moneyBoardTitle">CANLI TREEZ TABLOSU</div>`;

  players.forEach((player, index) => {
    const rowClass = index === 0 ? "moneyRow leaderRow" : "moneyRow";
    const nameClass = index === 0 ? "fireLeader" : index === 1 ? "rgbRunner" : "normalName";

    html += `
      <div class="${rowClass}">
        <span class="${nameClass}">${index + 1}. ${player.name}</span>
        <strong>${formatScore(player.score)}</strong>
      </div>
    `;
  });

  board.innerHTML = html;
}

function spawnBackgroundCoin() {
  const layer = document.getElementById("coinRain");
  if (!layer) return;

  const coin = document.createElement("div");
  coin.className = "bgCoin";
  coin.innerText = "T";

  const size = 22 + Math.random() * 24;

  coin.style.width = `${size}px`;
  coin.style.height = `${size}px`;
  coin.style.left = `${Math.random() * 100}%`;
  coin.style.animationDuration = `${4 + Math.random() * 5}s`;

  layer.appendChild(coin);

  setTimeout(() => {
    coin.remove();
  }, 9500);
}

setInterval(spawnBackgroundCoin, 450);

socket.on("roomFull", () => {
  document.body.innerHTML = `
    <div style="color:white;text-align:center;margin-top:120px;font-family:Arial">
      <h1>Oda Dolu</h1>
      <p>Max 6 oyuncu girebilir.</p>
    </div>
  `;
});

socket.on("state", (state) => {
  const playersDiv = document.getElementById("players");
  const logsDiv = document.getElementById("logs");
  const winnerBox = document.getElementById("winnerBox");
  const warningBox = document.getElementById("warningBox");

  if (!playersDiv || !logsDiv || !winnerBox || !warningBox) return;

  playersDiv.innerHTML = "";
  logsDiv.innerHTML = "";

  updateMoneyBoard(state.players);

  warningBox.innerHTML = `${state.players.length}/6 oyuncu masada | Hedef: ${formatScore(state.winScore)} TREEZ`;

  if (state.winner) {
    winnerBox.innerHTML = `Kazanan: ${state.winner}`;
  } else {
    winnerBox.innerHTML = "";
  }

  state.players.forEach((player, index) => {
    const gainText = player.lastGain > 0
      ? `+${formatScore(player.lastGain)} TREEZ`
      : player.lastGain < 0
        ? `${formatScore(player.lastGain)} TREEZ`
        : "";

    const nameClass = index === 0 ? "fireLeader" : index === 1 ? "rgbRunner" : "normalName";
    const cardClass = index === 0 ? "player leaderCard" : index === 1 ? "player secondCard" : "player";
    const progress = Math.min((player.score / state.winScore) * 100, 100);

    if (player.score >= MILLION_EVENT_SCORE && !celebratedMillionPlayers.has(player.id)) {
      celebratedMillionPlayers.add(player.id);
      triggerMillionEvent(player.name);
    }

    playersDiv.innerHTML += `
      <div class="${cardClass}">
        <div class="${nameClass}">${index + 1}. ${player.name}</div>
        <div class="score">${formatScore(player.score)} TREEZ</div>
        <div class="gain">${gainText}</div>
        <div class="progressWrap">
          <div class="progressFill" style="width:${progress}%"></div>
        </div>
      </div>
    `;
  });

  state.logs.slice().reverse().forEach((log) => {
    logsDiv.innerHTML += `
      <div class="log">${log}</div>
    `;
  });
});