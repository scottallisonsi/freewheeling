const palette = [
  "#5B8DEF",
  "#42C58A",
  "#F5A524",
  "#EF6B6B",
  "#7D67EE",
  "#2CB1BC",
  "#F28CB1",
  "#9CCB5A",
  "#4C6FFF",
  "#F97316",
];

const state = {
  entries: [],
  baseEntries: [],
  eliminated: new Set(),
  history: [],
  totalPicks: 0,
  pendingWinner: null,
  selectionMode: "wheel",
  winnerMode: "remove",
  soundOn: true,
  audioReady: false,
  isSpinning: false,
  rotation: 0,
  cardPreviewName: "-",
};

const elements = {
  entriesInput: document.getElementById("entriesInput"),
  teamCountInput: document.getElementById("teamCountInput"),
  generateTeamsBtn: document.getElementById("generateTeamsBtn"),
  applyEntriesBtn: document.getElementById("applyEntriesBtn"),
  shuffleBtn: document.getElementById("shuffleBtn"),
  winnerMode: document.getElementById("winnerMode"),
  soundToggle: document.getElementById("soundToggle"),
  resetWheelBtn: document.getElementById("resetWheelBtn"),
  statusMsg: document.getElementById("statusMsg"),
  wheelModeBtn: document.getElementById("wheelModeBtn"),
  cardModeBtn: document.getElementById("cardModeBtn"),
  wheelStage: document.getElementById("wheelStage"),
  cardStage: document.getElementById("cardStage"),
  cardStack: document.getElementById("cardStack"),
  cardStageName: document.getElementById("cardStageName"),
  spinBtn: document.getElementById("spinBtn"),
  winnerName: document.getElementById("winnerName"),
  totalPicksValue: document.getElementById("totalPicksValue"),
  historyList: document.getElementById("historyList"),
  explainabilityText: document.getElementById("explainabilityText"),
  winnerOverlay: document.getElementById("winnerOverlay"),
  winnerOverlayName: document.getElementById("winnerOverlayName"),
  closeWinnerOverlayBtn: document.getElementById("closeWinnerOverlayBtn"),
  canvas: document.getElementById("wheelCanvas"),
};

const ctx = elements.canvas.getContext("2d");

function getCleanEntries(text) {
  return text
    .split("\n")
    .map((e) => e.trim())
    .filter(Boolean)
    .slice(0, 100);
}

function visibleEntries() {
  if (state.winnerMode === "no-repeat") {
    return state.entries.filter((entry) => !state.eliminated.has(entry));
  }
  return state.entries;
}

function secureRandomInt(maxExclusive) {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % maxExclusive;
}

function shuffleEntries() {
  const list = [...state.entries];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = secureRandomInt(i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  state.entries = list;
}

function saveState() {
  const data = {
    entries: state.entries,
    baseEntries: state.baseEntries,
    history: state.history,
    totalPicks: state.totalPicks,
    selectionMode: state.selectionMode,
    winnerMode: state.winnerMode,
    soundOn: state.soundOn,
    eliminated: Array.from(state.eliminated),
  };
  localStorage.setItem("wheelspinner_state", JSON.stringify(data));
}

function loadState() {
  const fromUrl = readShareData();
  if (fromUrl) {
    state.entries = fromUrl.entries;
    state.baseEntries = [...fromUrl.entries];
    state.totalPicks = 0;
    state.selectionMode = fromUrl.selectionMode || "wheel";
    state.winnerMode = fromUrl.winnerMode || "remove";
    state.history = [];
    state.eliminated.clear();
    return;
  }
  const raw = localStorage.getItem("wheelspinner_state");
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    state.entries = Array.isArray(data.entries) ? data.entries.slice(0, 100) : [];
    state.baseEntries = Array.isArray(data.baseEntries)
      ? data.baseEntries.slice(0, 100)
      : [...state.entries];
    state.history = Array.isArray(data.history) ? data.history.slice(0, 100) : [];
    state.totalPicks = Number.isFinite(data.totalPicks) ? Math.max(0, data.totalPicks) : 0;
    state.selectionMode = data.selectionMode === "cards" ? "cards" : "wheel";
    state.winnerMode = data.winnerMode || "remove";
    state.soundOn = data.soundOn !== false;
    state.eliminated = new Set(Array.isArray(data.eliminated) ? data.eliminated : []);
  } catch (_) {
    // ignore corrupt local data
  }
}

function readShareData() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("wheel");
  if (!encoded) return null;
  try {
    const json = atob(encoded);
    const data = JSON.parse(json);
    if (!Array.isArray(data.entries)) return null;
    return {
      entries: data.entries.map((v) => String(v)).slice(0, 100),
      selectionMode: data.selectionMode === "cards" ? "cards" : "wheel",
      winnerMode: String(data.winnerMode || "remove"),
    };
  } catch (_) {
    return null;
  }
}

