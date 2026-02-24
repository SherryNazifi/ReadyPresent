
# ReadyPresent
AI-Powered Real-Time Presentation Confidence Coach

ReadyPresent is a full-stack AI system that analyzes live presentations and provides real-time feedback on delivery and speaking confidence. It combines computer vision and speech analysis to evaluate eye contact, pacing, and verbal habits, then generates a structured confidence score with actionable feedback.

---

## Overview

Public speaking performance depends not only on content, but also on delivery. Speakers often lack objective feedback on:

- Eye contact and engagement
- Speaking pace
- Filler word usage
- Overall confidence

ReadyPresent addresses this gap by analyzing webcam and microphone input in real time and computing a live confidence score.

---

## Features

- Real-time eye alignment detection using facial landmarks
- Live words-per-minute (WPM) calculation
- Context-aware filler word detection
- Weighted confidence scoring model
- Session summary with improvement advice
- Single-page application interface

---

## How It Works

### Eye Analysis

Webcam frames are sent to a FastAPI backend. MediaPipe Face Mesh extracts facial landmarks, and nose alignment relative to the screen center is used as a proxy for camera engagement. Exponential smoothing is applied to stabilize the score.

### Speech Analysis

The Web Speech API captures transcript data in real time. The system calculates:

- Words per minute (WPM)
- Filler word frequency
- Pause estimates

Filler detection includes both single-word and multi-word phrases, with contextual handling for ambiguous terms such as "like."

### Confidence Model

The overall confidence score is computed using a weighted formula:

Confidence =
0.4 × Eye Score
+ 0.25 × WPM Score
+ 0.2 × Filler Score
+ 0.15 × Pause Score

All components are normalized to a 0–100 scale.

---

## Architecture

Frontend:
- HTML/CSS single-page application
- Webcam frame capture
- Speech recognition
- Live metric updates

Backend:
- FastAPI
- OpenCV
- MediaPipe
- NumPy
- REST endpoints:
  - /analyze
  - /speech_metrics
  - /confidence

---

## Tech Stack

- Python
- FastAPI
- MediaPipe
- OpenCV
- NumPy
- Vanilla JavaScript
- Web Speech API
- HTML / CSS

---

## Running Locally

1. Install dependencies:

pip install -r requirements.txt

2. Start the server:

uvicorn main:app --reload

3. Open in browser:

http://127.0.0.1:8000

Allow webcam and microphone access when prompted.

---

## Future Improvements

- Advanced AI-generated presentation feedback
- Historical session tracking
- Confidence trend visualization
- Cloud deployment
- PDF session report export

---

## Authors

Shahrzad Nazifi, Joanna Liu, Jeng-Aun Chou, Chloe Le

UMass Amherst  
