package backend.Controller;

import backend.Model.Subject;
import backend.Model.UserModel;
import backend.Repository.SubjectRepository;
import backend.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/subjects")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class SubjectController {

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public List<Subject> getAll(
            @RequestParam(required = false) Integer yearLevel,
            @RequestParam(required = false) Integer semester
    ) {
        if (yearLevel != null && semester != null) {
            return subjectRepository.findByYearLevelAndSemesterOrderByNameAsc(yearLevel, semester);
        }
        if (yearLevel != null) {
            return subjectRepository.findByYearLevelOrderByNameAsc(yearLevel);
        }
        return subjectRepository.findAllByOrderByNameAsc();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Subject subject, @RequestParam Long userId) {
        ResponseEntity<?> unauthorized = rejectNonAdminSubjectWrite(userId);
        if (unauthorized != null) {
            return unauthorized;
        }

        if (subject.getName() != null) {
            subject.setName(subject.getName().trim());
        }
        if (subject.getCode() != null) {
            subject.setCode(subject.getCode().trim());
        }
        if (subject.getLecturerName() != null) {
            subject.setLecturerName(subject.getLecturerName().trim());
        }
        if (subject.getLecturerEmail() != null) {
            subject.setLecturerEmail(subject.getLecturerEmail().trim());
        }
        if (subject.getOfficeHours() != null) {
            subject.setOfficeHours(subject.getOfficeHours().trim());
        }
        if (subject.getDescription() != null) {
            subject.setDescription(subject.getDescription().trim());
        }
        return ResponseEntity.ok(subjectRepository.save(subject));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Subject> getById(@PathVariable Long id) {
        return subjectRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Subject body, @RequestParam Long userId) {
        ResponseEntity<?> unauthorized = rejectNonAdminSubjectWrite(userId);
        if (unauthorized != null) {
            return unauthorized;
        }

        return subjectRepository.findById(id)
                .map(subject -> {
                    if (body.getName() != null) subject.setName(body.getName().trim());
                    if (body.getCode() != null) subject.setCode(body.getCode().trim());
                    if (body.getLecturerName() != null) subject.setLecturerName(body.getLecturerName().trim());
                    if (body.getLecturerEmail() != null) subject.setLecturerEmail(body.getLecturerEmail().trim());
                    if (body.getOfficeHours() != null) subject.setOfficeHours(body.getOfficeHours().trim());
                    if (body.getDescription() != null) subject.setDescription(body.getDescription().trim());
                    if (body.getYearLevel() != null) subject.setYearLevel(body.getYearLevel());
                    if (body.getSemester() != null) subject.setSemester(body.getSemester());
                    return ResponseEntity.ok(subjectRepository.save(subject));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, @RequestParam Long userId) {
        ResponseEntity<?> unauthorized = rejectNonAdminSubjectWrite(userId);
        if (unauthorized != null) {
            return unauthorized;
        }

        if (!subjectRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        subjectRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<?> rejectNonAdminSubjectWrite(Long userId) {
        UserModel requester = userRepository.findById(userId).orElse(null);
        if (requester == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid user"));
        }

        String role = requester.getRole() == null
                ? "STUDENT"
                : requester.getRole().trim().toUpperCase(Locale.ROOT);
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Only admins can add, edit, or delete subjects"));
        }
        return null;
    }
}
