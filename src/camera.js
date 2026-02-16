/**
 * Camera module - handles access to the device camera via getUserMedia.
 */

let currentStream = null;
let facingMode = "environment"; // default to rear camera

/**
 * Start the camera and pipe it into the given <video> element.
 * @param {HTMLVideoElement} videoEl
 * @returns {Promise<MediaStream>}
 */
export async function startCamera(videoEl) {
  // Stop any existing stream first
  stopCamera(videoEl);

  const constraints = {
    video: {
      facingMode,
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  currentStream = stream;
  videoEl.srcObject = stream;
  await videoEl.play();
  return stream;
}

/**
 * Stop the current camera stream and clear the video element.
 * @param {HTMLVideoElement} videoEl
 */
export function stopCamera(videoEl) {
  if (currentStream) {
    for (const track of currentStream.getTracks()) {
      track.stop();
    }
    currentStream = null;
  }
  if (videoEl) {
    videoEl.srcObject = null;
  }
}

/**
 * Switch between front and rear cameras.
 * @param {HTMLVideoElement} videoEl
 * @returns {Promise<MediaStream>}
 */
export async function switchCamera(videoEl) {
  facingMode = facingMode === "environment" ? "user" : "environment";
  return startCamera(videoEl);
}

/**
 * Capture a still frame from the video element as a data URL.
 * @param {HTMLVideoElement} videoEl
 * @param {HTMLCanvasElement} overlayCanvas - the Three.js canvas to composite
 * @returns {string} data URL (image/png)
 */
export function captureFrame(videoEl, overlayCanvas) {
  const w = videoEl.videoWidth || videoEl.clientWidth;
  const h = videoEl.videoHeight || videoEl.clientHeight;

  const offscreen = document.createElement("canvas");
  offscreen.width = w;
  offscreen.height = h;
  const ctx = offscreen.getContext("2d");

  // Draw camera frame
  ctx.drawImage(videoEl, 0, 0, w, h);

  // Draw Three.js overlay on top
  if (overlayCanvas) {
    ctx.drawImage(overlayCanvas, 0, 0, w, h);
  }

  return offscreen.toDataURL("image/png");
}
