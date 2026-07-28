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
  settings: { clef: "treble", range: "middle", autoplay: true, themeColor: "#5b4fe9", practiceMode: "mixed" },
  progress: {},
  xp: 0,
  streak: 0,
  lastPlayedDate: null
};

let state = loadState();
let currentLesson = null;
let audioContext = null;
let mediaStream = null;

function normaliseHexColour(value) {
  const match = String(value || "").trim().match(/^#([0-9a-f]{6})$/i);
  return match ? `#${match[1].toLowerCase()}` : DEFAULT_STATE.settings.themeColor;
}

function hexToRgb(hex) {
  const clean = normaliseHexColour(hex).slice(1);
  return [0, 2, 4].map(index => Number.parseInt(clean.slice(index, index + 2), 16));
}

function mixHex(hex, target, amount) {
  const sourceRgb = hexToRgb(hex);
  const targetRgb = hexToRgb(target);
  const mixed = sourceRgb.map((value, index) => Math.round(value + (targetRgb[index] - value) * amount));
  return `#${mixed.map(value => value.toString(16).padStart(2, "0")).join("")}`;
}

function applyTheme(colour) {
  const main = normaliseHexColour(colour);
  const rgb = hexToRgb(main);
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--purple", main);
  rootStyle.setProperty("--purple-dark", mixHex(main, "#000000", 0.25));
  rootStyle.setProperty("--purple-light", mixHex(main, "#ffffff", 0.22));
  rootStyle.setProperty("--purple-pale", mixHex(main, "#ffffff", 0.9));
  rootStyle.setProperty("--purple-rgb", rgb.join(", "));
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", main);
}

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
    `;
    document.head.appendChild(style);
  }
}

ensureEnhancementUi();

const els = Object.fromEntries([
  "pathView","lessonView","resultView","settingsView","pathway","xpValue","streakValue","progressText","progressFill",
  "homeButton","settingsButton","closeLessonButton","closeSettingsButton","saveSettingsButton","resetProgressButton",
  "lessonKicker","lessonPrompt","lessonSubprompt","notationArea","listenArea","singArea","replayButton","recordButton",
  "pitchFeedback","singTargetText","answerGrid","lessonMessage","continueButton","lessonProgressFill","scoreValue",
  "resultTitle","resultSummary","resultScore","resultXp","nextLevelButton","returnPathButton","retryButton","navPath","navPractice","navSettings",
  "autoplayToggle","themeColorInput"
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
      settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
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

applyTheme(state.settings.themeColor);

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
  els.progressText.textContent = `${completed} of ${total} levels`;
  els.progressFill.style.width = `${(completed / total) * 100}%`;
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
      testOutButton.title = "Pass Read, Listen and Sing questions for this stage to complete all three levels.";
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

function noteFromInterval(first, stage) {
  const letters = ["C", "D", "E", "F", "G", "A", "B"];
  const naturalPitchClass = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const targetDiatonic = diatonicIndex(first.letter, first.octave) + stage.steps * stage.direction;
  const letterPosition = ((targetDiatonic % 7) + 7) % 7;
  const octave = Math.floor(targetDiatonic / 7);
  const letter = letters[letterPosition];
  const midi = first.midi + stage.semitones * stage.direction;
  const naturalMidi = (octave + 1) * 12 + naturalPitchClass[letter];
  const accidental = accidentalFor(midi - naturalMidi);
  return { midi, name: `${letter}${accidental}`, letter, octave, key: first.key };
}

function makeQuestion(stage) {
  const [low, high] = RANGE_MAP[state.settings.range];
  const candidates = [];
  for (const key of KEYS) {
    for (const first of buildScaleNotes(key)) {
      if (first.midi < low || first.midi > high) continue;
      const second = noteFromInterval(first, stage);
      if (second.midi < low || second.midi > high) continue;
      candidates.push({ first, second, key: key.name });
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
  return { ...pair, correct: stage.label, options: buildOptions(stage.label) };
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

function introducedStages() {
  const currentStage = Math.min(Math.floor(firstIncompleteIndex() / MODES.length) + 1, COURSE.length);
  return COURSE.slice(0, currentStage);
}

function makePracticePlan(practiceMode = state.settings.practiceMode) {
  const stages = shuffle(introducedStages());
  const plannedStages = [...stages];
  while (plannedStages.length < 6) {
    plannedStages.push(stages[Math.floor(Math.random() * stages.length)]);
  }

  if (practiceMode !== "mixed") {
    const selectedMode = MODES.some(mode => mode.id === practiceMode) ? practiceMode : "read";
    return plannedStages.map(stage => ({ stageId: stage.id, mode: selectedMode }));
  }

  const modes = [];
  while (modes.length < plannedStages.length) modes.push(...shuffle(MODES.map(mode => mode.id)));
  return plannedStages.map((stage, index) => ({ stageId: stage.id, mode: modes[index] }));
}

function startPractice() {
  primeAudio();
  const practiceMode = state.settings.practiceMode || "mixed";
  const plan = makePracticePlan(practiceMode);
  currentLesson = {
    kind: "practice",
    practiceMode,
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

function makeSkipAssessmentPlan(targetStage) {
  // A skip assessment tests only the current stage. Each mode appears three
  // times, giving nine questions without introducing later intervals.
  const plan = [];
  MODES.forEach(mode => {
    for (let question = 0; question < 3; question += 1) {
      plan.push({ stageId: targetStage.id, mode: mode.id });
    }
  });
  return shuffle(plan);
}

function startSkipAssessment(stageId, retry = false) {
  if (!canTestOutStage(stageId) && !retry) return;
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
  const modeInfo = MODES.find(item => item.id === mode);
  const isIntervalIdentification = mode === "read" || mode === "listen";

  if (isIntervalIdentification) {
    els.lessonKicker.textContent = currentLesson.kind === "practice"
      ? `Practice · ${modeInfo.label}`
      : currentLesson.kind === "skip"
        ? `Skip assessment · ${modeInfo.label}`
        : `Stage ${stage.id} · ${modeInfo.label}`;
  } else {
    els.lessonKicker.textContent = currentLesson.kind === "practice"
      ? `Practice · ${modeInfo.label} · ${stage.singularTitle}`
      : currentLesson.kind === "skip"
        ? `Skip assessment · ${modeInfo.label} · ${stage.singularTitle}`
        : `Stage ${stage.id} · ${modeInfo.label}`;
  }

  els.lessonProgressFill.style.width = `${((questionNumber - 1) / total) * 100}%`;
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
    els.lessonSubprompt.textContent = question.key;
    els.notationArea.classList.remove("hidden");
    els.notationArea.innerHTML = renderStaff([question.first, question.second], state.settings.clef, true);
    renderAnswerButtons();
    if (state.settings.autoplay) setTimeout(playCurrentInterval, 250);
  } else if (mode === "listen") {
    els.lessonPrompt.textContent = "Which interval do you hear?";
    els.lessonSubprompt.textContent = "Listen carefully";
    els.listenArea.classList.remove("hidden");
    renderAnswerButtons();
    if (state.settings.autoplay) setTimeout(playCurrentInterval, 250);
  } else {
    els.lessonPrompt.textContent = "Sing the target note";
    els.lessonSubprompt.textContent = `Listen to the starting note, then sing the ${stage.singularTitle.toLowerCase()}.`;
    els.notationArea.classList.remove("hidden");
    els.notationArea.innerHTML = renderStaff([question.first], state.settings.clef, false);
    els.singArea.classList.remove("hidden");
    els.singTargetText.textContent = stage.singularTitle;
    els.pitchFeedback.textContent = "Play the first note, then sing.";
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
  els.lessonProgressFill.style.width = `${(currentLesson.questionNumber / currentLesson.total) * 100}%`;
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
  });

  filter.connect(envelope);
  envelope.connect(ctx.destination);
  vibrato.start(startTime);
  vibrato.stop(stopTime);
}

function playCurrentInterval() {
  if (!currentLesson?.question) return;
  const q = currentLesson.question;
  if (currentLesson.mode === "listen") els.replayButton.classList.add("playing");

  const noteDuration = 1.25;
  const secondNoteStart = 1.45;
  playTone(q.first.midi, 0, noteDuration);
  playTone(q.second.midi, secondNoteStart, noteDuration);

  setTimeout(() => els.replayButton.classList.remove("playing"), 2950);
}

function renderStaff(notes, clef, showSecond) {
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
    <text x="30" y="38" fill="#767990" font-size="14" font-weight="800">${notes[0].key || currentLesson?.question?.key || ""}</text>
    ${lines}${ledger}
    <text
      x="${clef === "treble" ? 102 : 108}"
      y="${clef === "treble" ? bottomLineY + 4 : bottomLineY - 1}"
      font-size="${clef === "treble" ? 92 : 72}"
      font-family="'Noto Music', 'Apple Symbols', 'Segoe UI Symbol', 'Bravura Text', serif"
      fill="#292a3b"
    >${clefSymbol}</text>
    ${noteSvg}
  </svg>`;
}

