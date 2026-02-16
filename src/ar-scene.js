/**
 * AR Scene - Three.js scene that renders 3D objects on a transparent
 * background, overlaid on the camera feed.
 */

import * as THREE from "three";

let renderer, scene, camera;
let placedObjects = [];
let animationId = null;

// Device orientation tracking for AR effect
let deviceQuaternion = new THREE.Quaternion();
let orientationEnabled = false;

/**
 * Initialize the Three.js scene.
 * @param {HTMLCanvasElement} canvas
 */
export function initScene(canvas) {
  // Renderer with transparent background
  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Scene
  scene = new THREE.Scene();

  // Perspective camera
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1.5, 5);
  camera.lookAt(0, 0, 0);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  scene.add(directionalLight);

  // Ground plane (invisible but receives shadows/taps)
  const groundGeo = new THREE.PlaneGeometry(100, 100);
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.15 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.5;
  ground.receiveShadow = true;
  ground.name = "ground";
  scene.add(ground);

  // Handle resize
  window.addEventListener("resize", onResize);

  // Device orientation for AR camera movement
  enableDeviceOrientation();

  // Start render loop
  animate();
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function enableDeviceOrientation() {
  // Request permission on iOS 13+
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    DeviceOrientationEvent.requestPermission()
      .then((state) => {
        if (state === "granted") {
          window.addEventListener("deviceorientation", onDeviceOrientation);
          orientationEnabled = true;
        }
      })
      .catch(() => {});
  } else if (typeof DeviceOrientationEvent !== "undefined") {
    window.addEventListener("deviceorientation", onDeviceOrientation);
    orientationEnabled = true;
  }
}

function onDeviceOrientation(event) {
  if (event.alpha === null) return;

  const alpha = THREE.MathUtils.degToRad(event.alpha || 0);
  const beta = THREE.MathUtils.degToRad(event.beta || 0);
  const gamma = THREE.MathUtils.degToRad(event.gamma || 0);

  // Convert device orientation to quaternion
  const euler = new THREE.Euler(beta, alpha, -gamma, "YXZ");
  deviceQuaternion.setFromEuler(euler);
}

/**
 * Add a 3D object to the scene at a position relative to the camera.
 * @param {string} shape - "cube" | "sphere" | "cylinder" | "torus"
 * @param {string} color - hex color string
 * @param {object} [position] - optional {x, y, z}
 * @returns {THREE.Mesh}
 */
export function addObject(shape, color, position) {
  let geometry;

  switch (shape) {
    case "sphere":
      geometry = new THREE.SphereGeometry(0.4, 32, 32);
      break;
    case "cylinder":
      geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 32);
      break;
    case "torus":
      geometry = new THREE.TorusGeometry(0.35, 0.15, 16, 48);
      break;
    case "cube":
    default:
      geometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
      break;
  }

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.4,
    metalness: 0.3,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Place object in front of the camera if no position given
  if (position) {
    mesh.position.set(position.x, position.y, position.z);
  } else {
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(camera.quaternion);
    const spawnPos = camera.position.clone().add(dir.multiplyScalar(3));
    // Slight random offset to avoid exact overlap
    spawnPos.x += (Math.random() - 0.5) * 0.5;
    spawnPos.y = Math.max(spawnPos.y, -0.2);
    mesh.position.copy(spawnPos);
  }

  // Store creation time for animation
  mesh.userData.createdAt = performance.now();
  mesh.userData.shape = shape;

  scene.add(mesh);
  placedObjects.push(mesh);

  return mesh;
}

/**
 * Remove all placed objects from the scene.
 */
export function clearObjects() {
  for (const obj of placedObjects) {
    scene.remove(obj);
    obj.geometry.dispose();
    obj.material.dispose();
  }
  placedObjects = [];
}

/**
 * Get count of placed objects.
 */
export function getObjectCount() {
  return placedObjects.length;
}

/**
 * Main animation loop.
 */
function animate() {
  animationId = requestAnimationFrame(animate);

  const time = performance.now() * 0.001;

  // Apply device orientation to camera for AR feel
  if (orientationEnabled) {
    camera.quaternion.slerp(deviceQuaternion, 0.1);
  }

  // Animate placed objects - gentle floating and rotation
  for (const obj of placedObjects) {
    const age = (performance.now() - obj.userData.createdAt) * 0.001;

    // Gentle hover
    obj.position.y += Math.sin(time * 2 + age) * 0.0005;

    // Slow rotation
    obj.rotation.y += 0.005;

    // Scale-in animation on spawn
    if (age < 0.5) {
      const t = age / 0.5;
      const scale = t * t * (3 - 2 * t); // smoothstep
      obj.scale.setScalar(scale);
    }
  }

  renderer.render(scene, camera);
}

/**
 * Handle tap/click on the canvas for raycasting.
 * @param {number} clientX
 * @param {number} clientY
 * @returns {THREE.Mesh|null} the tapped object, if any
 */
export function raycastTap(clientX, clientY) {
  const mouse = new THREE.Vector2(
    (clientX / window.innerWidth) * 2 - 1,
    -(clientY / window.innerHeight) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(placedObjects);
  if (intersects.length > 0) {
    return intersects[0].object;
  }
  return null;
}

/**
 * Remove a specific object from the scene.
 * @param {THREE.Mesh} mesh
 */
export function removeObject(mesh) {
  scene.remove(mesh);
  mesh.geometry.dispose();
  mesh.material.dispose();
  placedObjects = placedObjects.filter((o) => o !== mesh);
}

/**
 * Clean up the scene.
 */
export function dispose() {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  window.removeEventListener("resize", onResize);
  window.removeEventListener("deviceorientation", onDeviceOrientation);
  clearObjects();
  if (renderer) {
    renderer.dispose();
  }
}
