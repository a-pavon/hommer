/**
 * Main entry point - wires up the camera, AR scene, and UI controls.
 */

import { startCamera, stopCamera, switchCamera, captureFrame } from "./camera.js";
import {
  initScene,
  addObject,
  clearObjects,
  getObjectCount,
  raycastTap,
  removeObject,
} from "./ar-scene.js";

// DOM elements
const videoEl = document.getElementById("camera-feed");
const canvasEl = document.getElementById("ar-canvas");
const uiOverlay = document.getElementById("ui-overlay");
const permissionScreen = document.getElementById("permission-screen");
const errorScreen = document.getElementById("error-screen");
const errorMessage = document.getElementById("error-message");

// Buttons
const btnGrantCamera = document.getElementById("btn-grant-camera");
const btnRetry = document.getElementById("btn-retry");
const btnClear = document.getElementById("btn-clear");
const btnScreenshot = document.getElementById("btn-screenshot");
const btnSwitchCamera = document.getElementById("btn-switch-camera");

// State
let selectedShape = "cube";
let selectedColor = "#ff4444";

// ── Camera initialization ───────────────────────────────────────────

async function initCamera() {
  try {
    await startCamera(videoEl);
    permissionScreen.classList.add("hidden");
    errorScreen.classList.add("hidden");
    uiOverlay.style.display = "block";
    initScene(canvasEl);
  } catch (err) {
    permissionScreen.classList.add("hidden");
    errorScreen.classList.remove("hidden");
    if (err.name === "NotAllowedError") {
      errorMessage.textContent =
        "Camera access was denied. Please grant permission in your browser settings and try again.";
    } else if (err.name === "NotFoundError") {
      errorMessage.textContent =
        "No camera found on this device.";
    } else {
      errorMessage.textContent =
        "Could not access the camera: " + err.message;
    }
  }
}

btnGrantCamera.addEventListener("click", initCamera);
btnRetry.addEventListener("click", initCamera);

// ── Shape selection ─────────────────────────────────────────────────

document.querySelectorAll(".shape-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelector(".shape-btn.active")?.classList.remove("active");
    btn.classList.add("active");
    selectedShape = btn.dataset.shape;
  });
});

// ── Color selection ─────────────────────────────────────────────────

document.querySelectorAll(".color-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelector(".color-btn.active")?.classList.remove("active");
    btn.classList.add("active");
    selectedColor = btn.dataset.color;
  });
});

// ── Tap to place / tap to delete ────────────────────────────────────

canvasEl.addEventListener("click", (e) => {
  // First check if we tapped an existing object
  const tapped = raycastTap(e.clientX, e.clientY);
  if (tapped) {
    // Double-tap detection for removal
    const now = Date.now();
    if (tapped.userData.lastTap && now - tapped.userData.lastTap < 400) {
      removeObject(tapped);
      showToast("Object removed");
      return;
    }
    tapped.userData.lastTap = now;
    return;
  }

  // Otherwise place a new object
  addObject(selectedShape, selectedColor);
  showToast(`${selectedShape} placed (${getObjectCount()} objects)`);
});

// Touch support for mobile
canvasEl.addEventListener("touchend", (e) => {
  if (e.changedTouches.length === 1) {
    const touch = e.changedTouches[0];
    const clickEvent = new MouseEvent("click", {
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
    canvasEl.dispatchEvent(clickEvent);
    e.preventDefault();
  }
});

// ── Bottom bar actions ──────────────────────────────────────────────

btnClear.addEventListener("click", () => {
  clearObjects();
  showToast("All objects cleared");
});

btnScreenshot.addEventListener("click", () => {
  const dataUrl = captureFrame(videoEl, canvasEl);

  // Trigger download
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `ar-capture-${Date.now()}.png`;
  link.click();

  showToast("Screenshot saved");
});

btnSwitchCamera.addEventListener("click", async () => {
  try {
    await switchCamera(videoEl);
    showToast("Camera switched");
  } catch {
    showToast("Could not switch camera");
  }
});

// ── Toast helper ────────────────────────────────────────────────────

function showToast(message) {
  // Remove existing toasts
  document.querySelectorAll(".toast").forEach((t) => t.remove());

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2000);
}
