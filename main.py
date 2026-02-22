from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import cv2
import mediapipe as mp
import numpy as np
import base64
from pathlib import Path

app = FastAPI()

# Serve static frontend files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Enable CORS for frontend-backend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent

# Store previous eye score for smoothing
prev_eye_score = 0.0

# Store latest speech metrics from frontend
latest_speech_metrics = {
    "wpm": 0,
    "filler_count": 0,
    "pause_count": 0,
    "transcript": ""
}

# Initialize MediaPipe face mesh model
mp_face = mp.solutions.face_mesh
face_mesh = mp_face.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    refine_landmarks=False,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

@app.get("/", response_class=HTMLResponse)
async def root():
    # Return main HTML layout
    return (BASE_DIR / "templates" / "layout.html").read_text(encoding="utf-8")


@app.post("/analyze")
async def analyze(data: dict):
    global prev_eye_score

    # Get base64 image string
    img = data.get("image")

    # Validate image input
    if not img or "," not in img:
        prev_eye_score = 0.0
        return {"eye_score": 0}

    # Extract base64 portion
    _, b64 = img.split(",", 1)

    try:
        image_bytes = base64.b64decode(b64)
    except Exception:
        prev_eye_score = 0.0
        return {"eye_score": 0}

    # Decode image into OpenCV frame
    np_array = np.frombuffer(image_bytes, np.uint8)
    frame = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

    if frame is None:
        prev_eye_score = 0.0
        return {"eye_score": 0}

    # Convert to RGB for MediaPipe processing
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = face_mesh.process(rgb)

    # If no face detected, reset score
    if not result.multi_face_landmarks:
        prev_eye_score = 0.0
        return {"eye_score": 0}

    # Use nose landmark to estimate alignment
    face = result.multi_face_landmarks[0]
    nose = face.landmark[1]

    height, width, _ = frame.shape
    nose_x = int(nose.x * width)
    nose_y = int(nose.y * height)

    center_x = width // 2
    center_y = height // 2

    diff_x = abs(nose_x - center_x)
    diff_y = abs(nose_y - center_y)

    # Horizontal alignment scoring
    if diff_x < 40:
        eye_score_x = 100
    elif diff_x < 80:
        eye_score_x = 60
    else:
        eye_score_x = 20

    # Vertical alignment scoring
    if diff_y < 40:
        eye_score_y = 100
    elif diff_y < 80:
        eye_score_y = 60
    else:
        eye_score_y = 20

    # Weighted combination
    raw_score = (0.6 * eye_score_x + 0.4 * eye_score_y)

    # Apply exponential smoothing
    smooth_score = 0.8 * prev_eye_score + 0.2 * raw_score
    prev_eye_score = smooth_score

    return {"eye_score": round(smooth_score, 2)}


@app.post("/speech_metrics")
async def speech_metrics(data: dict):
    # Store incoming speech metrics
    latest_speech_metrics["wpm"] = int(data.get("wpm", 0) or 0)
    latest_speech_metrics["filler_count"] = int(data.get("filler_word_count", 0) or 0)
    latest_speech_metrics["pause_count"] = int(data.get("pause_count", 0) or 0)
    latest_speech_metrics["transcript"] = data.get("text", "") or ""

    return {"status": "success"}


@app.get("/confidence")
async def confidence():
    # Retrieve latest metrics
    eye = float(prev_eye_score)
    wpm = int(latest_speech_metrics["wpm"])
    filler_count = int(latest_speech_metrics["filler_count"])
    pause_count = int(latest_speech_metrics["pause_count"])

    # Normalize speech metrics to 0-100 scale
    wpm_score = max(0, 100 - abs(150 - wpm))
    filler_score = max(0, 100 - filler_count * 5)
    pause_score = max(0, 100 - pause_count * 5)

    # Weighted confidence formula
    conf = (
        0.4 * eye +
        0.25 * wpm_score +
        0.2 * filler_score +
        0.15 * pause_score
    )

    return {
        "eye_score": round(eye, 2),
        "wpm": wpm,
        "fillers": filler_count,
        "pauses": pause_count,
        "confidence": round(conf, 2),
    }