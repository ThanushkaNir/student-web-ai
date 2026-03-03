package backend.Controller;

import backend.Model.Assignment;
import backend.Model.StudyDocument;
import backend.Model.Subject;
import backend.Repository.AssignmentRepository;
import backend.Repository.StudyDocumentRepository;
import backend.Repository.SubjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/search")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class SearchController {

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private StudyDocumentRepository studyDocumentRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @GetMapping
    public Map<String, Object> search(
            @RequestParam String query,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Integer yearLevel,
            @RequestParam(required = false) Integer semester
    ) {
        String keyword = query == null ? "" : query.trim();

        if (keyword.isBlank()) {
            return response(List.of(), List.of(), List.of());
        }

        List<Subject> scopedSubjects = loadScopedSubjects(yearLevel, semester);

        List<Subject> subjects = scopedSubjects.stream()
                .filter(subject -> matchesSubject(subject, keyword))
                .limit(25)
                .toList();

        List<Long> scopedSubjectIds = scopedSubjects.stream()
                .map(Subject::getId)
                .toList();

        List<StudyDocument> notes = (scopedSubjectIds.isEmpty() || userId == null)
                ? List.of()
            : studyDocumentRepository.findBySubjectIdInAndUserIdAndTitleContainingIgnoreCaseOrderByCreatedAtDesc(scopedSubjectIds, userId, keyword)
                .stream()
                .limit(30)
                .toList();

        List<Assignment> assignments = userId == null
                ? List.of()
                : assignmentRepository.findByUserIdOrderByDueDateAsc(userId)
                .stream()
                .filter(assignment -> matchesAssignment(assignment, keyword))
                .limit(30)
                .toList();

        return response(subjects, notes, assignments);
    }

    private List<Subject> loadScopedSubjects(Integer yearLevel, Integer semester) {
        if (yearLevel != null && semester != null) {
            return subjectRepository.findByYearLevelAndSemesterOrderByNameAsc(yearLevel, semester);
        }
        if (yearLevel != null) {
            return subjectRepository.findByYearLevelOrderByNameAsc(yearLevel);
        }
        return subjectRepository.findAllByOrderByNameAsc();
    }

    private boolean matchesSubject(Subject subject, String keyword) {
        String lower = keyword.toLowerCase(Locale.ROOT);
        return contains(subject.getName(), lower)
                || contains(subject.getCode(), lower)
                || contains(subject.getLecturerName(), lower)
                || contains(subject.getDescription(), lower);
    }

    private boolean matchesAssignment(Assignment assignment, String keyword) {
        String lower = keyword.toLowerCase(Locale.ROOT);
        return contains(assignment.getName(), lower)
                || contains(assignment.getSubject(), lower)
                || contains(assignment.getStatus(), lower);
    }

    private boolean contains(String value, String keywordLowerCase) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(keywordLowerCase);
    }

    private Map<String, Object> response(
            List<Subject> subjects,
            List<StudyDocument> notes,
            List<Assignment> assignments
    ) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("subjects", subjects);
        payload.put("notes", notes);
        payload.put("assignments", assignments);
        return payload;
    }
}