function diatonicIndex(letter, octave) {
  const order = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  return octave * 7 + order[letter];
}

async function beginPitchCheck() {
  if (!currentLesson || currentLesson.answered) return;
  const q = currentLesson.question;
  try {
    playTone(q.first.midi, 0, 1.25);
    els.pitchFeedback.textContent = "Listen to the starting note\u2026";
    await delay(1550);
    els.recordButton.classList.add("recording");
    els.recordButton.querySelector("strong").textContent = "Listening\u2026";
    els.pitchFeedback.textContent = "Hold the target note steadily.";

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
    els.recordButton.querySelector("strong").textContent = "Sing the target note";
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
    const correct = cents <= 55;
    if (correct) {
      els.pitchFeedback.innerHTML = "Your pitch was <strong>in tune</strong>.";
    } else {
      const tendency = signedCents > 0 ? "sharp" : "flat";
      els.pitchFeedback.innerHTML = `Your pitch was <strong>${Math.round(cents)} cents ${tendency}</strong>.`;
    }
    registerAnswer(correct, correct ? "Great pitch! That is the target note." : "Close — listen again and adjust towards the target pitch.");
  } catch (error) {
    stopMicrophone();
    els.recordButton.classList.remove("recording");
    els.recordButton.querySelector("strong").textContent = "Sing the target note";
    els.pitchFeedback.textContent = "Microphone access is needed for singing lessons.";
    els.lessonMessage.textContent = "Allow microphone access, then try again.";
    els.lessonMessage.className = "lesson-message bad";
  }
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
    const practiceDescription = currentLesson.practiceMode === "mixed"
      ? "across mixed Read, Listen and Sing questions"
      : `using ${MODES.find(mode => mode.id === currentLesson.practiceMode)?.label || "Read"} questions only`;
    els.resultSummary.textContent = `You reviewed ${intervalCount} interval stages ${practiceDescription}.`;
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
  document.querySelector(`input[name="clef"][value="${state.settings.clef}"]`).checked = true;
  document.querySelector(`input[name="range"][value="${state.settings.range}"]`).checked = true;
  const practiceMode = MODES.some(mode => mode.id === state.settings.practiceMode) || state.settings.practiceMode === "mixed"
    ? state.settings.practiceMode
    : "mixed";
  document.querySelector(`input[name="practiceMode"][value="${practiceMode}"]`).checked = true;
  els.autoplayToggle.checked = state.settings.autoplay;
  els.themeColorInput.value = normaliseHexColour(state.settings.themeColor);
  showView("settingsView");
}

function saveSettings() {
  state.settings.clef = document.querySelector('input[name="clef"]:checked').value;
  state.settings.range = document.querySelector('input[name="range"]:checked').value;
  state.settings.autoplay = els.autoplayToggle.checked;
  state.settings.practiceMode = document.querySelector('input[name="practiceMode"]:checked').value;
  state.settings.themeColor = normaliseHexColour(els.themeColorInput.value);
  applyTheme(state.settings.themeColor);
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

document.querySelectorAll("[data-theme-colour]").forEach(button => {
  button.addEventListener("click", () => {
    els.themeColorInput.value = button.dataset.themeColour;
  });
});

renderPathway();
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js?v=11", { updateViaCache: "none" }).catch(() => {});
}
