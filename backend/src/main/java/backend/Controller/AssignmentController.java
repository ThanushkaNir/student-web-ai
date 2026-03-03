package backend.Controller;

import backend.Model.Assignment;
import backend.Repository.AssignmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/assignments")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class AssignmentController {

    @Autowired
    private AssignmentRepository assignmentRepository;

    @GetMapping
    public List<Assignment> getAll(@RequestParam Long userId, @RequestParam(required = false) Long subjectId) {
        if (subjectId != null) {
            return assignmentRepository.findByUserIdAndSubjectIdOrderByDueDateAsc(userId, subjectId);
        }
        return assignmentRepository.findByUserIdOrderByDueDateAsc(userId);
    }

    @GetMapping("/by-subject")
    public List<Assignment> getBySubject(@RequestParam Long userId, @RequestParam Long subjectId) {
        return assignmentRepository.findByUserIdAndSubjectIdOrderByDueDateAsc(userId, subjectId);
    }

    @GetMapping("/by-status")
    public List<Assignment> getByStatus(@RequestParam Long userId, @RequestParam String status) {
        return assignmentRepository.findByUserIdAndStatusOrderByDueDateAsc(userId, normalizeStatus(status));
    }

    @GetMapping("/completed-recent")
    public List<Assignment> getCompletedRecent(
            @RequestParam Long userId,
            @RequestParam(defaultValue = "5") int limit
    ) {
        int safeLimit = Math.max(1, Math.min(limit, 20));
        return assignmentRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, "COMPLETED")
                .stream()
                .limit(safeLimit)
                .toList();
    }

    /** Deadline reminder: assignments due within next N days (default 7). */
    @GetMapping("/due-soon")
    public List<Assignment> getDueSoon(
            @RequestParam Long userId,
            @RequestParam(defaultValue = "7") int days
    ) {
        LocalDate today = LocalDate.now();
        LocalDate end = today.plusDays(days);
        return assignmentRepository.findByUserIdAndStatusAndDueDateBetweenOrderByDueDateAsc(
            userId,
            "PENDING",
            today,
            end
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<Assignment> getById(@PathVariable Long id) {
        return assignmentRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Assignment create(@RequestBody Assignment assignment) {
        if (assignment.getSubject() != null) {
            assignment.setSubject(assignment.getSubject().trim());
        }
        assignment.setStatus(normalizeStatus(assignment.getStatus()));
        if ("COMPLETED".equals(assignment.getStatus())) {
            assignment.setCompletedAt(LocalDateTime.now());
        } else {
            assignment.setCompletedAt(null);
        }
        return assignmentRepository.save(assignment);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Assignment> update(@PathVariable Long id, @RequestBody Assignment body) {
        return assignmentRepository.findById(id)
                .map(a -> {
                    if (body.getName() != null) a.setName(body.getName());
                    if (body.getSubject() != null) a.setSubject(body.getSubject());
                    if (body.getSubjectId() != null) a.setSubjectId(body.getSubjectId());
                    if (body.getDueDate() != null) a.setDueDate(body.getDueDate());
                    if (body.getDueTime() != null) a.setDueTime(body.getDueTime());
                    if (body.getStatus() != null) {
                        String nextStatus = normalizeStatus(body.getStatus());
                        a.setStatus(nextStatus);
                        if ("COMPLETED".equals(nextStatus)) {
                            if (a.getCompletedAt() == null) {
                                a.setCompletedAt(LocalDateTime.now());
                            }
                        } else {
                            a.setCompletedAt(null);
                        }
                    }
                    return ResponseEntity.ok(assignmentRepository.save(a));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Assignment> updateStatus(@PathVariable Long id, @RequestParam String status) {
        return assignmentRepository.findById(id)
                .map(a -> {
                    String nextStatus = normalizeStatus(status);
                    a.setStatus(nextStatus);
                    if ("COMPLETED".equals(nextStatus)) {
                        if (a.getCompletedAt() == null) {
                            a.setCompletedAt(LocalDateTime.now());
                        }
                    } else {
                        a.setCompletedAt(null);
                    }
                    return ResponseEntity.ok(assignmentRepository.save(a));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "PENDING";
        }
        String normalized = status.trim().toUpperCase();
        if ("DONE".equals(normalized) || "COMPLETED".equals(normalized) || "COMPLETE".equals(normalized)) {
            return "COMPLETED";
        }
        return "PENDING";
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!assignmentRepository.existsById(id))
            return ResponseEntity.notFound().build();
        assignmentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
