package backend.Repository;

import backend.Model.SupportTicket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
    List<SupportTicket> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<SupportTicket> findAllByOrderByCreatedAtDesc();
    List<SupportTicket> findByStatusOrderByCreatedAtDesc(String status);
    List<SupportTicket> findByAssignedToOrderByCreatedAtDesc(Long assignedTo);
}
