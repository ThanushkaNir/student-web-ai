package backend.Controller;

import backend.Model.Question;
import backend.Repository.QuestionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/questions")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class QuestionController {

    @Autowired
    private QuestionRepository questionRepository;

    @GetMapping
    public List<Question> getQuestions(
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) Long documentId
    ) {
        if (documentId != null)
            return questionRepository.findByDocumentId(documentId);
        if (subjectId != null)
            return questionRepository.findBySubjectId(subjectId);
        return List.of();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Question> getById(@PathVariable Long id) {
        return questionRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
