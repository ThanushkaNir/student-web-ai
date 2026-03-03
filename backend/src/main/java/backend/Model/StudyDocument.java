package backend.Model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "study_documents")
public class StudyDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(name = "subject_id", nullable = false)
    private Long subjectId;

    /** PDF or TEXT */
    @Column(nullable = false)
    private String type = "TEXT";

    /** Original file extension/type for uploaded files, e.g. pdf, doc, docx */
    @Column(name = "file_type")
    private String fileType;

    @Column(name = "week_number")
    private Integer weekNumber;

    @Column(name = "lecture_topic")
    private String lectureTopic;

    /** For TEXT: content stored here. For PDF: file path. */
    @Column(columnDefinition = "TEXT")
    private String contentOrPath;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public StudyDocument() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public Long getSubjectId() { return subjectId; }
    public void setSubjectId(Long subjectId) { this.subjectId = subjectId; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }
    public Integer getWeekNumber() { return weekNumber; }
    public void setWeekNumber(Integer weekNumber) { this.weekNumber = weekNumber; }
    public String getLectureTopic() { return lectureTopic; }
    public void setLectureTopic(String lectureTopic) { this.lectureTopic = lectureTopic; }
    public String getContentOrPath() { return contentOrPath; }
    public void setContentOrPath(String contentOrPath) { this.contentOrPath = contentOrPath; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
