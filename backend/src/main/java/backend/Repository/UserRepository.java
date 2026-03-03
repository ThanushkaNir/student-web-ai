package backend.Repository;


import backend.Model.UserModel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<UserModel, Long> {
    Optional<UserModel> findAllByEmail(String email);
    boolean existsByEmailIgnoreCase(String email);
}