function drawWheel(entries) {
  const { width, height } = elements.canvas;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 10;

  ctx.clearRect(0, 0, width, height);

  if (!entries.length) {
    ctx.fillStyle = "#d9e1f2";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1f2a44";
    ctx.font = "700 26px Avenir Next";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Add entries", cx, cy);
    return;
  }

  const arc = (Math.PI * 2) / entries.length;
  const offset = -Math.PI / 2;

  entries.forEach((entry, i) => {
    const start = offset + i * arc + state.rotation;
    const end = start + arc;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = palette[i % palette.length];
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + arc / 2);
    ctx.fillStyle = "#fff";
    ctx.font = "700 17px Avenir Next";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const label = entry.length > 18 ? `${entry.slice(0, 18)}...` : entry;
    ctx.fillText(label, radius - 14, 0);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.strokeStyle = "#d9e1f2";
  ctx.stroke();
}

function render() {
  const entries = visibleEntries();
  const isWheelMode = state.selectionMode === "wheel";
  elements.wheelStage.classList.toggle("hidden", !isWheelMode);
  elements.cardStage.classList.toggle("hidden", isWheelMode);
  elements.wheelModeBtn.classList.toggle("is-active", isWheelMode);
  elements.cardModeBtn.classList.toggle("is-active", !isWheelMode);
  elements.wheelModeBtn.setAttribute("aria-pressed", String(isWheelMode));
  elements.cardModeBtn.setAttribute("aria-pressed", String(!isWheelMode));
  elements.spinBtn.textContent = isWheelMode ? "SPIN" : "SHUFFLE";
  if (isWheelMode) {
    drawWheel(entries);
  } else {
    if (!entries.length) {
      state.cardPreviewName = "Add entries";
    } else if (!entries.includes(state.cardPreviewName)) {
      state.cardPreviewName = entries[0];
    }
    elements.cardStageName.textContent = state.cardPreviewName;
  }
  renderHistory();
  renderExplainability(entries);
  elements.spinBtn.disabled = state.isSpinning || entries.length < 2;
  elements.winnerName.textContent = state.history[0] || "-";
  elements.totalPicksValue.textContent = String(state.totalPicks);
  elements.entriesInput.value = state.entries.join("\n");
  elements.winnerMode.value = state.winnerMode;
  elements.soundToggle.checked = state.soundOn;
}

function renderHistory() {
  elements.historyList.innerHTML = "";
  state.history.forEach((name) => {
    const li = document.createElement("li");
    li.textContent = name;
    elements.historyList.appendChild(li);
  });
}

function renderExplainability(entries) {
  if (!entries.length) {
    elements.explainabilityText.textContent = "Add entries to begin. Each pick uses cryptographic random selection.";
    return;
  }
  const chance = (100 / entries.length).toFixed(2);
  const action = state.selectionMode === "cards" ? "shuffle" : "spin";
  elements.explainabilityText.textContent =
    `Fairness: each active entry has equal chance (${chance}%, 1/${entries.length}) before each ${action}.`;
}

function setStatus(msg) {
  elements.statusMsg.textContent = msg;
}

function getAudioContext() {
  if (!window.__wheelAudioContext || window.__wheelAudioContext.state === "closed") {
    window.__wheelAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return window.__wheelAudioContext;
}

function unlockAudio() {
  const audioContext = getAudioContext();
  if (audioContext.state !== "running") {
    return audioContext.resume().then(() => {
      state.audioReady = true;
      return true;
    }).catch(() => false);
  }
  state.audioReady = true;
  return Promise.resolve(true);
}

function scheduleTone(audioContext, freq, durationMs, type, gainValue) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  const durationSeconds = durationMs / 1000;
  oscillator.type = type;
  oscillator.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + durationSeconds + 0.02);
}

function playTone(freq, durationMs, type = "triangle", gainValue = 0.03) {
  if (!state.soundOn) return;
  const audioContext = getAudioContext();
  if (state.audioReady && audioContext.state === "running") {
    scheduleTone(audioContext, freq, durationMs, type, gainValue);
    return;
  }
  unlockAudio().then((ok) => {
    if (!ok) return;
    scheduleTone(audioContext, freq, durationMs, type, gainValue);
  });
}

function playSpinStartSound() {
  playTone(190, 90, "sine", 0.03);
}

function playCardShuffleStartSound() {
  playTone(240, 80, "triangle", 0.022);
  setTimeout(() => playTone(320, 70, "sine", 0.018), 65);
}

