// upload.js - Document Upload Handler

const API_BASE_URL = 'http://localhost:8080/api';
let selectedFile = null;
let selectedDocType = 'aadhaar';

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeUpload();
});

function initializeUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    
    // Click to upload
    uploadPlaceholder.addEventListener('click', () => {
        fileInput.click();
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#4F46E5';
        uploadArea.style.background = '#EEF2FF';
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#CBD5E1';
        uploadArea.style.background = '#F9FAFB';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#CBD5E1';
        uploadArea.style.background = '#F9FAFB';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Document type selection
    const docTypeInputs = document.querySelectorAll('input[name="docType"]');
    docTypeInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            selectedDocType = e.target.value;
            console.log('Selected document type:', selectedDocType);
        });
    });
}

function handleFile(file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
        showStatus('Please upload a valid image file (JPG, JPEG, or PNG)', 'error');
        return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
        showStatus('File size must be less than 5MB', 'error');
        return;
    }

    selectedFile = file;
    displayPreview(file);
    document.getElementById('nextBtn').disabled = false;
}

function displayPreview(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const previewImage = document.getElementById('previewImage');
        const uploadPlaceholder = document.getElementById('uploadPlaceholder');
        const uploadPreview = document.getElementById('uploadPreview');
        
        previewImage.src = e.target.result;
        uploadPlaceholder.style.display = 'none';
        uploadPreview.style.display = 'block';
    };
    
    reader.readAsDataURL(file);
}

function removeImage() {
    selectedFile = null;
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const uploadPreview = document.getElementById('uploadPreview');
    const fileInput = document.getElementById('fileInput');
    
    uploadPlaceholder.style.display = 'block';
    uploadPreview.style.display = 'none';
    fileInput.value = '';
    document.getElementById('nextBtn').disabled = true;
}

async function uploadDocument() {
    if (!selectedFile) {
        showStatus('Please select a document to upload', 'error');
        return;
    }

    const nextBtn = document.getElementById('nextBtn');
    nextBtn.disabled = true;
    nextBtn.innerHTML = '⏳ Uploading...';
    
    showStatus('Uploading document...', 'loading');

    try {
        const formData = new FormData();
        formData.append('document', selectedFile);
        formData.append('documentType', selectedDocType);

        const response = await fetch(`${API_BASE_URL}/upload-document`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        // Store session ID and document info
        sessionStorage.setItem('kycSessionId', result.sessionId);
        sessionStorage.setItem('documentType', selectedDocType);
        sessionStorage.setItem('documentPath', result.documentPath);
        
        showStatus('Document uploaded successfully! Redirecting...', 'success');
        
        // Redirect to video page after 1.5 seconds
        setTimeout(() => {
            window.location.href = 'video-kyc.html';
        }, 1500);
        
    } catch (error) {
        console.error('Upload error:', error);
        showStatus('Upload failed. Please try again.', 'error');
        nextBtn.disabled = false;
        nextBtn.innerHTML = 'Next: Video Recording →';
    }
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }
}

function goBack() {
    window.location.href = 'index.html';
}

// Utility function to get file extension
function getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
}

// Utility function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}