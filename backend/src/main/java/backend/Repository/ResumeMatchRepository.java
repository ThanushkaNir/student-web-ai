package backend.Repository;

import backend.Model.ResumeMatch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ResumeMatchRepository extends JpaRepository<ResumeMatch, Long> {
    List<ResumeMatch> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<ResumeMatch> findByUserIdAndJobId(Long userId, Long jobId);
}
