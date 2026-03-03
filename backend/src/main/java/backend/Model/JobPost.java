package backend.Model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "job_posts")
public class JobPost {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private String company;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "posted_by", nullable = false)
    private Long postedBy;

    /** Legacy field: JOB or INTERNSHIP */
    @Column(nullable = false)
    private String type = "JOB";

    /** INTERNSHIP, PART_TIME, FULL_TIME */
    @Column(nullable = false)
    private String category = "INTERNSHIP";

    /** Domain/track: e.g., Software, Data Science, Networking */
    private String field;

    /** Comma-separated skills to match in UI filters */
    @Column(name = "skills_required", columnDefinition = "TEXT")
    private String skillsRequired;

    /** Last date to apply */
    private LocalDate deadline;

    /** Eligible years: defaults to 3rd & 4th */
    @Column(name = "eligible_years")
    private String eligibleYears = "3,4";

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public JobPost() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getPostedBy() { return postedBy; }
    public void setPostedBy(Long postedBy) { this.postedBy = postedBy; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getField() { return field; }
    public void setField(String field) { this.field = field; }
    public String getSkillsRequired() { return skillsRequired; }
    public void setSkillsRequired(String skillsRequired) { this.skillsRequired = skillsRequired; }
    public LocalDate getDeadline() { return deadline; }
    public void setDeadline(LocalDate deadline) { this.deadline = deadline; }
    public String getEligibleYears() { return eligibleYears; }
    public void setEligibleYears(String eligibleYears) { this.eligibleYears = eligibleYears; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
