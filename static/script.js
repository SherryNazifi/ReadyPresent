// Show only one SPA page at a time
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p =>
    p.classList.remove("page-active")
  );
  document.getElementById(pageId).classList.add("page-active");
}

// Navigation buttons
const goAnalyzeBtn = document.getElementById("goAnalyzeBtn");
const restartBtn = document.getElementById("restartBtn");

// Video and audio elements
const video = document.getElementById("webcam");
const audio = document.getElementById("microphone");
const canvas = document.getElementById("captureCanvas");
const ctx = canvas.getContext("2d");

// Control buttons
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");

// Live metric elements
const eyeEl = document.getElementById("var-eye-score");
const wpmEl = document.getElementById("var-speechwpm");
const confEl = document.getElementById("var-confidence");
const circle = document.querySelector(".confidence-circle");
const circleScore = document.getElementById("circle-score");
const tipEl = document.getElementById("live-tip");

// Summary elements
const sumEye = document.getElementById("sum-eye");
const sumWpm = document.getElementById("sum-wpm");
const sumFillers = document.getElementById("sum-fillers");
const sumPauses = document.getElementById("sum-pauses");
const sumConf = document.getElementById("sum-confidence");
const sumAdvice = document.getElementById("sum-advice");

// Interval references for cleanup
let frameInterval = null;
let confidenceInterval = null;

// Capture webcam frame and send to backend for eye analysis
async function sendFrameForEyeScore() {
  if (!video.srcObject) return;

  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return;

  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(video, 0, 0, w, h);

  const dataURL = canvas.toDataURL("image/jpeg", 0.7);

  try {
    const res = await fetch("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataURL }),
    });

    const json = await res.json();
    eyeEl.innerText = json.eye_score ?? 0;
  } catch (e) {
    console.error("analyze error:", e);
  }
}

// Poll backend for updated confidence score
async function pollConfidence() {
  try {
    const res = await fetch("/confidence");
    const json = await res.json();

    const percent = Math.round(json.confidence);

    confEl.innerText = percent + "%";
    wpmEl.innerText = `${json.wpm} wpm`;

    if (json.eye_score != null) {
      eyeEl.innerText = json.eye_score;
    }

    // Update live tip based on performance
    if (tipEl) {
      if (json.eye_score < 50) {
        tipEl.innerText = "Look at the camera";
      } else if (json.wpm < 40) {
        tipEl.innerText = "Talk faster";
      } else if (json.wpm > 180) {
        tipEl.innerText = "Slow down";
      } else {
        tipEl.innerText = "Nice delivery";
      }
    }

    // Update circular progress visualization
    if (circle) {
      circle.style.background = `
        conic-gradient(
          #a6d6ff 0% ${percent}%,
          rgba(255,255,255,0.4) ${percent}% 100%
        )
      `;
    }

    if (circleScore) {
      circleScore.innerText = percent + "%";
    }

  } catch (e) {
    console.error("confidence error:", e);
  }
}

// Stop running intervals
function stopIntervals() {
  if (frameInterval) clearInterval(frameInterval);
  if (confidenceInterval) clearInterval(confidenceInterval);
  frameInterval = null;
  confidenceInterval = null;
}

// Generate summary advice based on final metrics
function renderAdvice(metrics) {
  const tips = [];

  if (metrics.eye_score < 60)
    tips.push("Try looking closer to the camera lens more often.");

  if (metrics.wpm > 180)
    tips.push("You are speaking fast. Add small pauses after key ideas.");

  if (metrics.wpm < 110)
    tips.push("Your pace is slow. Try a slightly faster delivery.");

  if (metrics.fillers > 6)
    tips.push("Reduce filler words by pausing instead of saying them.");

  if (metrics.pauses > 6)
    tips.push("Plan transitions to reduce excessive pauses.");

  if (tips.length === 0)
    tips.push("Nice delivery. Focus on clarity and strong closing.");

  return "• " + tips.join("\n• ");
}

// Navigation events
goAnalyzeBtn.addEventListener("click", () => {
  showPage("page-analyze");
});

