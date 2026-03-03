package backend.Repository;

import backend.Model.JobApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {
    boolean existsByJobIdAndApplicantId(Long jobId, Long applicantId);
    List<JobApplication> findByApplicantIdOrderByCreatedAtDesc(Long applicantId);
}
