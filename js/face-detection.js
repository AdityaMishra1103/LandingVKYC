// face-detection.js - Face Detection using face-api.js

let faceDetectionInitialized = false;
let detectionInterval = null;

// Liveness check state
let livenessChecks = {
    faceDetected: false,
    blinkDetected: false,
    turnedLeft: false,
    turnedRight: false
};

let previousEyeState = { left: true, right: true };
let headPoseHistory = [];

// Initialize face-api.js models
async function initializeFaceAPI() {
    if (faceDetectionInitialized) {
        return;
    }

    try {
        console.log('Loading face-api.js models...');
        
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
        
        // Load required models
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);

        faceDetectionInitialized = true;
        console.log('Face-api.js models loaded successfully');
        
        // Start detection after camera starts
        startFaceDetection();
        
    } catch (error) {
        console.error('Error loading face-api.js models:', error);
        console.log('Continuing without face detection...');
    }
}

// Start continuous face detection
function startFaceDetection() {
    const video = document.getElementById('videoElement');
    const canvas = document.getElementById('canvasElement');
    
    if (!video || !canvas) {
        console.error('Video or canvas element not found');
        return;
    }

    // Match canvas size to video
    const displaySize = { width: video.offsetWidth, height: video.offsetHeight };
    faceapi.matchDimensions(canvas, displaySize);

    // Run detection every 500ms
    detectionInterval = setInterval(async () => {
        if (!faceDetectionInitialized || !video.srcObject) {
            return;
        }

        try {
            const detections = await faceapi
                .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceExpressions();

            if (detections && detections.length > 0) {
                processDetections(detections, displaySize, canvas);
            } else {
                // No face detected
                updateLivenessCheck('faceDetected', false);
                clearCanvas(canvas);
            }
        } catch (error) {
            console.error('Detection error:', error);
        }
    }, 500);
}

// Process face detections
function processDetections(detections, displaySize, canvas) {
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    
    // Clear previous drawings
    clearCanvas(canvas);
    
    // Draw face detection box and landmarks
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

    // Get first detected face
    const detection = detections[0];
    const landmarks = detection.landmarks;
    
    // Update face detected status
    updateLivenessCheck('faceDetected', true);
    
    // Draw face overlay circle
    drawFaceOverlay(detection.detection.box);
    
    // Perform liveness checks
    checkBlink(landmarks);
    checkHeadPose(landmarks);
}

// Draw circular overlay on detected face
function drawFaceOverlay(box) {
    const overlay = document.getElementById('faceOverlay');
    if (!overlay) return;

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const radius = Math.max(box.width, box.height) / 1.5;

    overlay.style.left = `${centerX - radius}px`;
    overlay.style.top = `${centerY - radius}px`;
    overlay.style.width = `${radius * 2}px`;
    overlay.style.height = `${radius * 2}px`;
    overlay.style.display = 'block';
}

// Blink detection using eye aspect ratio
function checkBlink(landmarks) {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    
    const leftEAR = calculateEyeAspectRatio(leftEye);
    const rightEAR = calculateEyeAspectRatio(rightEye);
    
    const EAR_THRESHOLD = 0.2;
    
    const leftClosed = leftEAR < EAR_THRESHOLD;
    const rightClosed = rightEAR < EAR_THRESHOLD;
    
    // Detect blink (eyes were open, now closed, then open again)
    if (previousEyeState.left && previousEyeState.right && 
        leftClosed && rightClosed) {
        // Eyes just closed
        setTimeout(() => {
            if (!leftClosed && !rightClosed) {
                updateLivenessCheck('blinkDetected', true);
            }
        }, 200);
    }
    
    previousEyeState = { left: !leftClosed, right: !rightClosed };
}

// Calculate Eye Aspect Ratio (EAR)
function calculateEyeAspectRatio(eye) {
    // Get eye points
    const points = eye.map(p => ({ x: p.x, y: p.y }));
    
    // Calculate vertical distances
    const v1 = distance(points[1], points[5]);
    const v2 = distance(points[2], points[4]);
    
    // Calculate horizontal distance
    const h = distance(points[0], points[3]);
    
    // Calculate EAR
    const ear = (v1 + v2) / (2.0 * h);
    return ear;
}

// Head pose estimation
function checkHeadPose(landmarks) {
    const nose = landmarks.getNose();
    const jaw = landmarks.getJawOutline();
    
    // Get nose tip (center of nose)
    const noseTip = nose[3];
    
    // Get left and right jaw points
    const leftJaw = jaw[0];
    const rightJaw = jaw[16];
    
    // Calculate horizontal position relative to face width
    const faceWidth = distance(leftJaw, rightJaw);
    const noseToLeft = distance(noseTip, leftJaw);
    const noseToRight = distance(noseTip, rightJaw);
    
    const ratio = noseToLeft / faceWidth;
    
    // Add to history
    headPoseHistory.push(ratio);
    if (headPoseHistory.length > 10) {
        headPoseHistory.shift();
    }
    
    // Check for left turn (nose moves to left side)
    if (ratio < 0.4 && !livenessChecks.turnedLeft) {
        updateLivenessCheck('turnedLeft', true);
    }
    
    // Check for right turn (nose moves to right side)
    if (ratio > 0.6 && !livenessChecks.turnedRight) {
        updateLivenessCheck('turnedRight', true);
    }
}

// Calculate Euclidean distance between two points
function distance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// Update liveness check UI
function updateLivenessCheck(checkName, passed) {
    livenessChecks[checkName] = passed;
    
    const checkElements = {
        faceDetected: 'checkFaceDetected',
        blinkDetected: 'checkBlink',
        turnedLeft: 'checkTurnLeft',
        turnedRight: 'checkTurnRight'
    };
    
    const element = document.getElementById(checkElements[checkName]);
    if (element) {
        const statusSpan = element.querySelector('.check-status');
        if (passed) {
            statusSpan.textContent = '✅';
            element.style.background = '#d1fae5';
        } else {
            statusSpan.textContent = '⏳';
            element.style.background = 'white';
        }
    }
}

// Clear canvas
function clearCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Stop face detection
function stopFaceDetection() {
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }
    
    // Hide face overlay
    const overlay = document.getElementById('faceOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Get liveness check results
function getLivenessResults() {
    return {
        allPassed: Object.values(livenessChecks).every(check => check === true),
        checks: { ...livenessChecks }
    };
}

// Initialize when camera starts
document.addEventListener('DOMContentLoaded', () => {
    // Wait for video element to be ready
    const video = document.getElementById('videoElement');
    if (video) {
        video.addEventListener('loadeddata', () => {
            initializeFaceAPI();
        });
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopFaceDetection();
});