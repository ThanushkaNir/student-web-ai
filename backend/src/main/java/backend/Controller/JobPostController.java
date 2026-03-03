package backend.Controller;

import backend.Model.JobApplication;
import backend.Model.JobPost;
import backend.Model.UserModel;
import backend.Repository.JobApplicationRepository;
import backend.Repository.JobPostRepository;
import backend.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/jobs")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class JobPostController {

    @Autowired
    private JobPostRepository jobPostRepository;
    @Autowired
    private JobApplicationRepository jobApplicationRepository;
    @Autowired
    private UserRepository userRepository;

    /**
     * List jobs with visibility rule + optional filters.
     * Visibility: only 3rd/4th year students, ALUMNI, ADMIN.
     */
    @GetMapping
    public List<JobPost> list(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String field,
            @RequestParam(required = false) String skills,
            @RequestParam(required = false) String deadlineBefore
    ) {
        UserModel user = userId == null ? null : userRepository.findById(userId).orElse(null);
        if (user == null || !canSeeJobs(user)) {
            return Collections.emptyList();
        }

        LocalDate before = parseDate(deadlineBefore);
        String categoryNorm = normalizeCategory(category);
        String fieldNorm = normalize(field);
        String skillsNorm = normalize(skills);

        return jobPostRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(j -> categoryNorm == null || categoryNorm.equals(normalizeCategory(j.getCategory())))
                .filter(j -> fieldNorm.isBlank() || normalize(j.getField()).contains(fieldNorm))
                .filter(j -> skillsNorm.isBlank() || containsSkills(j.getSkillsRequired(), skillsNorm))
                .filter(j -> before == null || (j.getDeadline() != null && !j.getDeadline().isAfter(before)))
                .filter(j -> isEligibleForUser(j, user))
                .collect(Collectors.toList());
    }

    @GetMapping("/my")
    public List<JobPost> myPosts(@RequestParam Long postedBy) {
        return jobPostRepository.findByPostedByOrderByCreatedAtDesc(postedBy);
    }

    @GetMapping("/my-applications")
    public List<Long> myApplications(@RequestParam Long userId) {
        return jobApplicationRepository.findByApplicantIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(JobApplication::getJobId)
                .distinct()
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobPost> getById(@PathVariable Long id) {
        return jobPostRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody JobPost post) {
        UserModel poster = post.getPostedBy() == null ? null : userRepository.findById(post.getPostedBy()).orElse(null);
        if (poster == null) {
            return ResponseEntity.badRequest().body("Invalid postedBy user");
        }
        String role = safeRole(poster);
        if (!"ALUMNI".equals(role) && !"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only alumni/admin can post jobs");
        }

        normalizePost(post);
        return ResponseEntity.ok(jobPostRepository.save(post));
    }

    @PostMapping("/{id}/apply")
    public ResponseEntity<?> apply(@PathVariable Long id, @RequestBody ApplyRequest request) {
        JobPost job = jobPostRepository.findById(id).orElse(null);
        if (job == null) {
            return ResponseEntity.notFound().build();
        }
        if (request == null || request.userId == null) {
            return ResponseEntity.badRequest().body("userId is required");
        }

        UserModel applicant = userRepository.findById(request.userId).orElse(null);
        if (applicant == null) {
            return ResponseEntity.badRequest().body("Invalid applicant user");
        }

        if (!canSeeJobs(applicant)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only eligible 3rd/4th year students can apply");
        }

        if (!"STUDENT".equals(safeRole(applicant))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only students can apply");
        }
        if (!isEligibleForUser(job, applicant)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("This posting is not eligible for your academic year");
        }

        if (jobApplicationRepository.existsByJobIdAndApplicantId(id, request.userId)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("You already applied for this posting");
        }

        JobApplication application = new JobApplication();
        application.setJobId(id);
        application.setApplicantId(request.userId);
        application.setStatus("APPLIED");
        jobApplicationRepository.save(application);
        return ResponseEntity.ok(application);
    }

    @PutMapping("/{id}")
    public ResponseEntity<JobPost> update(@PathVariable Long id, @RequestBody JobPost body) {
        return jobPostRepository.findById(id)
                .map(j -> {
                    if (body.getTitle() != null) j.setTitle(body.getTitle());
                    if (body.getCompany() != null) j.setCompany(body.getCompany());
                    if (body.getDescription() != null) j.setDescription(body.getDescription());
                    if (body.getCategory() != null) j.setCategory(normalizeCategory(body.getCategory()));
                    if (body.getType() != null) j.setType(body.getType().trim().toUpperCase(Locale.ROOT));
                    if (body.getField() != null) j.setField(body.getField().trim());
                    if (body.getSkillsRequired() != null) j.setSkillsRequired(body.getSkillsRequired().trim());
                    if (body.getDeadline() != null) j.setDeadline(body.getDeadline());
                    if (body.getEligibleYears() != null) j.setEligibleYears(body.getEligibleYears().trim());
                    return ResponseEntity.ok(jobPostRepository.save(j));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!jobPostRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        jobPostRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private void normalizePost(JobPost post) {
        String category = normalizeCategory(post.getCategory());
        post.setCategory(category == null ? "INTERNSHIP" : category);
        if (post.getType() == null || post.getType().isBlank()) {
            post.setType("INTERNSHIP".equals(post.getCategory()) ? "INTERNSHIP" : "JOB");
        } else {
            post.setType(post.getType().trim().toUpperCase(Locale.ROOT));
        }
        if (post.getEligibleYears() == null || post.getEligibleYears().isBlank()) {
            post.setEligibleYears("3,4");
        }
        if (post.getField() != null) {
            post.setField(post.getField().trim());
        }
        if (post.getSkillsRequired() != null) {
            post.setSkillsRequired(post.getSkillsRequired().trim());
        }
    }

    private boolean containsSkills(String skillsRequired, String filterSkills) {
        if (filterSkills.isBlank()) {
            return true;
        }
        String skillsLower = normalize(skillsRequired);
        String[] tokens = filterSkills.split(",");
        for (String token : tokens) {
            String t = token.trim();
            if (!t.isBlank() && !skillsLower.contains(t)) {
                return false;
            }
        }
        return true;
    }

    private boolean canSeeJobs(UserModel user) {
        if (user == null) {
            return false;
        }
        String role = safeRole(user);
        Integer year = user.getYear();
        return "ALUMNI".equals(role)
                || "ADMIN".equals(role)
                || ("STUDENT".equals(role) && year != null && Set.of(3, 4).contains(year));
    }

    private boolean isEligibleForUser(JobPost job, UserModel user) {
        if (job == null || user == null) {
            return false;
        }
        String role = safeRole(user);
        if ("ALUMNI".equals(role) || "ADMIN".equals(role)) {
            return true;
        }
        Integer year = user.getYear();
        if (year == null) {
            return false;
        }
        String eligible = job.getEligibleYears();
        if (eligible == null || eligible.isBlank()) {
            return Set.of(3, 4).contains(year);
        }
        return Arrays.stream(eligible.split(","))
                .map(String::trim)
                .anyMatch(y -> y.equals(String.valueOf(year)));
    }

    private String safeRole(UserModel user) {
        return user.getRole() == null ? "STUDENT" : user.getRole().trim().toUpperCase(Locale.ROOT);
    }

    private String normalize(String text) {
        return text == null ? "" : text.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeCategory(String category) {
        if (category == null || category.isBlank()) {
            return null;
        }
        String value = category.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        if (Set.of("INTERNSHIP", "PART_TIME", "FULL_TIME").contains(value)) {
            return value;
        }
        return null;
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value.trim());
        } catch (Exception e) {
            return null;
        }
    }

    public static class ApplyRequest {
        public Long userId;
    }
}
