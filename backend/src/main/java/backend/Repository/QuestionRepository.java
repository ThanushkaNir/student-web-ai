package backend.Repository;

import backend.Model.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findBySubjectId(Long subjectId);
    List<Question> findByDocumentId(Long documentId);

    @Transactional
    void deleteByDocumentId(Long documentId);
}
