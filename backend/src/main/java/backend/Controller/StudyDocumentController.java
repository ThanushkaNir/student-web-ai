package backend.Controller;

import backend.Config.UploadConfig;
import backend.Model.Assignment;
import backend.Model.StudyDocument;
import backend.Model.Subject;
import backend.Model.UserModel;
import backend.Repository.AssignmentRepository;
import backend.Repository.FlashcardRepository;
import backend.Repository.NoteBookmarkRepository;
import backend.Repository.QuestionRepository;
import backend.Repository.StudyDocumentRepository;
import backend.Repository.SubjectRepository;
import backend.Repository.UserRepository;
import backend.Service.FlashcardGeneratorService;
import backend.Service.McqGeneratorService;
import backend.Service.PdfTextService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/documents")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class StudyDocumentController {

    private static final Pattern ISO_DATE_PATTERN = Pattern.compile("\\b(\\d{4})[-/](\\d{1,2})[-/](\\d{1,2})\\b");
    private static final Pattern DMY_DATE_PATTERN = Pattern.compile("\\b(\\d{1,2})[-/](\\d{1,2})[-/](\\d{4})\\b");
    private static final Pattern TIME_12H_PATTERN = Pattern.compile("\\b(\\d{1,2}):(\\d{2})\\s*([AaPp][Mm])\\b");
    private static final Pattern TIME_24H_PATTERN = Pattern.compile("\\b(\\d{1,2}):(\\d{2})\\b");

    @Autowired
    private StudyDocumentRepository documentRepository;

    @Autowired
    private UploadConfig uploadConfig;

    @Autowired
    private PdfTextService pdfTextService;

    @Autowired
    private McqGeneratorService mcqGeneratorService;

    @Autowired
    private FlashcardGeneratorService flashcardGeneratorService;

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private FlashcardRepository flashcardRepository;

    @Autowired
    private NoteBookmarkRepository noteBookmarkRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/by-subject/{subjectId}")
    public List<StudyDocument> getBySubject(@PathVariable Long subjectId, @RequestParam Long userId) {
        List<StudyDocument> docs = documentRepository.findBySubjectIdOrderByCreatedAtDesc(subjectId);
        List<Long> ownerIds = new ArrayList<>();
        for (StudyDocument doc : docs) {
            Long ownerId = doc.getUserId();
            if (ownerId != null && !ownerId.equals(userId) && !ownerIds.contains(ownerId)) {
                ownerIds.add(ownerId);
            }
        }

        Map<Long, UserModel> ownersById = new HashMap<>();
        for (UserModel owner : userRepository.findAllById(ownerIds)) {
            ownersById.put(owner.getId(), owner);
        }

        List<StudyDocument> visibleDocs = new ArrayList<>();
        for (StudyDocument doc : docs) {
            if (isVisibleToUser(doc, userId, ownersById)) {
                visibleDocs.add(doc);
            }
        }
        return visibleDocs;
    }

    @GetMapping("/by-user/{userId}")
    public ResponseEntity<?> getByUser(@PathVariable Long userId, @RequestParam Long requesterUserId) {
        if (!userId.equals(requesterUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only view your own notes");
        }
        return ResponseEntity.ok(documentRepository.findByUserIdOrderByCreatedAtDesc(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id, @RequestParam Long userId) {
        return documentRepository.findById(id)
                .map(doc -> {
                    if (!isVisibleToUser(doc, userId, Map.of())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only view your own notes");
                    }
                    return ResponseEntity.ok(doc);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Upload text note (JSON). */
    @PostMapping("/text")
    public ResponseEntity<?> uploadText(@RequestBody StudyDocument doc) {
        if (doc.getType() == null) doc.setType("TEXT");
        String text = doc.getContentOrPath();
        if (text == null || text.trim().length() < 20)
            return ResponseEntity.badRequest().body("Text is too short to generate questions.");

        StudyDocument saved = documentRepository.save(doc);
        List<backend.Model.Question> questions = mcqGeneratorService.generateAndSave(
                saved.getSubjectId(), saved.getId(), text);
        List<backend.Model.Flashcard> flashcards = flashcardGeneratorService.generateAndSave(
                saved.getSubjectId(), saved.getId(), text);
        if (questions.isEmpty()) {
            documentRepository.deleteById(saved.getId());
            return ResponseEntity.badRequest().body("No questions generated from the provided text.");
        }
        if (flashcards.isEmpty()) {
            questionRepository.deleteByDocumentId(saved.getId());
            documentRepository.deleteById(saved.getId());
            return ResponseEntity.badRequest().body("No flashcards generated from the provided text.");
        }

        createAssignmentFromUpload(saved, text);
        return ResponseEntity.ok(saved);
    }

    /** Upload PDF (multipart). */
    @PostMapping("/pdf")
    public ResponseEntity<?> uploadPdf(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam("subjectId") Long subjectId,
            @RequestParam(value = "userId", required = false) Long userId,
            @RequestParam(value = "weekNumber", required = false) Integer weekNumber,
            @RequestParam(value = "lectureTopic", required = false) String lectureTopic
    ) throws IOException {
        if (file.isEmpty())
            throw new IllegalArgumentException("File is empty");

        Subject subject = subjectRepository.findById(subjectId).orElse(null);
        if (subject == null) {
            return ResponseEntity.badRequest().body("Invalid subjectId.");
        }

        String fileName = file.getOriginalFilename() == null ? "uploaded.file" : file.getOriginalFilename();
        String ext = extensionOf(fileName);
        if (!isAllowedExtension(ext)) {
            return ResponseEntity.badRequest().body("Only PDF, DOC, and DOCX files are supported.");
        }

        String filename = UUID.randomUUID().toString() + "." + ext;
        Path folder = resolveStructuredFolder(subject);
        Files.createDirectories(folder);
        Path dest = folder.resolve(filename);

        byte[] bytes = file.getBytes();
        String text = null;
        if ("pdf".equals(ext)) {
            try (ByteArrayInputStream inputStream = new ByteArrayInputStream(bytes)) {
                text = pdfTextService.extractText(inputStream);
            }
        }

        Files.write(dest, bytes);

        StudyDocument doc = new StudyDocument();
        doc.setTitle(title == null ? "Untitled" : title.trim());
        doc.setSubjectId(subjectId);
        doc.setType("FILE");
        doc.setFileType(ext);
        doc.setWeekNumber(weekNumber);
        doc.setLectureTopic(lectureTopic != null ? lectureTopic.trim() : null);
        doc.setContentOrPath(dest.toAbsolutePath().toString());
        doc.setUserId(userId);
        StudyDocument saved = documentRepository.save(doc);

        String generationSource = text;
        if (generationSource == null || generationSource.isBlank()) {
            generationSource = buildFallbackGenerationText(subject, saved);
        }

        // Best-effort generation for all supported files; file storage should succeed even if generation fails.
        if (generationSource != null && !generationSource.isBlank()) {
            mcqGeneratorService.generateAndSave(saved.getSubjectId(), saved.getId(), generationSource);
            flashcardGeneratorService.generateAndSave(saved.getSubjectId(), saved.getId(), generationSource);
        }

        createAssignmentFromUpload(saved, text);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<?> download(@PathVariable Long id, @RequestParam Long userId) {
        StudyDocument doc = documentRepository.findById(id).orElse(null);
        if (doc == null || doc.getContentOrPath() == null || doc.getContentOrPath().isBlank()) {
            return ResponseEntity.notFound().build();
        }

        if (!isVisibleToUser(doc, userId, Map.of())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only view your own notes");
        }

        String type = doc.getType() == null ? "" : doc.getType().toUpperCase(Locale.ROOT);
        if (!"FILE".equals(type) && !"PDF".equals(type)) {
            return ResponseEntity.badRequest().body("Only uploaded files can be downloaded.");
        }

        try {
            Path filePath = Path.of(doc.getContentOrPath());
            if (!Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }

            Resource resource = new UrlResource(filePath.toUri());
            String safeTitle = sanitizeForFileName(doc.getTitle() == null ? "document" : doc.getTitle());
            String ext = doc.getFileType() == null || doc.getFileType().isBlank() ? "pdf" : doc.getFileType();
            String downloadName = safeTitle + "." + ext;

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + downloadName + "\"")
                    .contentType(MediaType.parseMediaType(mediaTypeFor(ext)))
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Unable to download file: " + e.getMessage());
        }
    }

    private void createAssignmentFromUpload(StudyDocument document, String extractedText) {
        if (document.getUserId() == null) {
            return;
        }

        Assignment assignment = new Assignment();
        assignment.setUserId(document.getUserId());
        String sourceType = "PDF".equalsIgnoreCase(document.getType()) ? "PDF" : "TEXT";
        if ("FILE".equalsIgnoreCase(document.getType())) {
            sourceType = (document.getFileType() == null ? "FILE" : document.getFileType()).toUpperCase(Locale.ROOT);
        }
        assignment.setName("[" + sourceType + "] " + document.getTitle());

        Subject subject = subjectRepository.findById(document.getSubjectId()).orElse(null);
        assignment.setSubjectId(document.getSubjectId());
        assignment.setSubject(subject != null ? subject.getName() : "Subject " + document.getSubjectId());

        LocalDateTime now = LocalDateTime.now();
        LocalDate parsedDate = parseDateFromText(extractedText);
        LocalTime parsedTime = parseTimeFromText(extractedText);

        assignment.setDueDate(parsedDate != null ? parsedDate : now.toLocalDate());
        assignment.setDueTime(parsedTime != null ? parsedTime : now.toLocalTime().withSecond(0).withNano(0));
        assignment.setStatus("PENDING");

        assignmentRepository.save(assignment);
    }

    private LocalDate parseDateFromText(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }

        // Try ISO format first (YYYY-MM-DD)
        Matcher iso = ISO_DATE_PATTERN.matcher(text);
        if (iso.find()) {
            try {
                int year = Integer.parseInt(iso.group(1));
                int month = Integer.parseInt(iso.group(2));
                int day = Integer.parseInt(iso.group(3));
                return LocalDate.of(year, month, day);
            } catch (RuntimeException ignored) {
            }
        }

        // Try DMY format (DD-MM-YYYY or MM-DD-YYYY)
        Matcher dmy = DMY_DATE_PATTERN.matcher(text);
        if (dmy.find()) {
            int first = Integer.parseInt(dmy.group(1));
            int second = Integer.parseInt(dmy.group(2));
            int year = Integer.parseInt(dmy.group(3));

            // Use DD-MM-YYYY by default. If first value is impossible day, treat as MM-DD-YYYY.
            int day = first;
            int month = second;
            if (first > 31) {
                return null;
            }
            if (first > 12 && second <= 12) {
                day = first;
                month = second;
            } else if (second > 12 && first <= 12) {
                day = second;
                month = first;
            }

            try {
                return LocalDate.of(year, month, day);
            } catch (RuntimeException ignored) {
            }
        }

        // Try named month formats with ordinal support: "14th April 2026", "April 14th, 2026", "April 14, 2026", "14 April 2026"
        String[] namedDatePatterns = new String[] {
                "\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+([A-Za-z]{3,9})\\s+(\\d{4})\\b",  // "14th April 2026" or "14 April 2026"
                "\\b([A-Za-z]{3,9})\\s+(\\d{1,2})(?:st|nd|rd|th)?,\\s*(\\d{4})\\b"   // "April 14th, 2026" or "April 14, 2026"
        };

        String[] dateFormats = new String[] {
                "d MMMM uuuu",  // "14 April 2026"
                "MMMM d uuuu"   // "April 14 2026"
        };

        for (int i = 0; i < namedDatePatterns.length; i++) {
            Matcher matcher = Pattern.compile(namedDatePatterns[i], Pattern.CASE_INSENSITIVE).matcher(text);
            if (matcher.find()) {
                try {
                    String matched = matcher.group().trim();
                    // Remove ordinal suffixes for parsing
                    String normalized = matched.replaceAll("(?:st|nd|rd|th)", "");
                    
                    DateTimeFormatter formatter = DateTimeFormatter.ofPattern(dateFormats[i], Locale.ENGLISH);
                    return LocalDate.parse(normalized, formatter);
                } catch (DateTimeParseException ignored) {
                }
            }
        }

        return null;
    }

    private LocalTime parseTimeFromText(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }

        Matcher m12 = TIME_12H_PATTERN.matcher(text);
        if (m12.find()) {
            try {
                int hour = Integer.parseInt(m12.group(1));
                int minute = Integer.parseInt(m12.group(2));
                String ampm = m12.group(3).toUpperCase(Locale.ROOT);

                if (hour == 12) {
                    hour = 0;
                }
                if ("PM".equals(ampm)) {
                    hour += 12;
                }
                return LocalTime.of(hour, minute);
            } catch (RuntimeException ignored) {
            }
        }

        Matcher m24 = TIME_24H_PATTERN.matcher(text);
        while (m24.find()) {
            try {
                int hour = Integer.parseInt(m24.group(1));
                int minute = Integer.parseInt(m24.group(2));
                if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
                    return LocalTime.of(hour, minute);
                }
            } catch (RuntimeException ignored) {
            }
        }

        return null;
    }

    /** Generate MCQs from document content (text or PDF). Returns generated questions. */
    @PostMapping("/{id}/generate-questions")
    public ResponseEntity<?> generateQuestions(@PathVariable Long id, @RequestParam Long userId) {
        StudyDocument doc = documentRepository.findById(id).orElse(null);
        if (doc == null)
            return ResponseEntity.notFound().build();

        if (!isVisibleToUser(doc, userId, Map.of())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only access your own notes");
        }

        String text = null;
        if ("TEXT".equalsIgnoreCase(doc.getType()) && doc.getContentOrPath() != null) {
            text = doc.getContentOrPath();
        } else if (("PDF".equalsIgnoreCase(doc.getType())
                || ("FILE".equalsIgnoreCase(doc.getType()) && "pdf".equalsIgnoreCase(doc.getFileType())))
                && doc.getContentOrPath() != null) {
            try {
                text = pdfTextService.extractText(Path.of(doc.getContentOrPath()));
            } catch (IOException e) {
                return ResponseEntity.badRequest().body("Could not read PDF: " + e.getMessage());
            }
        }
        if (text == null || text.isBlank())
            return ResponseEntity.badRequest().body("No text content to generate questions from.");

        List<backend.Model.Question> questions = mcqGeneratorService.generateAndSave(
                doc.getSubjectId(), doc.getId(), text);
        return ResponseEntity.ok(questions);
    }

    @PostMapping("/{id}/generate-flashcards")
    public ResponseEntity<?> generateFlashcards(@PathVariable Long id, @RequestParam Long userId) {
        StudyDocument doc = documentRepository.findById(id).orElse(null);
        if (doc == null)
            return ResponseEntity.notFound().build();

        if (!isVisibleToUser(doc, userId, Map.of())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only access your own notes");
        }

        String text = null;
        if ("TEXT".equalsIgnoreCase(doc.getType()) && doc.getContentOrPath() != null) {
            text = doc.getContentOrPath();
        } else if (("PDF".equalsIgnoreCase(doc.getType())
                || ("FILE".equalsIgnoreCase(doc.getType()) && "pdf".equalsIgnoreCase(doc.getFileType())))
                && doc.getContentOrPath() != null) {
            try {
                text = pdfTextService.extractText(Path.of(doc.getContentOrPath()));
            } catch (IOException e) {
                return ResponseEntity.badRequest().body("Could not read PDF: " + e.getMessage());
            }
        }
        if (text == null || text.isBlank())
            return ResponseEntity.badRequest().body("No text content to generate flashcards from.");

        List<backend.Model.Flashcard> flashcards = flashcardGeneratorService.generateAndSave(
                doc.getSubjectId(), doc.getId(), text);
        return ResponseEntity.ok(flashcards);
    }

    /** Update document: for TEXT, can edit title and content (regenerates questions); for PDF, can only edit title. */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateDocument(
            @PathVariable Long id,
            @RequestBody StudyDocument updates,
            @RequestParam Long userId
    ) {
        return documentRepository.findById(id)
                .map(doc -> {
                    if (!isOwner(doc, userId)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body("You can only edit your own notes");
                    }

                    if (updates.getTitle() != null && !updates.getTitle().trim().isEmpty()) {
                        doc.setTitle(updates.getTitle().trim());
                    }
                    if (updates.getWeekNumber() != null) {
                        doc.setWeekNumber(updates.getWeekNumber());
                    }
                    if (updates.getLectureTopic() != null) {
                        doc.setLectureTopic(updates.getLectureTopic().trim());
                    }
                    
                    if ("TEXT".equalsIgnoreCase(doc.getType())) {
                        if (updates.getContentOrPath() != null) {
                            String newContent = updates.getContentOrPath().trim();
                            if (newContent.length() < 20) {
                                return ResponseEntity.badRequest().body("Text is too short to generate questions.");
                            }
                            doc.setContentOrPath(newContent);
                            StudyDocument saved = documentRepository.save(doc);
                            List<backend.Model.Question> questions = mcqGeneratorService.generateAndSave(
                                    saved.getSubjectId(), saved.getId(), newContent);
                            if (questions.isEmpty()) {
                                return ResponseEntity.badRequest().body("No questions generated from the updated text.");
                            }
                            List<backend.Model.Flashcard> flashcards = flashcardGeneratorService.generateAndSave(
                                    saved.getSubjectId(), saved.getId(), newContent);
                            if (flashcards.isEmpty()) {
                                return ResponseEntity.badRequest().body("No flashcards generated from the updated text.");
                            }
                            return ResponseEntity.ok(saved);
                        }
                    }
                    
                    return ResponseEntity.ok(documentRepository.save(doc));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> delete(@PathVariable Long id, @RequestParam Long userId) {
        StudyDocument existing = documentRepository.findById(id).orElse(null);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }

        if (!isOwner(existing, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You can only delete your own notes");
        }

        questionRepository.deleteByDocumentId(id);
        flashcardRepository.deleteByDocumentId(id);
        noteBookmarkRepository.deleteByDocumentId(id);
        documentRepository.deleteById(id);
        try {
            if (existing.getContentOrPath() != null && !existing.getContentOrPath().isBlank()) {
                Files.deleteIfExists(Path.of(existing.getContentOrPath()));
            }
        } catch (Exception ignored) {
        }
        return ResponseEntity.noContent().build();
    }

    private boolean isOwner(StudyDocument doc, Long userId) {
        return doc != null
                && userId != null
                && doc.getUserId() != null
                && doc.getUserId().equals(userId);
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

    private Path resolveStructuredFolder(Subject subject) {
        int year = subject.getYearLevel() == null ? 0 : subject.getYearLevel();
        int semester = subject.getSemester() == null ? 0 : subject.getSemester();

        String yearFolder = year > 0 ? "year-" + year : "year-unknown";
        String semesterFolder = semester > 0 ? "semester-" + semester : "semester-unknown";
        String subjectFolder = sanitizeForFolder(subject.getName() == null ? "subject" : subject.getName());

        return uploadConfig.getUploadPath().resolve(yearFolder).resolve(semesterFolder).resolve(subjectFolder);
    }

    private String extensionOf(String fileName) {
        int idx = fileName.lastIndexOf('.');
        if (idx < 0 || idx == fileName.length() - 1) return "";
        return fileName.substring(idx + 1).toLowerCase(Locale.ROOT);
    }

    private boolean isAllowedExtension(String ext) {
        return "pdf".equals(ext) || "doc".equals(ext) || "docx".equals(ext);
    }

        private String buildFallbackGenerationText(Subject subject, StudyDocument document) {
        String subjectName = subject != null && subject.getName() != null && !subject.getName().isBlank()
            ? subject.getName().trim()
            : "this subject";
        String title = document != null && document.getTitle() != null && !document.getTitle().isBlank()
            ? document.getTitle().trim()
            : "uploaded material";
        String lectureTopic = document != null && document.getLectureTopic() != null && !document.getLectureTopic().isBlank()
            ? document.getLectureTopic().trim()
            : "general concepts";
        String week = document != null && document.getWeekNumber() != null
            ? String.valueOf(document.getWeekNumber())
            : "the current week";

        return "This study material belongs to " + subjectName + ". "
            + "The document title is " + title + ". "
            + "It focuses on " + lectureTopic + " for week " + week + ". "
            + "Review the key definitions, examples, and practical applications of these concepts.";
        }

    private String mediaTypeFor(String ext) {
        if ("pdf".equalsIgnoreCase(ext)) return "application/pdf";
        if ("doc".equalsIgnoreCase(ext)) return "application/msword";
        if ("docx".equalsIgnoreCase(ext)) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        return "application/octet-stream";
    }

    private String sanitizeForFolder(String value) {
        return value.trim().replaceAll("[^a-zA-Z0-9-_ ]", "").replaceAll("\\s+", "-").toLowerCase(Locale.ROOT);
    }

    private String sanitizeForFileName(String value) {
        return value.trim().replaceAll("[^a-zA-Z0-9-_ ]", "").replaceAll("\\s+", "-");
    }
}
