// Wait until DOM is fully loaded before accessing elements
document.addEventListener("DOMContentLoaded", function () {

  // Video and audio elements
  const video = document.getElementById("webcam");
  const audio = document.getElementById("microphone");

  // Control buttons
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  // Store active media streams
  let videoStream = null;
  let audioStream = null;

  // Request webcam and microphone access
  async function startInput() {
    try {
      // Request video stream
      videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (video) video.srcObject = videoStream;
    } catch (err) {
      console.error("Webcam error:", err);
      alert("Please allow webcam access.");
    }

    try {
      // Request audio stream
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (audio) audio.srcObject = audioStream;
    } catch (err) {
      console.error("Microphone error:", err);
      alert("Please allow microphone access.");
    }
  }

  // Stop all active media tracks
  function stopInput() {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      if (video) video.srcObject = null;
      videoStream = null;
    }

    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      if (audio) audio.srcObject = null;
      audioStream = null;
    }
  }

  // Attach button event listeners if buttons exist
  if (startBtn) startBtn.addEventListener("click", startInput);
  if (stopBtn) stopBtn.addEventListener("click", stopInput);

});