package backend.Model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "flashcards")
public class Flashcard {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "subject_id")
    private Long subjectId;

    @Column(name = "document_id")
    private Long documentId;

    @Column(name = "front_text", nullable = false, columnDefinition = "TEXT")
    private String frontText;

    @Column(name = "back_text", nullable = false, columnDefinition = "TEXT")
    private String backText;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public Flashcard() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getSubjectId() { return subjectId; }
    public void setSubjectId(Long subjectId) { this.subjectId = subjectId; }
    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }
    public String getFrontText() { return frontText; }
    public void setFrontText(String frontText) { this.frontText = frontText; }
    public String getBackText() { return backText; }
    public void setBackText(String backText) { this.backText = backText; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}