"use strict";

const CURRICULUM_VERSION = 3;

const COURSE = [
  ["Ascending Perfect Octaves", "perfect octave", "P8", 7, 12, 1],
  ["Descending Perfect Octaves", "perfect octave", "P8", 7, 12, -1],
  ["Ascending Major Thirds", "major third", "M3", 2, 4, 1],
  ["Descending Major Thirds", "major third", "M3", 2, 4, -1],
  ["Ascending Perfect Fifths", "perfect fifth", "P5", 4, 7, 1],
  ["Descending Perfect Fifths", "perfect fifth", "P5", 4, 7, -1],
  ["Ascending Perfect Fourths", "perfect fourth", "P4", 3, 5, 1],
  ["Descending Perfect Fourths", "perfect fourth", "P4", 3, 5, -1],
  ["Ascending Major Seconds", "major second", "M2", 1, 2, 1],
  ["Descending Major Seconds", "major second", "M2", 1, 2, -1],
  ["Ascending Major Sixths", "major sixth", "M6", 5, 9, 1],
  ["Descending Major Sixths", "major sixth", "M6", 5, 9, -1],
  ["Ascending Major Sevenths", "major seventh", "M7", 6, 11, 1],
  ["Descending Major Sevenths", "major seventh", "M7", 6, 11, -1],
  ["Ascending Minor Thirds", "minor third", "m3", 2, 3, 1],
  ["Descending Minor Thirds", "minor third", "m3", 2, 3, -1],
  ["Ascending Minor Seconds", "minor second", "m2", 1, 1, 1],
  ["Descending Minor Seconds", "minor second", "m2", 1, 1, -1],
  ["Ascending Minor Sixths", "minor sixth", "m6", 5, 8, 1],
  ["Descending Minor Sixths", "minor sixth", "m6", 5, 8, -1],
  ["Ascending Minor Sevenths", "minor seventh", "m7", 6, 10, 1],
  ["Descending Minor Sevenths", "minor seventh", "m7", 6, 10, -1],
  ["Ascending Tritones", "tritone", "TT", 3, 6, 1],
  ["Descending Tritones", "tritone", "TT", 3, 6, -1]
].map((row, index) => ({
  id: index + 1,
  title: row[0],
  singularTitle: row[0].replace(/s$/, ""),
  label: row[1],
  shortLabel: row[2],
  steps: row[3],
  semitones: row[4],
  direction: row[5]
}));

const MODES = [
  { id: "read", label: "Read", icon: "\u2669" },
  { id: "listen", label: "Listen", icon: "\u266b" },
  { id: "sing", label: "Sing", icon: "\u25cf" }
];

const KEYS = [
  { name: "C major", tonicMidi: 48, names: ["C","D","E","F","G","A","B"], semis: [0,2,4,5,7,9,11] },
  { name: "G major", tonicMidi: 43, names: ["G","A","B","C","D","E","F\u266f"], semis: [0,2,4,5,7,9,11] },
  { name: "D major", tonicMidi: 50, names: ["D","E","F\u266f","G","A","B","C\u266f"], semis: [0,2,4,5,7,9,11] },
  { name: "F major", tonicMidi: 41, names: ["F","G","A","B\u266d","C","D","E"], semis: [0,2,4,5,7,9,11] },
  { name: "B\u266d major", tonicMidi: 46, names: ["B\u266d","C","D","E\u266d","F","G","A"], semis: [0,2,4,5,7,9,11] },
  { name: "E\u266d major", tonicMidi: 51, names: ["E\u266d","F","G","A\u266d","B\u266d","C","D"], semis: [0,2,4,5,7,9,11] },
  { name: "A major", tonicMidi: 45, names: ["A","B","C\u266f","D","E","F\u266f","G\u266f"], semis: [0,2,4,5,7,9,11] }
];

const RANGE_MAP = {
  low: [43, 67],
  middle: [48, 72],
  high: [55, 79]
};

const INTERVAL_OPTIONS = [...new Set(COURSE.map(stage => stage.label))];

const DEFAULT_STATE = {
  curriculumVersion: CURRICULUM_VERSION,
  settings: { clef: "treble", range: "middle", autoplay: true, practiceMode: "mixed", themeColor: "#5b4fe9" },
  progress: {},
  xp: 0,
  streak: 0,
  lastPlayedDate: null
};

let state = loadState();
applyThemeColor(state.settings.themeColor || "#5b4fe9", false);
let currentLesson = null;
let audioContext = null;
let mediaStream = null;
let activePlaybackSessions = new Set();

function ensureEnhancementUi() {
  const returnPathButton = document.getElementById("returnPathButton");
  if (returnPathButton && !document.getElementById("nextLevelButton")) {
    const nextLevelButton = document.createElement("button");
    nextLevelButton.id = "nextLevelButton";
    nextLevelButton.type = "button";
    nextLevelButton.className = "primary-button hidden";
    nextLevelButton.textContent = "Next level";
    returnPathButton.parentNode.insertBefore(nextLevelButton, returnPathButton);
  }

  if (!document.getElementById("assessmentEnhancementStyles")) {
    const style = document.createElement("style");
    style.id = "assessmentEnhancementStyles";
    style.textContent = `
      .test-out-button {
        min-height: 38px;
        margin-top: 10px;
        padding: 8px 13px;
        border: 2px solid var(--purple, #5b4fe9);
        border-radius: 13px;
        color: var(--purple, #5b4fe9);
        background: var(--purple-pale, #f0efff);
        font: inherit;
        font-size: 13px;
        font-weight: 900;
        cursor: pointer;
      }
      .test-out-button:hover { filter: brightness(.98); }
      .test-out-button:active { transform: translateY(1px); }
      #nextLevelButton.hidden { display: none; }

      .hero-card,
      .course-banner,
      [class*="hero"],
      [class*="banner"] {
        background: linear-gradient(135deg, var(--purple, #5b4fe9), #7568f4) !important;
        color: #fff !important;
      }
      .hero-card *,
      .course-banner *,
      [class*="hero"] *,
      [class*="banner"] * {
        color: inherit !important;
      }
    `;
    document.head.appendChild(style);
  }
}

