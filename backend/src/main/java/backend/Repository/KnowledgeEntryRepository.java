package backend.Repository;

import backend.Model.KnowledgeEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface KnowledgeEntryRepository extends JpaRepository<KnowledgeEntry, Long> {
    List<KnowledgeEntry> findAllByOrderByCategoryAscTitleAsc();
    List<KnowledgeEntry> findByCategoryOrderByTitleAsc(String category);

    @Query("SELECT k FROM KnowledgeEntry k WHERE LOWER(k.title) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(k.content) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(k.category) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<KnowledgeEntry> search(@Param("q") String query);
}
