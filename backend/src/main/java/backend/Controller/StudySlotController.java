package backend.Controller;

import backend.Model.StudySlot;
import backend.Repository.StudySlotRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/study-slots")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class StudySlotController {

    @Autowired
    private StudySlotRepository studySlotRepository;

    @GetMapping
    public List<StudySlot> getByDateRange(
            @RequestParam Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end
    ) {
        return studySlotRepository.findByUserIdAndSlotDateBetweenOrderBySlotDateAscStartTimeAsc(userId, start, end);
    }

    @GetMapping("/{id}")
    public ResponseEntity<StudySlot> getById(@PathVariable Long id) {
        return studySlotRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public StudySlot create(@RequestBody StudySlot slot) {
        slot.setType(normalizeType(slot.getType()));
        if (slot.getTitle() != null) slot.setTitle(slot.getTitle().trim());
        if (slot.getDetails() != null) slot.setDetails(slot.getDetails().trim());
        return studySlotRepository.save(slot);
    }

    @PutMapping("/{id}")
    public ResponseEntity<StudySlot> update(@PathVariable Long id, @RequestBody StudySlot body) {
        return studySlotRepository.findById(id)
                .map(s -> {
                    if (body.getSlotDate() != null) s.setSlotDate(body.getSlotDate());
                    if (body.getTitle() != null) s.setTitle(body.getTitle());
                    if (body.getType() != null) s.setType(normalizeType(body.getType()));
                    if (body.getDetails() != null) s.setDetails(body.getDetails().trim());
                    if (body.getStartTime() != null) s.setStartTime(body.getStartTime());
                    if (body.getEndTime() != null) s.setEndTime(body.getEndTime());
                    if (body.getDurationMinutes() != null) s.setDurationMinutes(body.getDurationMinutes());
                    return ResponseEntity.ok(studySlotRepository.save(s));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private String normalizeType(String type) {
        if (type == null || type.isBlank()) return "STUDY";
        String normalized = type.trim().toUpperCase(Locale.ROOT);
        if ("EVENT".equals(normalized) || "EXAM".equals(normalized) || "STUDY".equals(normalized)) {
            return normalized;
        }
        return "STUDY";
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!studySlotRepository.existsById(id))
            return ResponseEntity.notFound().build();
        studySlotRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
