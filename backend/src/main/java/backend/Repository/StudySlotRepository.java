package backend.Repository;

import backend.Model.StudySlot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface StudySlotRepository extends JpaRepository<StudySlot, Long> {
    List<StudySlot> findByUserIdAndSlotDateBetweenOrderBySlotDateAscStartTimeAsc(Long userId, LocalDate start, LocalDate end);
}
