package backend.Controller;

import backend.Model.Flashcard;
import backend.Repository.FlashcardRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/flashcards")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class FlashcardController {

    @Autowired
    private FlashcardRepository flashcardRepository;

    @GetMapping
    public List<Flashcard> getFlashcards(
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) Long documentId
    ) {
        if (documentId != null) {
            List<Flashcard> byDocument = flashcardRepository.findByDocumentId(documentId);
            if (!byDocument.isEmpty()) {
                return byDocument;
            }
            if (subjectId != null) {
                return flashcardRepository.findBySubjectId(subjectId);
            }
            return List.of();
        }
        if (subjectId != null) {
            return flashcardRepository.findBySubjectId(subjectId);
        }
        return List.of();
    }
}
