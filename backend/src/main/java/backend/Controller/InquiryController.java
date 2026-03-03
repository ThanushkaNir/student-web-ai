package backend.Controller;

import backend.Model.KnowledgeEntry;
import backend.Model.KnowledgeChatResponse;
import backend.Model.SupportTicket;
import backend.Repository.KnowledgeEntryRepository;
import backend.Repository.SupportTicketRepository;
import backend.Service.KnowledgeChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inquiry")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class InquiryController {

    @Autowired
    private KnowledgeEntryRepository knowledgeRepository;

    @Autowired
    private SupportTicketRepository supportTicketRepository;

    @Autowired
    private KnowledgeChatService knowledgeChatService;

    /**
     * Automated inquiry: search knowledge base by question/keywords.
     * Returns matching entries; if none, frontend can offer "Create support ticket".
     */
    @GetMapping("/ask")
    public List<KnowledgeEntry> ask(@RequestParam String q) {
        if (q == null || q.trim().isEmpty())
            return List.of();
        return knowledgeRepository.search(q.trim());
    }

    /**
     * Smart inquiry endpoint:
     * - returns chatbot answers from knowledge base
     * - if no answers and autoTicket=true, creates support ticket automatically
     */
    @PostMapping("/ask")
    public ResponseEntity<Map<String, Object>> askSmart(@RequestBody Map<String, Object> body) {
        String question = body != null && body.get("q") != null ? String.valueOf(body.get("q")).trim() : "";
        boolean autoTicket = body != null && Boolean.parseBoolean(String.valueOf(body.getOrDefault("autoTicket", false)));

        Long userId = null;
        if (body != null && body.get("userId") != null) {
            try {
                userId = Long.parseLong(String.valueOf(body.get("userId")));
            } catch (NumberFormatException ignored) {
            }
        }

        if (question.isEmpty()) {
            Map<String, Object> empty = new HashMap<>();
            empty.put("answered", false);
            empty.put("answers", List.of());
            empty.put("message", "Please enter a question.");
            empty.put("ticketCreated", false);
            return ResponseEntity.ok(empty);
        }

        List<KnowledgeEntry> answers = knowledgeRepository.search(question);
        Map<String, Object> result = new HashMap<>();
        result.put("answers", answers);

        if (!answers.isEmpty()) {
            result.put("answered", true);
            result.put("message", "Answer found from university knowledge base.");
            result.put("generalAiAnswer", false);
            result.put("answerSource", "knowledge-base");
            result.put("aiAnswer", "");
            result.put("ticketCreated", false);
            return ResponseEntity.ok(result);
        }

        // No KB matches: use AI fallback (OpenAI/Gemini) if available
        KnowledgeChatResponse ai = knowledgeChatService.ask(question);
        boolean hasAiAnswer = ai != null && ai.getAnswer() != null && !ai.getAnswer().isBlank() && !ai.isFallback();
        result.put("answered", hasAiAnswer);
        result.put("generalAiAnswer", hasAiAnswer && ai.isGeneralAiAnswer());
        result.put("answerSource", ai != null ? ai.getAnswerSource() : "fallback");
        result.put("aiAnswer", hasAiAnswer ? ai.getAnswer() : "");
        result.put("message", hasAiAnswer ? "Answer provided by AI." : "No direct answer found.");
        result.put("ticketCreated", false);

        // Auto ticket only when there is no KB answer AND no AI answer
        if (!hasAiAnswer && autoTicket && userId != null) {
            SupportTicket ticket = new SupportTicket();
            String shortQ = question.length() > 80 ? question.substring(0, 80) + "..." : question;
            ticket.setUserId(userId);
            ticket.setSubject("Chatbot unresolved inquiry: " + shortQ);
            ticket.setDescription("Student question: " + question + "\n\nAuto-created from Inquiry Handler fallback.");
            ticket.setStatus("OPEN");
            ticket.setCreatedAt(LocalDateTime.now());
            ticket.setUpdatedAt(LocalDateTime.now());
            SupportTicket saved = supportTicketRepository.save(ticket);

            result.put("ticketCreated", true);
            result.put("ticketId", saved.getId());
            result.put("message", "No answer found. A support ticket was created automatically.");
        }

        return ResponseEntity.ok(result);
    }
}