ensureEnhancementUi();

function getLessonModeInfo(mode) {
  if (mode === "singPlus") return { id: "singPlus", label: "Sing +", icon: "○" };
  return MODES.find(item => item.id === mode) || { id: mode, label: String(mode || ""), icon: "" };
}

const els = Object.fromEntries([

  "pathView","lessonView","resultView","settingsView","pathway","xpValue","streakValue","progressText","progressFill",
  "homeButton","settingsButton","closeLessonButton","closeSettingsButton","saveSettingsButton","resetProgressButton",
  "lessonKicker","lessonPrompt","lessonSubprompt","notationArea","listenArea","singArea","replayButton","recordButton",
  "pitchFeedback","singTargetText","answerGrid","lessonMessage","continueButton","lessonProgressFill","scoreValue",
  "resultTitle","resultSummary","resultScore","resultXp","nextLevelButton","returnPathButton","retryButton","navPath","navPractice","navSettings",
  "themeColorInput"
].map(id => [id, document.getElementById(id)]));

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  return document.cookie.split("; ").find(row => row.startsWith(`${name}=`))?.split("=").slice(1).join("=") || null;
}

function migrateProgress(progress, version) {
  if (!progress || version === CURRICULUM_VERSION) return progress || {};

  // Version 2 used a different order and included compound intervals.
  // Map completed levels by musical meaning so existing learners keep valid progress.
  const oldToNewStage = {
    1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6,
    7: 9, 8: 10, 9: 7, 10: 8, 11: 11, 12: 12,
    13: 13, 14: 14, 19: 17, 20: 18, 21: 15, 22: 16,
    23: 19, 24: 20, 25: 21, 26: 22
  };
  const migrated = {};
  Object.entries(progress).forEach(([key, complete]) => {
    if (!complete) return;
    const match = key.match(/^(\d+)-(read|listen|sing)$/);
    if (!match) return;
    const newStage = oldToNewStage[Number(match[1])];
    if (newStage) migrated[`${newStage}-${match[2]}`] = true;
  });
  return migrated;
}

function loadState() {
  let raw = getCookie("sightTrailState");
  if (!raw) raw = localStorage.getItem("sightTrailState");
  if (!raw) return clone(DEFAULT_STATE);
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return {
      ...clone(DEFAULT_STATE),
      ...parsed,
      curriculumVersion: CURRICULUM_VERSION,
      settings: {
        ...DEFAULT_STATE.settings,
        ...(parsed.settings || {}),
        themeColor: /^#[0-9a-fA-F]{6}$/.test(parsed?.settings?.themeColor || "") ? parsed.settings.themeColor : DEFAULT_STATE.settings.themeColor
      },
      progress: migrateProgress(parsed.progress, parsed.curriculumVersion)
    };
  } catch {
    return clone(DEFAULT_STATE);
  }
}

function saveState() {
  const raw = JSON.stringify(state);
  setCookie("sightTrailState", raw);
  localStorage.setItem("sightTrailState", encodeURIComponent(raw));
}

