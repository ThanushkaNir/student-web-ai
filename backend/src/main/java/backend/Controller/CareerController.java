package backend.Controller;

import backend.Model.CareerSuggestion;
import backend.Repository.CareerSuggestionRepository;
import backend.Service.CareerSuggestorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/career")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class CareerController {

    @Autowired
    private CareerSuggestorService suggestorService;
    @Autowired
    private CareerSuggestionRepository suggestionRepository;

    @PostMapping("/suggest")
    public CareerSuggestion suggest(@RequestBody SuggestRequest req) {
        return suggestorService.suggestAndSave(req.userId, req.interests, req.skills);
    }

    @GetMapping("/history")
    public List<CareerSuggestion> history(@RequestParam Long userId) {
        return suggestionRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public static class SuggestRequest {
        public Long userId;
        public String interests;
        public String skills;
    }
}
