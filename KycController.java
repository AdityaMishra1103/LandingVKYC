package com.videokyc.controller;

import com.videokyc.model.KycSession;
import com.videokyc.model.VerificationRequest;
import com.videokyc.model.VerificationResult;
import com.videokyc.service.KycService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class KycController {

    @Autowired
    private KycService kycService;

    @PostMapping("/upload-document")
    public ResponseEntity<?> uploadDocument(
            @RequestParam("document") MultipartFile document,
            @RequestParam("documentType") String documentType) {
        
        try {
            System.out.println("Received document upload request");
            System.out.println("Document type: " + documentType);
            System.out.println("File size: " + document.getSize());
            
            // Validate file
            if (document.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("No file uploaded"));
            }

            // Validate document type
            String contentType = document.getContentType();
            if (!isValidImageType(contentType)) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("Invalid file type. Only JPG, JPEG, PNG allowed"));
            }

            // Save document and create session
            KycSession session = kycService.saveDocument(document, documentType);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("sessionId", session.getSessionId());
            response.put("documentPath", session.getDocumentPath());
            response.put("message", "Document uploaded successfully");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Upload failed: " + e.getMessage()));
        }
    }

    @PostMapping("/upload-video")
    public ResponseEntity<?> uploadVideo(
            @RequestParam("video") MultipartFile video,
            @RequestParam("sessionId") String sessionId,
            @RequestParam("duration") int duration) {
        
        try {
            System.out.println("Received video upload request");
            System.out.println("Session ID: " + sessionId);
            System.out.println("Video size: " + video.getSize());
            System.out.println("Duration: " + duration + " seconds");

            // Validate video
            if (video.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("No video uploaded"));
            }

            // Save video
            String videoPath = kycService.saveVideo(video, sessionId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("videoPath", videoPath);
            response.put("message", "Video uploaded successfully");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Video upload failed: " + e.getMessage()));
        }
    }

    @PostMapping("/verify-face")
    public ResponseEntity<?> verifyFace(@RequestBody VerificationRequest request) {
        try {
            System.out.println("Received face verification request");
            System.out.println("Session ID: " + request.getSessionId());
            System.out.println("Document Path: " + request.getDocumentPath());
            System.out.println("Video Path: " + request.getVideoPath());

            // Perform face verification
            VerificationResult result = kycService.verifyFace(
                request.getDocumentPath(),
                request.getVideoPath(),
                request.getSessionId()
            );

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Verification failed: " + e.getMessage()));
        }
    }

    @GetMapping("/session/{sessionId}")
    public ResponseEntity<?> getSession(@PathVariable String sessionId) {
        try {
            KycSession session = kycService.getSession(sessionId);
            
            if (session == null) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(session);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Error retrieving session: " + e.getMessage()));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("message", "Video KYC API is running");
        return ResponseEntity.ok(response);
    }

    // Helper methods
    private boolean isValidImageType(String contentType) {
        return contentType != null && 
               (contentType.equals("image/jpeg") || 
                contentType.equals("image/jpg") || 
                contentType.equals("image/png"));
    }

    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("message", message);
        return error;
    }
}