function hexToRgb(hex) {
  const cleaned = String(hex || "").trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return [91, 79, 233];
  const n = parseInt(cleaned, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(rgb) {
  return `#${rgb.map(v => v.toString(16).padStart(2, "0")).join("")}`;
}

function mixHex(hexA, hexB, amount = 0.5) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const mix = a.map((v, i) => Math.round(v * (1 - amount) + b[i] * amount));
  return rgbToHex(mix);
}

function applyThemeColor(color, persist = true) {
  const base = /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#5b4fe9";
  const rgb = hexToRgb(base);
  const dark = mixHex(base, "#000000", 0.18);
  const light = mixHex(base, "#ffffff", 0.18);
  const pale = mixHex(base, "#ffffff", 0.90);
  document.documentElement.style.setProperty("--purple", base);
  document.documentElement.style.setProperty("--purple-rgb", rgb.join(", "));
  document.documentElement.style.setProperty("--purple-dark", dark);
  document.documentElement.style.setProperty("--purple-light", light);
  document.documentElement.style.setProperty("--purple-pale", pale);
  document.documentElement.style.setProperty("--shadow", `0 14px 35px rgba(${rgb.join(", ")}, 0.14)`);
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute("content", base);
  if (persist) {
    state.settings.themeColor = base;
    saveState();
  }
}

function stopPlaybackSession(session) {
  if (!session || session.stopped) return;
  session.stopped = true;
  if (session.timerId) clearTimeout(session.timerId);
  if (session.replayTimerId) clearTimeout(session.replayTimerId);
  if (session.nodes) {
    session.nodes.forEach(node => {
      try { node.stop?.(); } catch {}
      try { node.disconnect?.(); } catch {}
    });
  }
  activePlaybackSessions.delete(session);
}

function stopAllPlayback() {
  if (registerAnswer._playbackTimer) {
    clearTimeout(registerAnswer._playbackTimer);
    registerAnswer._playbackTimer = null;
  }
  els.replayButton?.classList.remove("playing");
  [...activePlaybackSessions].forEach(stopPlaybackSession);
}

function levelKey(stageId, mode) { return `${stageId}-${mode}`; }
function isComplete(stageId, mode) { return Boolean(state.progress[levelKey(stageId, mode)]); }

function levelIndex(stageId, mode) {
  return (stageId - 1) * MODES.length + MODES.findIndex(item => item.id === mode);
}

function firstIncompleteIndex() {
  for (let s = 1; s <= COURSE.length; s++) {
    for (const mode of MODES) if (!isComplete(s, mode.id)) return levelIndex(s, mode.id);
  }
  return COURSE.length * MODES.length;
}

function isUnlocked(stageId, mode) {
  return levelIndex(stageId, mode) <= firstIncompleteIndex();
}

function nextIncompleteLevel() {
  const index = firstIncompleteIndex();
  if (index >= COURSE.length * MODES.length) return null;
  const stageIndex = Math.floor(index / MODES.length);
  const modeIndex = index % MODES.length;
  return { stageId: COURSE[stageIndex].id, mode: MODES[modeIndex].id };
}

function canTestOutStage(stageId) {
  const next = nextIncompleteLevel();
  return Boolean(next && next.stageId === stageId);
}

function completedLevelCount() {
  return COURSE.reduce((count, stage) => count + MODES.filter(mode => isComplete(stage.id, mode.id)).length, 0);
}

function updateStats() {
  els.xpValue.textContent = state.xp;
  els.streakValue.textContent = state.streak;
  const completed = completedLevelCount();
  const total = COURSE.length * MODES.length;
  const percent = total ? Math.max(0, Math.min(100, Math.round((completed / total) * 100))) : 0;
  els.progressText.textContent = `${completed} of ${total} levels`;
  els.progressFill.style.width = `${percent}%`;
}

function renderPathway() {
  els.pathway.innerHTML = "";
  const current = firstIncompleteIndex();
  COURSE.forEach(stage => {
    const row = document.createElement("article");
    row.className = "stage-row";
    row.innerHTML = `<div class="stage-copy"><span>Stage ${stage.id}</span><strong>${stage.title}</strong></div><div class="stage-levels"></div>`;
    const copy = row.querySelector(".stage-copy");
    if (canTestOutStage(stage.id)) {
      const testOutButton = document.createElement("button");
      testOutButton.type = "button";
      testOutButton.className = "test-out-button";
      testOutButton.textContent = "Skip stage";
      testOutButton.title = "Pass a mixed Read, Listen and Sing assessment to complete all three levels.";
      testOutButton.addEventListener("click", () => startSkipAssessment(stage.id));
      copy.appendChild(testOutButton);
    }
    const levels = row.querySelector(".stage-levels");
    MODES.forEach(mode => {
      const button = document.createElement("button");
      const complete = isComplete(stage.id, mode.id);
      const unlocked = isUnlocked(stage.id, mode.id);
      const index = levelIndex(stage.id, mode.id);
      button.className = `level-node${complete ? " completed" : ""}${!unlocked ? " locked" : ""}${index === current ? " current" : ""}`;
      button.disabled = !unlocked;
      button.setAttribute("aria-label", `${stage.title}, ${mode.label}${complete ? ", complete" : unlocked ? ", available" : ", locked"}`);
      button.innerHTML = `<span class="node-icon">${unlocked ? mode.icon : "\ud83d\udd12"}</span><small>${mode.label}</small>`;
      button.addEventListener("click", () => startLesson(stage.id, mode.id));
      levels.appendChild(button);
    });
    els.pathway.appendChild(row);
  });
  updateStats();
}

function showView(id) {
  if (id !== "lessonView") {
    stopAllPlayback();
    stopMicrophone();
  }
  [els.pathView, els.lessonView, els.resultView, els.settingsView].forEach(view => view.classList.toggle("active", view.id === id));
  els.navPath.classList.toggle("active", id === "pathView");
  els.navPractice.classList.toggle("active", id === "lessonView" && currentLesson?.kind === "practice");
  els.navSettings.classList.toggle("active", id === "settingsView");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function buildScaleNotes(key) {
  const notes = [];
  for (let octaveShift = -2; octaveShift <= 4; octaveShift++) {
    key.names.forEach((name, degree) => {
      const midi = key.tonicMidi + octaveShift * 12 + key.semis[degree];
      const letter = name[0];
      const midiOctave = Math.floor(midi / 12) - 1;
      notes.push({ midi, name, letter, octave: midiOctave, degree, key: key.name });
    });
  }
  return notes.sort((a, b) => a.midi - b.midi);
}

function accidentalFor(delta) {
  if (delta > 0) return "\u266f".repeat(delta);
  if (delta < 0) return "\u266d".repeat(Math.abs(delta));
  return "";
}

function noteFromInterval(first, stage, referenceKey = first.key) {
  const letters = ["C", "D", "E", "F", "G", "A", "B"];
  const naturalPitchClass = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const targetDiatonic = diatonicIndex(first.letter, first.octave) + stage.steps * stage.direction;
  const letterPosition = ((targetDiatonic % 7) + 7) % 7;
  const octave = Math.floor(targetDiatonic / 7);
  const letter = letters[letterPosition];
  const midi = first.midi + stage.semitones * stage.direction;
  const naturalMidi = (octave + 1) * 12 + naturalPitchClass[letter];
  const accidental = accidentalFor(midi - naturalMidi);
  return { midi, name: `${letter}${accidental}`, letter, octave, key: referenceKey };
}

function makeQuestion(stage) {
  const [low, high] = RANGE_MAP[state.settings.range];
  const candidates = [];
  for (const key of KEYS) {
    for (const first of buildScaleNotes(key)) {
      if (first.midi < low || first.midi > high) continue;
      const second = noteFromInterval(first, stage, first.key);
      if (second.midi < low || second.midi > high) continue;
      candidates.push({ first, second, key: first.key });
    }
  }
  if (!candidates.length) {
    const oldRange = state.settings.range;
    state.settings.range = "middle";
    const question = makeQuestion(stage);
    state.settings.range = oldRange;
    return question;
  }
  const pair = candidates[Math.floor(Math.random() * candidates.length)];
  return { ...pair, key: pair.first.key, correct: stage.label, options: buildOptions(stage.label) };
}

function buildOptions(correct) {
  const distractors = shuffle(INTERVAL_OPTIONS.filter(item => item !== correct)).slice(0, 3);
  return shuffle([correct, ...distractors]);
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function primeAudio() {
  try { getAudioContext(); } catch { /* Audio is optional until the browser permits it. */ }
}

function startLesson(stageId, mode, retry = false) {
  if (!isUnlocked(stageId, mode) && !retry) return;
  stopAllPlayback();
  stopMicrophone();
  primeAudio();
  const stage = COURSE.find(item => item.id === stageId);
  currentLesson = {
    kind: "course",
    stage,
    mode,
    questionNumber: 0,
    score: 0,
    total: 5,
    answered: false,
    question: null
  };
  showView("lessonView");
  nextQuestion();
}

function completedStages() {
  return COURSE.filter(stage => MODES.every(mode => isComplete(stage.id, mode.id)));
}

function selectedPracticeModes() {
  return state.settings.practiceMode === "mixed"
    ? ["read", "listen", "sing", "singPlus"]
    : [state.settings.practiceMode];
}

function makePracticePlan() {
  const stages = shuffle(completedStages());
  if (!stages.length) return [];
  const modes = selectedPracticeModes();
  return stages.map(stage => ({
    stageId: stage.id,
    mode: modes[Math.floor(Math.random() * modes.length)]
  }));
}

function startPractice() {
  stopAllPlayback();
  stopMicrophone();
  const completed = completedStages();
  if (!completed.length) {
    window.alert("Complete Stage 1 before starting practice.");
    return;
  }
  primeAudio();
  const plan = makePracticePlan();
  currentLesson = {
    kind: "practice",
    plan,
    stage: null,
    mode: null,
    questionNumber: 0,
    score: 0,
    total: plan.length,
    answered: false,
    question: null
  };
  showView("lessonView");
  nextQuestion();
}

function uniqueStagesByLabel(stages) {
  const seen = new Set();
  return stages.filter(stage => {
    if (seen.has(stage.label)) return false;
    seen.add(stage.label);
    return true;
  });
}

function makeSkipAssessmentPlan(targetStage) {
  const plan = [];
  MODES.forEach(mode => {
    for (let i = 0; i < 3; i += 1) {
      plan.push({ stageId: targetStage.id, mode: mode.id, isTarget: true });
    }
  });
  return shuffle(plan);
}

function startSkipAssessment(stageId, retry = false) {
  if (!canTestOutStage(stageId) && !retry) return;
  stopAllPlayback();
  stopMicrophone();
  primeAudio();
  const targetStage = COURSE.find(stage => stage.id === stageId);
  const plan = makeSkipAssessmentPlan(targetStage);
  currentLesson = {
    kind: "skip",
    targetStage,
    plan,
    stage: null,
    mode: null,
    questionNumber: 0,
    score: 0,
    total: plan.length,
    answered: false,
    question: null
  };
  showView("lessonView");
  nextQuestion();
}

function nextQuestion() {
  if (!currentLesson) return;
  stopAllPlayback();
  if (currentLesson.questionNumber >= currentLesson.total) return finishLesson();
  if (currentLesson.kind !== "course") {
    const item = currentLesson.plan[currentLesson.questionNumber];
    currentLesson.stage = COURSE.find(stage => stage.id === item.stageId);
    currentLesson.mode = item.mode;
    currentLesson.currentPlanItem = item;
  }
  currentLesson.questionNumber += 1;
  currentLesson.answered = false;
  currentLesson.question = makeQuestion(currentLesson.stage);
  renderQuestion();
}

function renderQuestion() {
  const { stage, mode, questionNumber, total, score, question } = currentLesson;
  const modeInfo = getLessonModeInfo(mode);
  const isSingMode = mode === "sing" || mode === "singPlus";
  const headerPrefix = currentLesson.kind === "practice"
    ? `Practice · ${modeInfo.label}`
    : currentLesson.kind === "skip"
      ? `Skip assessment · ${modeInfo.label}`
      : `Stage ${stage.id} · ${modeInfo.label}`;
  els.lessonKicker.textContent = isSingMode ? `${headerPrefix} · ${stage.singularTitle}` : headerPrefix;
  els.lessonProgressFill.style.width = `${Math.max(0, Math.min(100, ((questionNumber - 1) / total) * 100))}%`;
  els.scoreValue.textContent = score;
  els.lessonMessage.textContent = "";
  els.lessonMessage.className = "lesson-message";
  els.continueButton.classList.add("hidden");
  els.answerGrid.innerHTML = "";
  els.notationArea.classList.add("hidden");
  els.listenArea.classList.add("hidden");
  els.singArea.classList.add("hidden");

  if (mode === "read") {
    els.lessonPrompt.textContent = "Which interval is shown?";
    els.lessonSubprompt.textContent = currentLesson.kind === "practice" ? "" : question.key;
    els.notationArea.classList.remove("hidden");
    els.notationArea.innerHTML = renderStaff([question.first, question.second], state.settings.clef, true, { showKeyLabel: currentLesson.kind !== "practice" });
    renderAnswerButtons();
  } else if (mode === "listen") {
    els.lessonPrompt.textContent = "Which interval do you hear?";
    els.lessonSubprompt.textContent = "Listen carefully";
    els.listenArea.classList.remove("hidden");
    renderAnswerButtons();
    clearTimeout(registerAnswer._playbackTimer);
    registerAnswer._playbackTimer = setTimeout(() => {
      registerAnswer._playbackTimer = null;
      playCurrentInterval();
    }, 250);
  } else if (mode === "sing") {
    els.lessonPrompt.textContent = "Sing the target note";
    els.lessonSubprompt.textContent = `Listen to the starting note, then sing the ${stage.singularTitle.toLowerCase()}.`;
    els.notationArea.classList.remove("hidden");
    els.notationArea.innerHTML = renderStaff([question.first], state.settings.clef, false, { showKeyLabel: currentLesson.kind !== "practice" });
    els.singArea.classList.remove("hidden");
    els.singTargetText.style.display = "";
    els.singTargetText.textContent = stage.singularTitle;
    els.recordButton.querySelector("strong").textContent = "Sing the target note";
    els.pitchFeedback.textContent = "Play the first note, then sing.";
  } else {
    els.lessonPrompt.textContent = "Sing the second note";
    els.lessonSubprompt.textContent = "Listen to the starting note, then sing the second note shown on the staff.";
    els.notationArea.classList.remove("hidden");
    els.notationArea.innerHTML = renderStaff([question.first, question.second], state.settings.clef, true, { showKeyLabel: currentLesson.kind !== "practice" });
    els.singArea.classList.remove("hidden");
    els.singTargetText.style.display = "none";
    els.singTargetText.textContent = "";
    els.recordButton.querySelector("strong").textContent = "Sing the second note";
    els.pitchFeedback.textContent = "Play the first note, then sing the second note shown.";
  }
}

function renderAnswerButtons() {

  currentLesson.question.options.forEach(option => {
    const button = document.createElement("button");
    button.className = "answer-button";
    button.textContent = option;
    button.addEventListener("click", () => answerChoice(option, button));
    els.answerGrid.appendChild(button);
  });
}

function answerChoice(option, button) {
  if (currentLesson.answered) return;
  currentLesson.answered = true;
  const correct = option === currentLesson.question.correct;
  [...els.answerGrid.children].forEach(child => {
    child.disabled = true;
    if (child.textContent === currentLesson.question.correct) child.classList.add("correct");
  });
  if (!correct) button.classList.add("incorrect");
  registerAnswer(correct, correct ? "Correct!" : `The answer is ${currentLesson.question.correct}.`);
}

function registerAnswer(correct, message) {
  if (correct) currentLesson.score += 1;
  els.scoreValue.textContent = currentLesson.score;
  els.lessonMessage.textContent = message;
  els.lessonMessage.className = `lesson-message ${correct ? "good" : "bad"}`;
  els.continueButton.textContent = currentLesson.questionNumber >= currentLesson.total ? "See results" : "Continue";
  els.continueButton.classList.remove("hidden");
  els.lessonProgressFill.style.width = `${Math.max(0, Math.min(100, (currentLesson.questionNumber / currentLesson.total) * 100))}%`;

  if (["read", "sing", "singPlus"].includes(currentLesson.mode)) {
    clearTimeout(registerAnswer._playbackTimer);
    registerAnswer._playbackTimer = setTimeout(() => {
      if (currentLesson?.question) playCurrentInterval();
    }, 350);
  }
}

function midiToFrequency(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

function getAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function playTone(midi, startOffset = 0, duration = 1.25) {
  const ctx = getAudioContext();
  const frequency = midiToFrequency(midi);
  const startTime = ctx.currentTime + startOffset;
  const attackTime = 0.07;
  const releaseTime = 0.22;
  const releaseStart = startTime + duration;
  const stopTime = releaseStart + releaseTime + 0.05;

  const session = { nodes: [], timerId: null, stopped: false };
  activePlaybackSessions.add(session);

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, startTime);
  envelope.gain.linearRampToValueAtTime(0.32, startTime + attackTime);
  envelope.gain.setValueAtTime(0.28, releaseStart);
  envelope.gain.exponentialRampToValueAtTime(0.0001, releaseStart + releaseTime);

  const harmonics = [
    { multiple: 1, level: 1.0 },
    { multiple: 3, level: 0.55 },
    { multiple: 5, level: 0.24 },
    { multiple: 7, level: 0.11 },
    { multiple: 9, level: 0.05 }
  ];
  const totalLevel = harmonics.reduce((sum, harmonic) => sum + harmonic.level, 0);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(5200, startTime);
  filter.Q.setValueAtTime(0.7, startTime);

  const vibrato = ctx.createOscillator();
  const vibratoDepth = ctx.createGain();
  vibrato.type = "sine";
  vibrato.frequency.setValueAtTime(5.2, startTime);
  vibratoDepth.gain.setValueAtTime(0, startTime);
  vibratoDepth.gain.linearRampToValueAtTime(2.5, startTime + 0.35);
  vibrato.connect(vibratoDepth);

  const oscillators = [];
  harmonics.forEach(({ multiple, level }) => {
    const oscillator = ctx.createOscillator();
    const harmonicGain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency * multiple, startTime);
    harmonicGain.gain.setValueAtTime(level / totalLevel, startTime);
    vibratoDepth.connect(oscillator.detune);
    oscillator.connect(harmonicGain);
    harmonicGain.connect(filter);
    oscillator.start(startTime);
    oscillator.stop(stopTime);
    oscillators.push(oscillator, harmonicGain);
  });

  filter.connect(envelope);
  envelope.connect(ctx.destination);
  vibrato.start(startTime);
  vibrato.stop(stopTime);

  session.nodes = [...oscillators, vibrato, vibratoDepth, filter, envelope];
  session.timerId = setTimeout(() => stopPlaybackSession(session), Math.max(1, (stopTime - ctx.currentTime) * 1000 + 20));
}

function playCurrentInterval() {
  if (!currentLesson?.question) return;
  stopAllPlayback();
  const q = currentLesson.question;
  if (currentLesson.mode === "listen") els.replayButton.classList.add("playing");

  const noteDuration = 1.25;
  const secondNoteStart = 1.45;
  playTone(q.first.midi, 0, noteDuration);
  playTone(q.second.midi, secondNoteStart, noteDuration);

  const playingTimer = setTimeout(() => els.replayButton.classList.remove("playing"), 2950);
  if (currentLesson.mode === "listen") {
    const group = { timerId: playingTimer, nodes: [], stopped: false };
    activePlaybackSessions.add(group);
  }
}

function renderStaff(notes, clef, showSecond, options = {}) {
  const showKeyLabel = options.showKeyLabel !== false;
  const width = 540;
  const staffTop = 72;
  const lineGap = 15;
  const bottomLineY = staffTop + 4 * lineGap;
  const baseDiatonic = clef === "treble" ? diatonicIndex("E", 4) : diatonicIndex("G", 2);
  const clefSymbol = clef === "treble" ? "\ud834\udd1e" : "\ud834\udd22";
  const xPositions = showSecond ? [240, 365] : [305];
  const plotted = notes.map((note, index) => ({
    note,
    x: xPositions[index],
    y: bottomLineY - (diatonicIndex(note.letter, note.octave) - baseDiatonic) * (lineGap / 2)
  }));
  const minNoteY = Math.min(...plotted.map(item => item.y));
  const maxNoteY = Math.max(...plotted.map(item => item.y));
  const viewTop = Math.min(0, minNoteY - 72);
  const viewBottom = Math.max(188, maxNoteY + 48);
  const height = viewBottom - viewTop;
  const lines = Array.from({ length: 5 }, (_, i) => `<line x1="92" y1="${staffTop + i * lineGap}" x2="485" y2="${staffTop + i * lineGap}" stroke="#45465a" stroke-width="2"/>`).join("");
  let ledger = "";
  let noteSvg = "";

  plotted.forEach(({ note, x, y }) => {
    for (let ly = bottomLineY + lineGap; ly <= y + 2; ly += lineGap) ledger += `<line x1="${x - 20}" y1="${ly}" x2="${x + 20}" y2="${ly}" stroke="#45465a" stroke-width="2"/>`;
    for (let ly = staffTop - lineGap; ly >= y - 2; ly -= lineGap) ledger += `<line x1="${x - 20}" y1="${ly}" x2="${x + 20}" y2="${ly}" stroke="#45465a" stroke-width="2"/>`;
    const accidental = note.name.slice(1);
    const stemUp = y > staffTop + 2 * lineGap;
    const stemX = stemUp ? x + 13 : x - 13;
    const stemY2 = stemUp ? y - 54 : y + 54;
    noteSvg += `${accidental ? `<text x="${x - 37}" y="${y + 8}" font-size="31" font-family="serif">${accidental}</text>` : ""}
      <ellipse cx="${x}" cy="${y}" rx="14" ry="10" transform="rotate(-18 ${x} ${y})" fill="#292a3b"/>
      <line x1="${stemX}" y1="${y}" x2="${stemX}" y2="${stemY2}" stroke="#292a3b" stroke-width="3"/>`;
  });

  return `<svg viewBox="0 ${viewTop} ${width} ${height}" role="img" aria-label="Music notation in ${clef} clef">
    ${showKeyLabel ? `<text x="30" y="38" fill="#767990" font-size="14" font-weight="800">${notes[0].key || currentLesson?.question?.key || ""}</text>` : ""}
    ${lines}${ledger}
    <text x="${clef === "treble" ? 80 : 112}" y="${clef === "treble" ? 118 : 139}" font-size="${clef === "treble" ? 156 : 80}" dominant-baseline="middle" font-family="serif" fill="#292a3b">${clefSymbol}</text>
    ${noteSvg}
  </svg>`;
}

function diatonicIndex(letter, octave) {
  const order = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  return octave * 7 + order[letter];
}

async function beginPitchCheck() {
  if (!currentLesson || currentLesson.answered) return;
  stopAllPlayback();
  const q = currentLesson.question;
  const isSingPlus = currentLesson.mode === "singPlus";
  const intervalLabel = currentLesson.stage.singularTitle;
  try {
    playTone(q.first.midi, 0, 1.25);
    els.pitchFeedback.textContent = "Listen to the starting note…";
    await delay(1550);
    els.recordButton.classList.add("recording");
    els.recordButton.querySelector("strong").textContent = isSingPlus ? "Listening…" : "Listening…";
    els.pitchFeedback.textContent = isSingPlus ? "Hold the second note steadily." : "Hold the target note steadily.";

    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const ctx = getAudioContext();
    const source = ctx.createMediaStreamSource(mediaStream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const buffer = new Float32Array(analyser.fftSize);
    const pitches = [];
    const started = performance.now();

    while (performance.now() - started < 2400) {
      analyser.getFloatTimeDomainData(buffer);
      const frequency = autoCorrelate(buffer, ctx.sampleRate);
      if (frequency > 60 && frequency < 1300) {
        const midi = 69 + 12 * Math.log2(frequency / 440);
        pitches.push(midi);
        els.pitchFeedback.innerHTML = "Pitch detected — <strong>keep holding it</strong>.";
      }
      await delay(70);
    }

    stopMicrophone();
    els.recordButton.classList.remove("recording");
    els.recordButton.querySelector("strong").textContent = isSingPlus ? "Sing the second note" : "Sing the target note";
    currentLesson.answered = true;

    if (pitches.length < 4) {
      registerAnswer(false, "I could not detect a steady note. Try again on the next question.");
      return;
    }

    const stable = pitches.sort((a, b) => a - b);
    const median = stable[Math.floor(stable.length / 2)];
    const target = q.second.midi;
    const signedCents = (median - target) * 100;
    const cents = Math.abs(signedCents);
    const sungNote = midiToNoteLabel(median);
    const targetNote = midiToNoteLabel(target);
    const correct = cents <= 55;

    if (correct) {
      els.pitchFeedback.innerHTML = isSingPlus
        ? `Correct — you sang <strong>${sungNote}</strong>. Interval type: <strong>${intervalLabel}</strong>.`
        : `Correct — you sang <strong>${sungNote}</strong>.`;
    } else {
      els.pitchFeedback.innerHTML = isSingPlus
        ? `Not quite — you sang <strong>${sungNote}</strong> instead of <strong>${targetNote}</strong>. Interval type: <strong>${intervalLabel}</strong>.`
        : `Not quite — you sang <strong>${sungNote}</strong> instead of <strong>${targetNote}</strong>.`;
    }

    registerAnswer(
      correct,
      isSingPlus
        ? (correct
            ? `Correct — you sang ${sungNote}. Interval type: ${intervalLabel}.`
            : `Not quite — you sang ${sungNote}, but the target was ${targetNote}. Interval type: ${intervalLabel}.`)
        : (correct
            ? `Correct — you sang ${sungNote}.`
            : `Not quite — you sang ${sungNote}, but the target was ${targetNote}.`)
    );
  } catch (error) {
    stopMicrophone();
    els.recordButton.classList.remove("recording");
    els.recordButton.querySelector("strong").textContent = currentLesson?.mode === "singPlus" ? "Sing the second note" : "Sing the target note";
    els.pitchFeedback.textContent = "Microphone access is needed for singing lessons.";
    els.lessonMessage.textContent = "Allow microphone access, then try again.";
    els.lessonMessage.className = "lesson-message bad";
  }
}

function midiToNoteLabel(midi) {

  const names = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  const note = names[((Math.round(midi) % 12) + 12) % 12];
  const octave = Math.floor(Math.round(midi) / 12) - 1;
  return `${note}${octave}`;
}

function stopMicrophone() {
  if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
  mediaStream = null;
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function autoCorrelate(buffer, sampleRate) {
  let rms = 0;
  for (const value of buffer) rms += value * value;
  rms = Math.sqrt(rms / buffer.length);
  if (rms < 0.012) return -1;

  let start = 0;
  let end = buffer.length - 1;
  const threshold = 0.2;
  for (let i = 0; i < buffer.length / 2; i++) if (Math.abs(buffer[i]) < threshold) { start = i; break; }
  for (let i = 1; i < buffer.length / 2; i++) if (Math.abs(buffer[buffer.length - i]) < threshold) { end = buffer.length - i; break; }
  const trimmed = buffer.slice(start, end);
  const correlations = new Array(trimmed.length).fill(0);
  for (let lag = 0; lag < trimmed.length; lag++) {
    for (let i = 0; i < trimmed.length - lag; i++) correlations[lag] += trimmed[i] * trimmed[i + lag];
  }
  let d = 0;
  while (d + 1 < correlations.length && correlations[d] > correlations[d + 1]) d++;
  let maxValue = -1;
  let maxPos = -1;
  for (let i = d; i < correlations.length; i++) {
    if (correlations[i] > maxValue) { maxValue = correlations[i]; maxPos = i; }
  }
  if (maxPos <= 0) return -1;
  return sampleRate / maxPos;
}

function finishLesson() {
  const isPractice = currentLesson.kind === "practice";
  const isSkip = currentLesson.kind === "skip";
  const passMark = (isPractice || isSkip) ? Math.ceil(currentLesson.total * 0.8) : 4;
  const passed = currentLesson.score >= passMark;
  let xpEarned;

  if (isPractice) {
    xpEarned = Math.max(2, currentLesson.score * 2);
    if (passed) updateStreak();
  } else if (isSkip) {
    xpEarned = passed ? 30 : Math.max(2, currentLesson.score);
    if (passed) {
      MODES.forEach(mode => {
        state.progress[levelKey(currentLesson.targetStage.id, mode.id)] = true;
      });
      updateStreak();
    }
  } else {
    const wasComplete = isComplete(currentLesson.stage.id, currentLesson.mode);
    xpEarned = passed ? (wasComplete ? 5 : 15) : Math.max(2, currentLesson.score);
    if (passed) {
      state.progress[levelKey(currentLesson.stage.id, currentLesson.mode)] = true;
      updateStreak();
    }
  }

  state.xp += xpEarned;
  saveState();
  currentLesson.passed = passed;
  currentLesson.nextLevel = passed ? nextIncompleteLevel() : null;

  if (isPractice) {
    els.resultTitle.textContent = passed ? "Practice complete!" : "Keep practising!";
    const intervalCount = new Set(currentLesson.plan.map(item => item.stageId)).size;
    els.resultSummary.textContent = `You reviewed ${intervalCount} interval stages across mixed Read, Listen and Sing questions.`;
  } else if (isSkip) {
    els.resultTitle.textContent = passed ? "Stage skipped!" : "Assessment not passed";
    els.resultSummary.textContent = passed
      ? `You tested out of all three levels in ${currentLesson.targetStage.title}.`
      : `Score at least ${passMark} out of ${currentLesson.total} to skip this stage.`;
  } else {
    els.resultTitle.textContent = passed ? "Excellent work!" : "Nearly there!";
    els.resultSummary.textContent = passed
      ? `You completed ${currentLesson.stage.title} \u00b7 ${MODES.find(mode => mode.id === currentLesson.mode).label}.`
      : "Score at least 4 out of 5 to unlock the next level.";
  }

  els.resultScore.textContent = `${currentLesson.score}/${currentLesson.total}`;
  els.resultXp.textContent = `+${xpEarned}`;
  document.getElementById("resultMascot").textContent = passed ? "\u2605" : "\u21bb";
  els.retryButton.textContent = isPractice
    ? "Practise again"
    : isSkip
      ? "Try assessment again"
      : passed ? "Practise again" : "Try again";
  els.nextLevelButton.classList.toggle("hidden", !currentLesson.nextLevel);
  showView("resultView");
  updateStats();
  renderPathway();
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function updateStreak() {
  const today = new Date();
  const dateKey = localDateKey(today);
  if (state.lastPlayedDate === dateKey) return;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = localDateKey(yesterday);
  state.streak = state.lastPlayedDate === yesterdayKey ? state.streak + 1 : 1;
  state.lastPlayedDate = dateKey;
}

function openSettings() {
  const clefInput = document.querySelector(`input[name="clef"][value="${state.settings.clef}"]`);
  const rangeInput = document.querySelector(`input[name="range"][value="${state.settings.range}"]`);
  if (clefInput) clefInput.checked = true;
  if (rangeInput) rangeInput.checked = true;

  const practiceMode = state.settings.practiceMode || "mixed";
  const practiceInput = document.querySelector(`input[name="practiceMode"][value="${practiceMode}"]`);
  if (practiceInput) practiceInput.checked = true;

  if (els.themeColorInput) els.themeColorInput.value = state.settings.themeColor || "#5b4fe9";
  showView("settingsView");
}

function saveSettings() {
  const clefChecked = document.querySelector('input[name="clef"]:checked');
  const rangeChecked = document.querySelector('input[name="range"]:checked');
  const practiceChecked = document.querySelector('input[name="practiceMode"]:checked');
  if (clefChecked) state.settings.clef = clefChecked.value;
  if (rangeChecked) state.settings.range = rangeChecked.value;
  if (practiceChecked) state.settings.practiceMode = practiceChecked.value;
  if (els.themeColorInput && /^#[0-9a-fA-F]{6}$/.test(els.themeColorInput.value)) state.settings.themeColor = els.themeColorInput.value;
  applyThemeColor(state.settings.themeColor || "#5b4fe9", true);
  saveState();
  showView("pathView");
}

function resetProgress() {

  const confirmed = window.confirm("Reset all course progress, XP and streak data on this browser?");
  if (!confirmed) return;
  state = clone(DEFAULT_STATE);
  saveState();
  renderPathway();
  openSettings();
}

els.homeButton.addEventListener("click", () => showView("pathView"));
els.settingsButton.addEventListener("click", openSettings);
els.navSettings.addEventListener("click", openSettings);
els.navPath.addEventListener("click", () => showView("pathView"));
els.navPractice.addEventListener("click", startPractice);
els.closeSettingsButton.addEventListener("click", () => showView("pathView"));
els.closeLessonButton.addEventListener("click", () => { stopMicrophone(); showView("pathView"); });
els.saveSettingsButton.addEventListener("click", saveSettings);
els.resetProgressButton.addEventListener("click", resetProgress);

if (els.themeColorInput) {
  els.themeColorInput.addEventListener("input", () => {
    const value = els.themeColorInput.value;
    applyThemeColor(value, false);
    state.settings.themeColor = value;
  });
  document.querySelectorAll(".theme-swatch").forEach(button => {
    button.addEventListener("click", () => {
      const value = button.dataset.themeColour || button.getAttribute("data-theme-colour");
      if (!value) return;
      els.themeColorInput.value = value;
      applyThemeColor(value, false);
      state.settings.themeColor = value;
    });
  });
}
els.replayButton.addEventListener("click", playCurrentInterval);
els.recordButton.addEventListener("click", beginPitchCheck);
els.continueButton.addEventListener("click", nextQuestion);
els.nextLevelButton.addEventListener("click", () => {
  const next = currentLesson?.nextLevel || nextIncompleteLevel();
  if (next) startLesson(next.stageId, next.mode);
  else showView("pathView");
});
els.returnPathButton.addEventListener("click", () => showView("pathView"));
els.retryButton.addEventListener("click", () => {
  if (currentLesson?.kind === "practice") startPractice();
  else if (currentLesson?.kind === "skip") startSkipAssessment(currentLesson.targetStage.id, true);
  else startLesson(currentLesson.stage.id, currentLesson.mode, true);
});

renderPathway();
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
