package backend.Repository;

import backend.Model.CareerSuggestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CareerSuggestionRepository extends JpaRepository<CareerSuggestion, Long> {
    List<CareerSuggestion> findByUserIdOrderByCreatedAtDesc(Long userId);
}
