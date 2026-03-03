package backend.Repository;

import backend.Model.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    List<Assignment> findByUserIdOrderByDueDateAsc(Long userId);
    List<Assignment> findByUserIdAndSubjectIdOrderByDueDateAsc(Long userId, Long subjectId);
    List<Assignment> findByUserIdAndStatusOrderByDueDateAsc(Long userId, String status);
    List<Assignment> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, String status);
    /** For reminders: assignments due on or before endDate and on or after startDate */
    List<Assignment> findByUserIdAndDueDateBetweenOrderByDueDateAsc(Long userId, LocalDate startDate, LocalDate endDate);
    List<Assignment> findByUserIdAndStatusAndDueDateBetweenOrderByDueDateAsc(
            Long userId,
            String status,
            LocalDate startDate,
            LocalDate endDate
    );
}
