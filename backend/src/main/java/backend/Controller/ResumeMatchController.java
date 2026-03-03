package backend.Controller;

import backend.Model.ResumeMatch;
import backend.Repository.ResumeMatchRepository;
import backend.Service.ResumeMatcherService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/match")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class ResumeMatchController {

    @Autowired
    private ResumeMatcherService matcherService;
    @Autowired
    private ResumeMatchRepository matchRepository;

    @PostMapping
    public ResponseEntity<ResumeMatch> computeMatch(@RequestBody MatchRequest req) {
        ResumeMatch m = matcherService.computeAndSave(req.userId, req.resumeId, req.jobId);
        return m != null ? ResponseEntity.ok(m) : ResponseEntity.badRequest().build();
    }

    @GetMapping("/history")
    public List<ResumeMatch> history(@RequestParam Long userId) {
        return matchRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public static class MatchRequest {
        public Long userId;
        public Long resumeId;
        public Long jobId;
    }
}
