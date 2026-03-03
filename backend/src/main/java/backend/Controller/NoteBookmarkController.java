package backend.Controller;

import backend.Model.NoteBookmark;
import backend.Model.StudyDocument;
import backend.Model.UserModel;
import backend.Repository.NoteBookmarkRepository;
import backend.Repository.StudyDocumentRepository;
import backend.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/bookmarks")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class NoteBookmarkController {

    @Autowired
    private NoteBookmarkRepository noteBookmarkRepository;

    @Autowired
    private StudyDocumentRepository studyDocumentRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public List<Long> listBookmarks(
            @RequestParam Long userId,
            @RequestParam(required = false) Long subjectId
    ) {
        List<NoteBookmark> bookmarks;

        if (subjectId != null) {
            List<StudyDocument> docs = studyDocumentRepository.findBySubjectIdOrderByCreatedAtDesc(subjectId);
            Map<Long, UserModel> ownersById = userRepository.findAllById(
                    docs.stream()
                        .map(StudyDocument::getUserId)
                        .filter(id -> id != null && !id.equals(userId))
                        .distinct()
                        .toList())
                .stream()
                .collect(Collectors.toMap(UserModel::getId, Function.identity()));

            List<Long> subjectDocIds = docs.stream()
                .filter(doc -> isVisibleToUser(doc, userId, ownersById))
                .map(StudyDocument::getId)
                .toList();

            if (subjectDocIds.isEmpty()) {
                return List.of();
            }

            bookmarks = noteBookmarkRepository.findByUserIdAndDocumentIdInOrderByCreatedAtDesc(userId, subjectDocIds);
        } else {
            bookmarks = noteBookmarkRepository.findByUserIdOrderByCreatedAtDesc(userId);
        }

        return bookmarks.stream()
                .map(NoteBookmark::getDocumentId)
                .toList();
    }

    @PostMapping
    public ResponseEntity<?> createBookmark(@RequestBody NoteBookmark payload) {
        if (payload.getUserId() == null || payload.getDocumentId() == null) {
            return ResponseEntity.badRequest().body("userId and documentId are required.");
        }

        StudyDocument document = studyDocumentRepository.findById(payload.getDocumentId()).orElse(null);
        if (document == null) {
            return ResponseEntity.badRequest().body("Document not found.");
        }

        if (!isVisibleToUser(document, payload.getUserId(), Map.of())) {
            return ResponseEntity.badRequest().body("You can only bookmark visible notes.");
        }

        NoteBookmark existing = noteBookmarkRepository
                .findByUserIdAndDocumentId(payload.getUserId(), payload.getDocumentId())
                .orElse(null);

        if (existing != null) {
            return ResponseEntity.ok(existing);
        }

        NoteBookmark bookmark = new NoteBookmark();
        bookmark.setUserId(payload.getUserId());
        bookmark.setDocumentId(payload.getDocumentId());
        bookmark.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.ok(noteBookmarkRepository.save(bookmark));
    }

    @DeleteMapping
    public ResponseEntity<Void> removeBookmark(@RequestParam Long userId, @RequestParam Long documentId) {
        NoteBookmark existing = noteBookmarkRepository.findByUserIdAndDocumentId(userId, documentId).orElse(null);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }

        noteBookmarkRepository.deleteByUserIdAndDocumentId(userId, documentId);
        return ResponseEntity.noContent().build();
    }

    private boolean isVisibleToUser(StudyDocument doc, Long userId, Map<Long, UserModel> ownersById) {
        if (doc == null || userId == null) {
            return false;
        }

        if (doc.getUserId() == null || doc.getUserId().equals(userId)) {
            return true;
        }

        UserModel owner = ownersById.get(doc.getUserId());
        if (owner == null) {
            owner = userRepository.findById(doc.getUserId()).orElse(null);
        }
        String ownerRole = owner != null && owner.getRole() != null
                ? owner.getRole().trim().toUpperCase(Locale.ROOT)
                : "STUDENT";
        return "ADMIN".equals(ownerRole);
    }
}