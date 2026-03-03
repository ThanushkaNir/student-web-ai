package backend.Controller;

import backend.Model.SupportTicket;
import backend.Repository.SupportTicketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tickets")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class SupportTicketController {

    @Autowired
    private SupportTicketRepository ticketRepository;

    @GetMapping("/my")
    public List<SupportTicket> getMyTickets(@RequestParam Long userId) {
        return ticketRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @GetMapping("/all")
    public List<SupportTicket> getAllTickets() {
        return ticketRepository.findAllByOrderByCreatedAtDesc();
    }

    @GetMapping("/by-status")
    public List<SupportTicket> getByStatus(@RequestParam String status) {
        return ticketRepository.findByStatusOrderByCreatedAtDesc(status);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SupportTicket> getById(@PathVariable Long id) {
        return ticketRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public SupportTicket create(@RequestBody SupportTicket ticket) {
        if (ticket.getStatus() == null) ticket.setStatus("OPEN");
        ticket.setCreatedAt(LocalDateTime.now());
        ticket.setUpdatedAt(LocalDateTime.now());
        return ticketRepository.save(ticket);
    }

    @PutMapping("/{id}")
    public ResponseEntity<SupportTicket> update(@PathVariable Long id, @RequestBody SupportTicket body) {
        return ticketRepository.findById(id)
                .map(t -> {
                    if (body.getSubject() != null) t.setSubject(body.getSubject());
                    if (body.getDescription() != null) t.setDescription(body.getDescription());
                    if (body.getStatus() != null) t.setStatus(body.getStatus());
                    if (body.getAssignedTo() != null) t.setAssignedTo(body.getAssignedTo());
                    if (body.getResponse() != null) t.setResponse(body.getResponse());
                    t.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(ticketRepository.save(t));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<SupportTicket> updateStatus(@PathVariable Long id, @RequestParam String status) {
        return ticketRepository.findById(id)
                .map(t -> {
                    t.setStatus(status);
                    t.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(ticketRepository.save(t));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/assign")
    public ResponseEntity<SupportTicket> assign(@PathVariable Long id, @RequestParam Long assignedTo) {
        return ticketRepository.findById(id)
                .map(t -> {
                    t.setAssignedTo(assignedTo);
                    t.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(ticketRepository.save(t));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/response")
    public ResponseEntity<SupportTicket> addResponse(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String response = body != null ? body.get("response") : null;
        return ticketRepository.findById(id)
                .map(t -> {
                    t.setResponse(response);
                    t.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(ticketRepository.save(t));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!ticketRepository.existsById(id))
            return ResponseEntity.notFound().build();
        ticketRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
