package backend.Controller;

import backend.Model.CoverLetter;
import backend.Repository.CoverLetterRepository;
import backend.Service.CoverLetterService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cover-letter")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class CoverLetterController {

    @Autowired
    private CoverLetterService coverLetterService;
    @Autowired
    private CoverLetterRepository coverLetterRepository;

    @PostMapping("/generate")
    public CoverLetter generate(@RequestBody GenerateRequest req) {
        return coverLetterService.generateAndSave(req.userId, req.jobId, req.jobDescription);
    }

    @GetMapping("/history")
    public List<CoverLetter> history(@RequestParam Long userId) {
        return coverLetterRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CoverLetter> getById(@PathVariable Long id) {
        return coverLetterRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    public static class GenerateRequest {
        public Long userId;
        public Long jobId;
        public String jobDescription;
    }
}