restartBtn.addEventListener("click", () => {
  eyeEl.innerText = "0";
  wpmEl.innerText = "0 wpm";
  confEl.innerText = "0%";
  sumAdvice.innerText = "Press Stop to generate advice.";
  showPage("page-preview");
});

// Start analysis session
startBtn.addEventListener("click", async () => {
  stopIntervals();
  startSpeechToText();

  const status = document.getElementById("sessionStatus");
  if (status) status.innerText = "Recording...";

  frameInterval = setInterval(sendFrameForEyeScore, 400);
  confidenceInterval = setInterval(pollConfidence, 1000);
});

// Stop analysis session
stopBtn.addEventListener("click", async () => {
  stopIntervals();
  stopSpeechToText();

  const status = document.getElementById("sessionStatus");
  if (status) status.innerText = "Session ended";

  let metrics;

  try {
    const res = await fetch("/confidence");
    metrics = await res.json();
  } catch (e) {
    metrics = { eye_score: 0, wpm: 0, fillers: 0, pauses: 0, confidence: 0 };
  }

  sumEye.innerText = metrics.eye_score ?? 0;
  sumWpm.innerText = metrics.wpm ?? 0;
  sumFillers.innerText = metrics.fillers ?? 0;
  sumPauses.innerText = metrics.pauses ?? 0;
  sumConf.innerText = `${Math.round(metrics.confidence ?? 0)}%`;

  sumAdvice.innerText = renderAdvice(metrics);

  showPage("page-summary");
});

// Speech recognition state
let recognition = null;
let speechStartTime = null;
let finalTranscript = "";

// Multi-word fillers
const MULTI_FILLERS = [
  "you know",
  "i mean",
  "kind of",
  "sort of",
  "or something",
  "and stuff",
  "and things",
  "stuff like that",
  "things like that",
];

// Single-word fillers
const SINGLE_FILLERS = new Set([
  "um", "uh", "erm", "hmm",
  "basically", "actually", "literally",
  "honestly", "seriously",
  "well", "so",
]);

// Normalize text for analysis
function normalizeText(raw) {
  return (raw || "")
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Determine if "like" is used as filler
function isLikeFiller(prev, next) {
  const pronouns = new Set(["i", "we", "you", "they", "he", "she", "it"]);
  if (pronouns.has(prev)) return false;
  return true;
}

// Count filler words
function countFillers(rawText) {
  const t = normalizeText(rawText);
  if (!t) return 0;

  let count = 0;
  let working = ` ${t} `;

  for (const phrase of MULTI_FILLERS) {
    const re = new RegExp(`\\b${phrase.replace(/\s+/g, "\\s+")}\\b`, "g");
    const matches = working.match(re);
    if (matches) {
      count += matches.length;
      working = working.replace(re, " ");
    }
  }

  const tokens = working.trim().split(/\s+/);

  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i];
    if (w === "like") {
      if (isLikeFiller(tokens[i - 1], tokens[i + 1])) count++;
      continue;
    }
    if (SINGLE_FILLERS.has(w)) count++;
  }

  return count;
}

// Start speech recognition
function startSpeechToText() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert("SpeechRecognition not supported.");
    return;
  }

  if (recognition) return;

  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  speechStartTime = Date.now();
  finalTranscript = "";

  recognition.onresult = async (event) => {
    let interim = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const chunk = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalTranscript += chunk + " ";
      else interim += chunk;
    }

    const text = (finalTranscript + interim).trim();

    const words = text ? text.split(/\s+/).length : 0;
    const minutes = Math.max((Date.now() - speechStartTime) / 60000, 1 / 60);
    const wpm = Math.round(words / minutes);

    const fillerCount = countFillers(text);
    const pauseCount = 0;

    wpmEl.innerText = `${wpm} wpm`;

    try {
      await fetch("/speech_metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wpm,
          filler_word_count: fillerCount,
          pause_count: pauseCount,
          text
        })
      });
    } catch (e) {
      console.error("speech_metrics POST failed:", e);
    }
  };

  recognition.onerror = (e) => console.error(e);
  recognition.onend = () => {
    recognition = null;
  };

  recognition.start();
}

// Stop speech recognition
function stopSpeechToText() {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
}