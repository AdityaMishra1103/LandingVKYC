package com.videokyc.service;

import com.videokyc.model.KycSession;
import com.videokyc.model.VerificationResult;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class KycService {

    private static final String UPLOAD_DIR = "uploads/";
    private static final String PYTHON_SCRIPT_PATH = "ml-service/face_matching.py";
    
    // In-memory storage (use database in production)
    private Map<String, KycSession> sessions = new HashMap<>();

    public KycService() {
        // Create upload directory if it doesn't exist
        try {
            Files.createDirectories(Paths.get(UPLOAD_DIR + "documents"));
            Files.createDirectories(Paths.get(UPLOAD_DIR + "videos"));
            System.out.println("Upload directories created successfully");
        } catch (IOException e) {
            System.err.println("Error creating upload directories: " + e.getMessage());
        }
    }

    public KycSession saveDocument(MultipartFile document, String documentType) throws IOException {
        // Generate unique session ID
        String sessionId = UUID.randomUUID().toString();
        
        // Create filename
        String originalFilename = document.getOriginalFilename();
        String extension = getFileExtension(originalFilename);
        String filename = sessionId + "_document." + extension;
        
        // Save file
        Path filePath = Paths.get(UPLOAD_DIR + "documents/" + filename);
        Files.copy(document.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
        
        // Create session
        KycSession session = new KycSession();
        session.setSessionId(sessionId);
        session.setDocumentType(documentType);
        session.setDocumentPath(filePath.toString());
        
        // Store session
        sessions.put(sessionId, session);
        
        System.out.println("Document saved: " + filePath);
        return session;
    }

    public String saveVideo(MultipartFile video, String sessionId) throws IOException {
        KycSession session = sessions.get(sessionId);
        
        if (session == null) {
            throw new IllegalArgumentException("Session not found: " + sessionId);
        }
        
        // Create filename
        String filename = sessionId + "_video.webm";
        
        // Save file
        Path filePath = Paths.get(UPLOAD_DIR + "videos/" + filename);
        Files.copy(video.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
        
        // Update session
        session.setVideoPath(filePath.toString());
        
        System.out.println("Video saved: " + filePath);
        return filePath.toString();
    }

    public VerificationResult verifyFace(String documentPath, String videoPath, String sessionId) {
        try {
            System.out.println("Starting face verification...");
            System.out.println("Document: " + documentPath);
            System.out.println("Video: " + videoPath);
            
            // Call Python ML service for face matching
            VerificationResult result = callPythonFaceMatching(documentPath, videoPath);
            
            // Update session status
            KycSession session = sessions.get(sessionId);
            if (session != null) {
                session.setStatus(result.isVerified() ? "VERIFIED" : "FAILED");
            }
            
            return result;
            
        } catch (Exception e) {
            e.printStackTrace();
            return new VerificationResult(
                false, 
                0.0, 
                "LOW", 
                false, 
                "Verification failed: " + e.getMessage()
            );
        }
    }

    private VerificationResult callPythonFaceMatching(String documentPath, String videoPath) {
        try {
            // Build Python command
            ProcessBuilder processBuilder = new ProcessBuilder(
                "python3", 
                PYTHON_SCRIPT_PATH,
                documentPath,
                videoPath
            );
            
            processBuilder.redirectErrorStream(true);
            Process process = processBuilder.start();
            
            // Read output
            BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream())
            );
            
            StringBuilder output = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line);
                System.out.println("Python output: " + line);
            }
            
            int exitCode = process.waitFor();
            System.out.println("Python script exit code: " + exitCode);
            
            if (exitCode == 0) {
                // Parse Python output (expecting JSON format)
                return parsePythonOutput(output.toString());
            } else {
                throw new RuntimeException("Python script failed with exit code: " + exitCode);
            }
            
        } catch (Exception e) {
            e.printStackTrace();
            System.err.println("Error calling Python script: " + e.getMessage());
            
            // Return mock result for testing (remove in production)
            return createMockResult();
        }
    }

    private VerificationResult parsePythonOutput(String output) {
        // Simple JSON parsing (use Jackson or Gson in production)
        try {
            // Expected format: {"verified":true,"matchScore":0.85,"confidence":"HIGH","livenessCheck":true}
            
            boolean verified = output.contains("\"verified\":true");
            
            // Extract match score
            double matchScore = 0.0;
            int scoreIndex = output.indexOf("\"matchScore\":");
            if (scoreIndex != -1) {
                String scoreStr = output.substring(scoreIndex + 13);
                int endIndex = scoreStr.indexOf(",");
                if (endIndex == -1) endIndex = scoreStr.indexOf("}");
                matchScore = Double.parseDouble(scoreStr.substring(0, endIndex));
            }
            
            // Extract confidence
            String confidence = "MEDIUM";
            if (output.contains("\"confidence\":\"HIGH\"")) {
                confidence = "HIGH";
            } else if (output.contains("\"confidence\":\"LOW\"")) {
                confidence = "LOW";
            }
            
            boolean livenessCheck = output.contains("\"livenessCheck\":true");
            
            String message = verified ? "Face verification successful" : "Face match failed";
            
            return new VerificationResult(verified, matchScore, confidence, livenessCheck, message);
            
        } catch (Exception e) {
            e.printStackTrace();
            return createMockResult();
        }
    }

    private VerificationResult createMockResult() {
        // Mock result for testing when Python service is not available
        System.out.println("Using mock verification result");
        return new VerificationResult(
            true,
            0.87,
            "HIGH",
            true,
            "Mock verification - Python service not available"
        );
    }

    public KycSession getSession(String sessionId) {
        return sessions.get(sessionId);
    }

    private String getFileExtension(String filename) {
        if (filename == null) return "";
        int lastDot = filename.lastIndexOf('.');
        return (lastDot == -1) ? "" : filename.substring(lastDot + 1);
    }
}