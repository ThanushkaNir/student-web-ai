package backend.Controller;

import backend.Model.UserModel;
import backend.Repository.UserRepository;
import backend.Service.GoogleTokenVerifierService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.HashMap;
import java.util.Map;

@RestController
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class GoogleAuthController {

    @Autowired
    public UserRepository userRepository;

    @Autowired
    public GoogleTokenVerifierService googleTokenVerifierService;

    /**
     * Body: { "credential": "<JWT from Google Sign-In>" }
     */
    @PostMapping("/auth/google")
    public ResponseEntity<Map<String, Object>> googleSignIn(@RequestBody Map<String, String> body) {
        String credential = body != null ? body.get("credential") : null;
        if (credential == null || credential.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Missing Google credential"));
        }

        final GoogleIdToken.Payload payload;
        try {
            payload = googleTokenVerifierService.verify(credential);
        } catch (GeneralSecurityException | IOException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Could not verify Google sign-in"));
        }

        if (payload == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid Google token"));
        }

        String email = payload.getEmail();
        if (email == null || email.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Google account has no email"));
        }

        String normalizedEmail = email.trim().toLowerCase();
        String sub = payload.getSubject();
        String rawName = payload.get("name") != null ? String.valueOf(payload.get("name")).trim() : "";
        final String displayName = rawName.isEmpty()
                ? (normalizedEmail.contains("@") ? normalizedEmail.substring(0, normalizedEmail.indexOf('@')) : "User")
                : rawName;

        final String pictureUrl = payload.get("picture") != null ? String.valueOf(payload.get("picture")) : null;

        UserModel user = userRepository.findAllByEmail(normalizedEmail).orElseGet(() -> {
            UserModel u = new UserModel();
            u.setName(displayName);
            u.setEmail(normalizedEmail);
            u.setPassword("__GOOGLE__" + (sub != null ? sub : normalizedEmail));
            u.setRole("STUDENT");
            if (pictureUrl != null && !pictureUrl.isBlank()) {
                u.setProfilePhoto(pictureUrl);
            }
            return userRepository.save(u);
        });

        if (user.getProfilePhoto() == null && pictureUrl != null && !pictureUrl.isBlank()) {
            user.setProfilePhoto(pictureUrl);
            user = userRepository.save(user);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message", "login successful");
        response.put("id", user.getId());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("role", user.getRole() != null ? user.getRole() : "STUDENT");
        response.put("year", user.getYear());
        response.put("profilePhoto", user.getProfilePhoto());
        response.put("bio", user.getBio());
        response.put("skills", user.getSkills());
        response.put("education", user.getEducation());
        return ResponseEntity.ok(response);
    }
}
