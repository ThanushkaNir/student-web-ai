package backend.Repository;

import backend.Model.NoteBookmark;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NoteBookmarkRepository extends JpaRepository<NoteBookmark, Long> {
    Optional<NoteBookmark> findByUserIdAndDocumentId(Long userId, Long documentId);
    List<NoteBookmark> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<NoteBookmark> findByUserIdAndDocumentIdInOrderByCreatedAtDesc(Long userId, List<Long> documentIds);
    void deleteByUserIdAndDocumentId(Long userId, Long documentId);
    void deleteByDocumentId(Long documentId);
}