package backend.Repository;

import backend.Model.StudyDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface StudyDocumentRepository extends JpaRepository<StudyDocument, Long> {
    List<StudyDocument> findBySubjectIdOrderByCreatedAtDesc(Long subjectId);
    List<StudyDocument> findBySubjectIdAndUserIdOrderByCreatedAtDesc(Long subjectId, Long userId);
    List<StudyDocument> findByUserIdOrderByCreatedAtDesc(Long userId);
    boolean existsByIdAndUserId(Long id, Long userId);
    List<StudyDocument> findBySubjectIdInAndUserIdAndTitleContainingIgnoreCaseOrderByCreatedAtDesc(List<Long> subjectIds, Long userId, String title);
    List<StudyDocument> findBySubjectIdInAndTitleContainingIgnoreCaseOrderByCreatedAtDesc(List<Long> subjectIds, String title);

    @Query("SELECT d FROM StudyDocument d WHERE d.subjectId = :subjectId AND (d.userId IS NULL OR d.userId = :userId) ORDER BY d.createdAt DESC")
    List<StudyDocument> findVisibleBySubjectIdOrderByCreatedAtDesc(@Param("subjectId") Long subjectId, @Param("userId") Long userId);
}
