package backend.Repository;

import backend.Model.JobPost;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JobPostRepository extends JpaRepository<JobPost, Long> {
    List<JobPost> findAllByOrderByCreatedAtDesc();
    List<JobPost> findByPostedByOrderByCreatedAtDesc(Long postedBy);
    List<JobPost> findByTypeOrderByCreatedAtDesc(String type);
}