function playWinnerRevealSound() {
  playTone(520, 90, "square", 0.05);
  setTimeout(() => playTone(740, 110, "square", 0.045), 90);
}

function playVictorySound() {
  playTone(640, 140, "triangle", 0.045);
  setTimeout(() => playTone(820, 140, "triangle", 0.042), 150);
  setTimeout(() => playTone(980, 180, "sine", 0.04), 320);
}

function showWinnerOverlay(winner) {
  elements.winnerOverlayName.textContent = winner;
  elements.winnerOverlay.classList.remove("hidden");
  playVictorySound();
}

function hideWinnerOverlay() {
  if (state.pendingWinner) {
    applyWinnerMode(state.pendingWinner);
    state.pendingWinner = null;
    saveState();
    render();
  }
  elements.winnerOverlay.classList.add("hidden");
}

function finalizeSelection(winner) {
  state.isSpinning = false;
  state.totalPicks += 1;
  state.history.unshift(winner);
  state.history = state.history.slice(0, 30);
  state.pendingWinner = winner;
  setStatus(`Selected: ${winner}`);
  playWinnerRevealSound();
  showWinnerOverlay(winner);
  renderHistory();
  renderExplainability(visibleEntries());
  elements.winnerName.textContent = winner;
  saveState();
}

function animateSpin(targetRotation, entriesSnapshot, winnerIndex) {
  state.isSpinning = true;
  const start = performance.now();
  const startRot = state.rotation;
  const duration = 5600;
  let nextTickAt = start + 90;

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    // Single smooth ease-out to avoid any late-stage re-acceleration artifacts.
    const eased = 1 - Math.pow(1 - t, 5.2);
    state.rotation = startRot + (targetRotation - startRot) * eased;
    drawWheel(entriesSnapshot);

    if (state.soundOn && now >= nextTickAt && t < 0.98) {
      const tickFreq = 700 - 280 * t;
      const tickGain = 0.025 + 0.012 * (1 - t);
      playTone(tickFreq, 18, "square", tickGain);
      const tickInterval = 42 + 250 * t * t;
      nextTickAt = now + tickInterval;
    }

    if (t < 1) {
      requestAnimationFrame(frame);
      return;
    }
    finalizeSelection(entriesSnapshot[winnerIndex]);
  }

  requestAnimationFrame(frame);
}

function animateCardShuffle(entriesSnapshot, winnerIndex) {
  state.isSpinning = true;
  state.cardPreviewName = entriesSnapshot[secureRandomInt(entriesSnapshot.length)] || entriesSnapshot[0];
  elements.cardStageName.textContent = state.cardPreviewName;
  elements.cardStack.classList.remove("is-revealed");
  elements.cardStack.classList.add("is-shuffling");

  const start = performance.now();
  const duration = 2250;
  let nextRevealAt = start;
  let lastShown = state.cardPreviewName;

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);

    if (now >= nextRevealAt && t < 1) {
      let candidate = entriesSnapshot[secureRandomInt(entriesSnapshot.length)];
      if (entriesSnapshot.length > 1) {
        let attempts = 0;
        while (candidate === lastShown && attempts < 5) {
          candidate = entriesSnapshot[secureRandomInt(entriesSnapshot.length)];
          attempts += 1;
        }
      }
      state.cardPreviewName = candidate;
      elements.cardStageName.textContent = candidate;
      lastShown = candidate;

      if (state.soundOn) {
        const tickFreq = 520 - 110 * t;
        const tickGain = 0.018 + 0.008 * (1 - t);
        playTone(tickFreq, 24, "triangle", tickGain);
      }

      nextRevealAt = now + 42 + 180 * Math.pow(t, 1.8);
    }

    if (t < 1) {
      requestAnimationFrame(frame);
      return;
    }

    const winner = entriesSnapshot[winnerIndex];
    state.cardPreviewName = winner;
    elements.cardStageName.textContent = winner;
    elements.cardStack.classList.remove("is-shuffling");
    elements.cardStack.classList.add("is-revealed");
    finalizeSelection(winner);
    setTimeout(() => elements.cardStack.classList.remove("is-revealed"), 320);
  }

  requestAnimationFrame(frame);
}

function applyWinnerMode(winner) {
  if (state.winnerMode === "remove") {
    state.entries = state.entries.filter((v) => v !== winner);
    state.eliminated.delete(winner);
    return;
  }
  if (state.winnerMode === "no-repeat") {
    state.eliminated.add(winner);
    if (state.eliminated.size >= state.entries.length) state.eliminated.clear();
  }
}

