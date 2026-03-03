package backend.Controller;

import backend.Model.Question;
import backend.Model.QuizAttempt;
import backend.Repository.QuestionRepository;
import backend.Repository.QuizAttemptRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/quiz")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class QuizController {

    @Autowired
    private QuizAttemptRepository attemptRepository;

    @Autowired
    private QuestionRepository questionRepository;

    /** Submit quiz: body = { userId, subjectId?, documentId?, answers: { questionId: "A"|"B"|"C"|"D" }, timeSeconds } */
    @PostMapping("/submit")
    public QuizAttempt submit(@RequestBody Map<String, Object> body) {
        Long userId = longFrom(body.get("userId"));
        Long subjectId = body.get("subjectId") != null ? longFrom(body.get("subjectId")) : null;
        Long documentId = body.get("documentId") != null ? longFrom(body.get("documentId")) : null;
        Integer timeSeconds = body.get("timeSeconds") != null ? ((Number) body.get("timeSeconds")).intValue() : null;

        @SuppressWarnings("unchecked")
        Map<String, String> answers = body.get("answers") != null ? (Map<String, String>) body.get("answers") : Map.of();

        List<Question> questions;
        if (documentId != null)
            questions = questionRepository.findByDocumentId(documentId);
        else if (subjectId != null)
            questions = questionRepository.findBySubjectId(subjectId);
        else
            questions = List.of();

        int total = questions.size();
        int correct = 0;
        for (Question q : questions) {
            String userAnswer = answers.get(String.valueOf(q.getId()));
            if (q.getCorrectAnswer() != null && q.getCorrectAnswer().equalsIgnoreCase(userAnswer))
                correct++;
        }

        QuizAttempt attempt = new QuizAttempt();
        attempt.setUserId(userId);
        attempt.setSubjectId(subjectId);
        attempt.setDocumentId(documentId);
        attempt.setScoreObtained(correct);
        attempt.setTotalQuestions(total);
        attempt.setTimeSeconds(timeSeconds);
        return attemptRepository.save(attempt);
    }

    @GetMapping("/history")
    public List<QuizAttempt> history(@RequestParam Long userId) {
        return attemptRepository.findByUserIdOrderByCompletedAtDesc(userId);
    }

    private static long longFrom(Object o) {
        if (o instanceof Number) return ((Number) o).longValue();
        if (o instanceof String) return Long.parseLong((String) o);
        throw new IllegalArgumentException("Invalid id: " + o);
    }
}
