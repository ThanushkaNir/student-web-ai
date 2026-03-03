package backend.Controller;

import backend.Model.Assignment;
import backend.Model.QuizAttempt;
import backend.Model.Subject;
import backend.Repository.AssignmentRepository;
import backend.Repository.QuizAttemptRepository;
import backend.Repository.SubjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/progress")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class SubjectProgressController {

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private QuizAttemptRepository quizAttemptRepository;

    @GetMapping("/subjects")
    public ResponseEntity<List<Map<String, Object>>> subjectProgress(
            @RequestParam Long userId,
            @RequestParam(required = false) Integer yearLevel,
            @RequestParam(required = false) Integer semester
    ) {
        List<Subject> subjects;
        if (yearLevel != null && semester != null) {
            subjects = subjectRepository.findByYearLevelAndSemesterOrderByNameAsc(yearLevel, semester);
        } else {
            subjects = subjectRepository.findAllByOrderByNameAsc();
        }

        List<Assignment> assignments = assignmentRepository.findByUserIdOrderByDueDateAsc(userId);
        List<QuizAttempt> attempts = quizAttemptRepository.findByUserIdOrderByCompletedAtDesc(userId);

        List<Map<String, Object>> output = new ArrayList<>();

        for (Subject subject : subjects) {
            long totalAssignments = 0;
            long completedAssignments = 0;

            for (Assignment assignment : assignments) {
                boolean sameSubjectId = assignment.getSubjectId() != null && assignment.getSubjectId().equals(subject.getId());
                boolean legacyNameMatch = assignment.getSubjectId() == null
                        && assignment.getSubject() != null
                        && subject.getName() != null
                        && assignment.getSubject().trim().equalsIgnoreCase(subject.getName().trim());

                if (sameSubjectId || legacyNameMatch) {
                    totalAssignments++;
                    if ("COMPLETED".equalsIgnoreCase(assignment.getStatus())) {
                        completedAssignments++;
                    }
                }
            }

            int assignmentCompletionPercent = totalAssignments == 0
                    ? 0
                    : (int) Math.round((completedAssignments * 100.0) / totalAssignments);

            int totalQuizMarks = 0;
            int totalQuizPossible = 0;
            int quizAttempts = 0;

            for (QuizAttempt attempt : attempts) {
                if (attempt.getSubjectId() != null && attempt.getSubjectId().equals(subject.getId())) {
                    int obtained = attempt.getScoreObtained() == null ? 0 : attempt.getScoreObtained();
                    int total = attempt.getTotalQuestions() == null ? 0 : attempt.getTotalQuestions();
                    totalQuizMarks += obtained;
                    totalQuizPossible += total;
                    quizAttempts++;
                }
            }

            int quizAveragePercent = totalQuizPossible == 0
                    ? 0
                    : (int) Math.round((totalQuizMarks * 100.0) / totalQuizPossible);

            int overallProgress = (int) Math.round((assignmentCompletionPercent * 0.6) + (quizAveragePercent * 0.4));

            Map<String, Object> item = new HashMap<>();
            item.put("subjectId", subject.getId());
            item.put("subjectName", subject.getName());
            item.put("subjectCode", subject.getCode());
            item.put("lecturerName", subject.getLecturerName());
            item.put("lecturerEmail", subject.getLecturerEmail());
            item.put("officeHours", subject.getOfficeHours());
            item.put("yearLevel", subject.getYearLevel());
            item.put("semester", subject.getSemester());
            item.put("completedAssignments", completedAssignments);
            item.put("totalAssignments", totalAssignments);
            item.put("assignmentCompletionPercent", assignmentCompletionPercent);
            item.put("quizAveragePercent", quizAveragePercent);
            item.put("quizAttempts", quizAttempts);
            item.put("overallProgressPercent", overallProgress);
            output.add(item);
        }

        output.sort((a, b) -> {
            Integer p1 = (Integer) a.get("overallProgressPercent");
            Integer p2 = (Integer) b.get("overallProgressPercent");
            int progressCompare = Integer.compare(p2 == null ? 0 : p2, p1 == null ? 0 : p1);
            if (progressCompare != 0) {
                return progressCompare;
            }
            String s1 = String.valueOf(a.get("subjectName")).toLowerCase(Locale.ROOT);
            String s2 = String.valueOf(b.get("subjectName")).toLowerCase(Locale.ROOT);
            return s1.compareTo(s2);
        });

        return ResponseEntity.ok(output);
    }
}
