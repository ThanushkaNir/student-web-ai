package backend.Model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "resume_matches")
public class ResumeMatch {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "resume_id")
    private Long resumeId;

    @Column(name = "job_id", nullable = false)
    private Long jobId;

    @Column(name = "score_percent")
    private Integer scorePercent;

    @Column(name = "points_to_improve", columnDefinition = "TEXT")
    private String pointsToImprove;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public ResumeMatch() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getResumeId() { return resumeId; }
    public void setResumeId(Long resumeId) { this.resumeId = resumeId; }
    public Long getJobId() { return jobId; }
    public void setJobId(Long jobId) { this.jobId = jobId; }
    public Integer getScorePercent() { return scorePercent; }
    public void setScorePercent(Integer scorePercent) { this.scorePercent = scorePercent; }
    public String getPointsToImprove() { return pointsToImprove; }
    public void setPointsToImprove(String pointsToImprove) { this.pointsToImprove = pointsToImprove; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
