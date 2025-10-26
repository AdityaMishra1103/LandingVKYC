// video-recording.js - Video Recording and Management

const API_BASE_URL = 'http://localhost:8080/api';

let videoStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let recordingStartTime = null;
let timerInterval = null;
let sessionId = null;

// Video elements
let videoElement = null;
let canvasElement = null;

// Recording state
let isRecording = false;
let recordingDuration = 0;
const MAX_RECORDING_DURATION = 30; // 30 seconds max

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeVideoRecording();
    checkSession();
});

function checkSession() {
    sessionId = sessionStorage.getItem('kycSessionId');
    if (!sessionId) {
        alert('No session found. Please upload document first.');
        window.location.href = 'upload.html';
    }
}

function initializeVideoRecording() {
    videoElement = document.getElementById('videoElement');
    canvasElement = document.getElementById('canvasElement');
}

async function startCamera() {
    try {
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user',
                frameRate: { ideal: 30 }
            },
            audio: true
        };

        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = videoStream;

        // Enable recording button after camera starts
        videoElement.onloadedmetadata = () => {
            document.getElementById('startCameraBtn').style.display = 'none';
            document.getElementById('startRecordingBtn').disabled = false;
            showStatusMessage('Camera started. Click "Start Recording" when ready.', 'success');
        };

    } catch (error) {
        console.error('Error accessing camera:', error);
        showStatusMessage('Cannot access camera. Please grant camera permissions.', 'error');
    }
}

function startRecording() {
    if (!videoStream) {
        showStatusMessage('Please start camera first', 'error');
        return;
    }

    try {
        recordedChunks = [];
        
        // Set up MediaRecorder
        const options = {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 2500000
        };

        // Fallback for browsers that don't support vp9
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/webm;codecs=vp8';
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm';
            }
        }

        mediaRecorder = new MediaRecorder(videoStream, options);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            handleRecordingComplete();
        };

        mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event);
            showStatusMessage('Recording error occurred', 'error');
        };

        // Start recording
        mediaRecorder.start(100); // Collect data every 100ms
        isRecording = true;
        recordingStartTime = Date.now();
        
        // Update UI
        document.getElementById('startRecordingBtn').style.display = 'none';
        document.getElementById('stopRecordingBtn').style.display = 'inline-flex';
        document.getElementById('recordingIndicator').style.display = 'flex';
        document.getElementById('timer').style.display = 'block';
        document.getElementById('instructions').style.display = 'none';
        document.getElementById('livenessChecks').style.display = 'block';

        // Start timer
        startTimer();

        // Auto-stop after max duration
        setTimeout(() => {
            if (isRecording) {
                stopRecording();
            }
        }, MAX_RECORDING_DURATION * 1000);

        showStatusMessage('Recording started...', 'loading');

    } catch (error) {
        console.error('Error starting recording:', error);
        showStatusMessage('Failed to start recording', 'error');
    }
}

function stopRecording() {
    if (!mediaRecorder || !isRecording) {
        return;
    }

    isRecording = false;
    mediaRecorder.stop();
    stopTimer();

    // Update UI
    document.getElementById('stopRecordingBtn').style.display = 'none';
    document.getElementById('recordingIndicator').style.display = 'none';
    document.getElementById('timer').style.display = 'none';
    document.getElementById('submitBtn').disabled = false;

    showStatusMessage('Recording completed! Click "Submit" to verify.', 'success');
}

function handleRecordingComplete() {
    if (recordedChunks.length === 0) {
        showStatusMessage('No recording data available', 'error');
        return;
    }

    // Create blob from recorded chunks
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    
    // Store blob for submission
    window.recordedVideoBlob = blob;
    
    console.log('Recording completed:', {
        size: blob.size,
        type: blob.type,
        duration: recordingDuration
    });
}

function startTimer() {
    recordingDuration = 0;
    const timerElement = document.getElementById('timer');
    
    timerInterval = setInterval(() => {
        recordingDuration++;
        const minutes = Math.floor(recordingDuration / 60);
        const seconds = recordingDuration % 60;
        timerElement.textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

async function submitForVerification() {
    if (!window.recordedVideoBlob) {
        showStatusMessage('No recording found. Please record a video first.', 'error');
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Processing...';
    
    showStatusMessage('Uploading video for verification...', 'loading');

    try {
        const formData = new FormData();
        formData.append('video', window.recordedVideoBlob, 'kyc-video.webm');
        formData.append('sessionId', sessionId);
        formData.append('duration', recordingDuration);

        const response = await fetch(`${API_BASE_URL}/upload-video`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        // Store video path
        sessionStorage.setItem('videoPath', result.videoPath);
        
        // Now trigger face verification
        await verifyFace(result.videoPath);

    } catch (error) {
        console.error('Submission error:', error);
        showStatusMessage('Submission failed. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit for Verification →';
    }
}

async function verifyFace(videoPath) {
    showStatusMessage('Verifying face match...', 'loading');

    try {
        const documentPath = sessionStorage.getItem('documentPath');
        
        const response = await fetch(`${API_BASE_URL}/verify-face`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: sessionId,
                documentPath: documentPath,
                videoPath: videoPath
            })
        });

        if (!response.ok) {
            throw new Error(`Verification failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        displayVerificationResult(result);

    } catch (error) {
        console.error('Verification error:', error);
        showStatusMessage('Verification failed. Please try again.', 'error');
        document.getElementById('submitBtn').disabled = false;
        document.getElementById('submitBtn').innerHTML = 'Submit for Verification →';
    }
}

function displayVerificationResult(result) {
    // Stop camera
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }

    // Create result display
    const resultHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="font-size: 80px; margin-bottom: 20px;">
                ${result.verified ? '✅' : '❌'}
            </div>
            <h2 style="color: ${result.verified ? '#10b981' : '#ef4444'}; margin-bottom: 20px;">
                ${result.verified ? 'Verification Successful!' : 'Verification Failed'}
            </h2>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <p><strong>Match Score:</strong> ${(result.matchScore * 100).toFixed(2)}%</p>
                <p><strong>Confidence:</strong> ${result.confidence}</p>
                <p><strong>Liveness Check:</strong> ${result.livenessCheck ? 'Passed' : 'Failed'}</p>
            </div>
            ${result.verified ? 
                '<p style="color: #059669;">Your identity has been successfully verified.</p>' :
                '<p style="color: #dc2626;">Face match failed. Please try again with better lighting.</p>'
            }
            <button onclick="window.location.href=\'index.html\'" class="btn-primary" style="margin-top: 30px;">
                Back to Home
            </button>
        </div>
    `;

    document.querySelector('.video-section').innerHTML = resultHTML;
}

function showStatusMessage(message, type) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = 'block';
}

function goBack() {
    // Stop camera if active
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
    window.location.href = 'upload.html';
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
    if (timerInterval) {
        clearInterval(timerInterval);
    }
});