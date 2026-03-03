package backend.Repository;

import backend.Model.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SubjectRepository extends JpaRepository<Subject, Long> {
    List<Subject> findAllByOrderByNameAsc();
    List<Subject> findByYearLevelOrderByNameAsc(Integer yearLevel);
    List<Subject> findByYearLevelAndSemesterOrderByNameAsc(Integer yearLevel, Integer semester);
}
