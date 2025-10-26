
package com.videokyc.model;

import java.time.LocalDateTime;

// KycSession.java
public class KycSession {
    private String sessionId;
    private String documentType;
    private String documentPath;
    private String videoPath;
    private LocalDateTime createdAt;
    private String status;

    public KycSession() {
        this.createdAt = LocalDateTime.now();
        this.status = "PENDING";
    }

    // Getters and Setters
    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getDocumentType() {
        return documentType;
    }

    public void setDocumentType(String documentType) {
        this.documentType = documentType;
    }

    public String getDocumentPath() {
        return documentPath;
    }

    public void setDocumentPath(String documentPath) {
        this.documentPath = documentPath;
    }

    public String getVideoPath() {
        return videoPath;
    }

    public void setVideoPath(String videoPath) {
        this.videoPath = videoPath;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}

// VerificationResult.java
class VerificationResult {
    private boolean verified;
    private double matchScore;
    private String confidence;
    private boolean livenessCheck;
    private String message;

    public VerificationResult() {
    }

    public VerificationResult(boolean verified, double matchScore, String confidence, boolean livenessCheck, String message) {
        this.verified = verified;
        this.matchScore = matchScore;
        this.confidence = confidence;
        this.livenessCheck = livenessCheck;
        this.message = message;
    }

    // Getters and Setters
    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    public double getMatchScore() {
        return matchScore;
    }

    public void setMatchScore(double matchScore) {
        this.matchScore = matchScore;
    }

    public String getConfidence() {
        return confidence;
    }

    public void setConfidence(String confidence) {
        this.confidence = confidence;
    }

    public boolean isLivenessCheck() {
        return livenessCheck;
    }

    public void setLivenessCheck(boolean livenessCheck) {
        this.livenessCheck = livenessCheck;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}

// VerificationRequest.java
class VerificationRequest {
    private String sessionId;
    private String documentPath;
    private String videoPath;

    public VerificationRequest() {
    }

    // Getters and Setters
    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getDocumentPath() {
        return documentPath;
    }

    public void setDocumentPath(String documentPath) {
        this.documentPath = documentPath;
    }

    public String getVideoPath() {
        return videoPath;
    }

    public void setVideoPath(String videoPath) {
        this.videoPath = videoPath;
    }
}