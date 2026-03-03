package backend.Controller;

import backend.Model.KnowledgeEntry;
import backend.Model.KnowledgeChatRequest;
import backend.Model.KnowledgeChatResponse;
import backend.Repository.KnowledgeEntryRepository;
import backend.Service.KnowledgeChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/knowledge")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class KnowledgeEntryController {

    @Autowired
    private KnowledgeEntryRepository knowledgeRepository;

    @Autowired
    private KnowledgeChatService knowledgeChatService;

    @GetMapping
    public List<KnowledgeEntry> getAll(@RequestParam(required = false) String category) {
        if (category != null && !category.isBlank())
            return knowledgeRepository.findByCategoryOrderByTitleAsc(category.trim());
        return knowledgeRepository.findAllByOrderByCategoryAscTitleAsc();
    }

    @GetMapping("/{id}")
    public ResponseEntity<KnowledgeEntry> getById(@PathVariable Long id) {
        return knowledgeRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public KnowledgeEntry create(@RequestBody KnowledgeEntry entry) {
        if (entry.getCreatedAt() == null) entry.setCreatedAt(LocalDateTime.now());
        entry.setUpdatedAt(LocalDateTime.now());
        return knowledgeRepository.save(entry);
    }

    @PutMapping("/{id}")
    public ResponseEntity<KnowledgeEntry> update(@PathVariable Long id, @RequestBody KnowledgeEntry body) {
        return knowledgeRepository.findById(id)
                .map(k -> {
                    if (body.getTitle() != null) k.setTitle(body.getTitle());
                    if (body.getCategory() != null) k.setCategory(body.getCategory());
                    if (body.getContent() != null) k.setContent(body.getContent());
                    k.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(knowledgeRepository.save(k));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!knowledgeRepository.existsById(id))
            return ResponseEntity.notFound().build();
        knowledgeRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/chat")
    public ResponseEntity<KnowledgeChatResponse> chat(@RequestBody(required = false) KnowledgeChatRequest request) {
        String message = request == null ? "" : request.getMessage();
        return ResponseEntity.ok(knowledgeChatService.ask(message));
    }

    @GetMapping("/suggestions")
    public List<String> getSuggestions(@RequestParam(required = false) String q) {
        if (q == null || q.isBlank()) {
            return List.of();
        }

        String query = q.trim();
        return knowledgeRepository.search(query).stream()
                .flatMap(entry -> List.of(
                        entry.getTitle(),
                        "What is " + entry.getTitle() + "?",
                        entry.getCategory() == null || entry.getCategory().isBlank()
                                ? null
                                : "Explain " + entry.getCategory() + " rules"
                ).stream())
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .distinct()
                .limit(6)
                .collect(Collectors.toList());
    }
}