function spin() {
  const entries = visibleEntries();
  if (!elements.winnerOverlay.classList.contains("hidden")) return;
  if (entries.length < 2 || state.isSpinning) return;
  const winnerIndex = secureRandomInt(entries.length);
  if (state.selectionMode === "cards") {
    playCardShuffleStartSound();
    animateCardShuffle(entries, winnerIndex);
    return;
  }
  const segment = (Math.PI * 2) / entries.length;
  const pointerAngle = -Math.PI / 2;
  const winnerCenterAngle = -Math.PI / 2 + winnerIndex * segment + segment / 2;
  const normalizedCurrent = ((state.rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const destinationWithinCircle =
    ((pointerAngle - winnerCenterAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  const extraSpins = 8 * Math.PI * 2;
  const delta = ((destinationWithinCircle - normalizedCurrent + Math.PI * 2) % (Math.PI * 2)) + extraSpins;
  const targetRotation = state.rotation + delta;
  playSpinStartSound();
  animateSpin(targetRotation, entries, winnerIndex);
}

function setSelectionMode(mode) {
  if (state.isSpinning) return;
  state.selectionMode = mode === "cards" ? "cards" : "wheel";
  render();
  saveState();
}

function resetWinnerState() {
  state.entries = [...state.baseEntries];
  state.eliminated.clear();
  state.pendingWinner = null;
  state.history = [];
  state.cardPreviewName = state.entries[0] || "-";
  setStatus("Winner state reset.");
  saveState();
  render();
}

function applyEntriesFromInput() {
  const entries = getCleanEntries(elements.entriesInput.value);
  state.entries = entries;
  state.baseEntries = [...entries];
  state.eliminated.clear();
  state.pendingWinner = null;
  state.history = [];
  state.cardPreviewName = entries[0] || "-";
  setStatus(`Applied ${entries.length} entries.`);
  saveState();
  render();
}

function generateTeams() {
  const count = Number(elements.teamCountInput.value);
  if (!Number.isFinite(count) || count < 2) {
    setStatus("Enter at least 2 teams.");
    return;
  }
  const safeCount = Math.min(100, Math.floor(count));
  state.entries = Array.from({ length: safeCount }, (_, idx) => `Team ${idx + 1}`);
  state.baseEntries = [...state.entries];
  state.eliminated.clear();
  state.pendingWinner = null;
  state.history = [];
  state.cardPreviewName = state.entries[0] || "-";
  elements.entriesInput.value = state.entries.join("\n");
  setStatus(`Generated ${safeCount} teams.`);
  saveState();
  render();
}

function setupEvents() {
  const primeAudio = () => {
    unlockAudio().catch(() => {});
  };
  document.addEventListener("pointerdown", primeAudio, { passive: true });
  document.addEventListener("keydown", primeAudio);
  window.addEventListener("focus", primeAudio);
  window.addEventListener("pageshow", primeAudio);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") primeAudio();
  });

  elements.applyEntriesBtn.addEventListener("click", applyEntriesFromInput);
  elements.generateTeamsBtn.addEventListener("click", generateTeams);
  elements.shuffleBtn.addEventListener("click", () => {
    shuffleEntries();
    state.baseEntries = [...state.entries];
    state.cardPreviewName = state.entries[0] || "-";
    saveState();
    render();
    setStatus("Entries shuffled.");
  });
  elements.wheelModeBtn.addEventListener("click", () => setSelectionMode("wheel"));
  elements.cardModeBtn.addEventListener("click", () => setSelectionMode("cards"));
  elements.winnerMode.addEventListener("change", (event) => {
    state.winnerMode = event.target.value;
    if (state.winnerMode !== "no-repeat") state.eliminated.clear();
    saveState();
    render();
  });
  elements.soundToggle.addEventListener("change", (event) => {
    state.soundOn = event.target.checked;
    saveState();
  });
  elements.resetWheelBtn.addEventListener("click", resetWinnerState);
  elements.spinBtn.addEventListener("click", spin);
  elements.canvas.addEventListener("click", spin);
  elements.cardStage.addEventListener("click", spin);
  elements.closeWinnerOverlayBtn.addEventListener("click", hideWinnerOverlay);
  elements.winnerOverlay.addEventListener("click", (event) => {
    if (event.target === elements.winnerOverlay) hideWinnerOverlay();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideWinnerOverlay();
  });
}

function bootstrap() {
  loadState();
  if (!state.entries.length) {
    state.entries = ["Peter Parker", "Tony Stark", "Thor Odinson", "Natasha Romanoff", "Bruce Banner"];
    state.baseEntries = [...state.entries];
  }
  if (!state.baseEntries.length) {
    state.baseEntries = [...state.entries];
  }
  state.cardPreviewName = state.entries[0] || "-";
  elements.entriesInput.value = state.entries.join("\n");
  setupEvents();
  render();
}

bootstrap();
