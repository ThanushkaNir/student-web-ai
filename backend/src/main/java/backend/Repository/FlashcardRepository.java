package backend.Repository;

import backend.Model.Flashcard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface FlashcardRepository extends JpaRepository<Flashcard, Long> {
    List<Flashcard> findBySubjectId(Long subjectId);
    List<Flashcard> findByDocumentId(Long documentId);

    @Transactional
    void deleteByDocumentId(Long documentId);
}