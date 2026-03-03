package backend.Controller;

import backend.Model.Assignment;
import backend.Model.BlogPost;
import backend.Model.JobPost;
import backend.Model.SupportTicket;
import backend.Model.UserModel;
import backend.Repository.AssignmentRepository;
import backend.Repository.BlogPostRepository;
import backend.Repository.JobPostRepository;
import backend.Repository.SupportTicketRepository;
import backend.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class AdminAnalyticsController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JobPostRepository jobPostRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private BlogPostRepository blogPostRepository;

    @Autowired
    private SupportTicketRepository supportTicketRepository;

    @GetMapping("/analytics")
    public ResponseEntity<?> getAnalytics(@RequestParam Long userId) {
        UserModel requester = userRepository.findById(userId).orElse(null);
        if (requester == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid user"));
        }

        String role = requester.getRole() == null ? "STUDENT" : requester.getRole().trim().toUpperCase(Locale.ROOT);
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Only admins can access analytics"));
        }

        List<UserModel> users = userRepository.findAll();
        List<JobPost> jobs = jobPostRepository.findAll();
        List<Assignment> assignments = assignmentRepository.findAll();
        List<BlogPost> blogs = blogPostRepository.findAll();
        List<SupportTicket> tickets = supportTicketRepository.findAll();

        long totalStudents = users.stream()
                .filter(u -> "STUDENT".equalsIgnoreCase(u.getRole()))
                .count();

        Map<Long, Integer> scoreByUser = new HashMap<>();
        for (Assignment assignment : assignments) {
            if (assignment.getUserId() != null) {
                scoreByUser.merge(assignment.getUserId(), 1, Integer::sum);
            }
        }
        for (JobPost job : jobs) {
            if (job.getPostedBy() != null) {
                scoreByUser.merge(job.getPostedBy(), 1, Integer::sum);
            }
        }
        for (BlogPost blog : blogs) {
            if (blog.getAuthorId() != null) {
                scoreByUser.merge(blog.getAuthorId(), 1, Integer::sum);
            }
        }
        for (SupportTicket ticket : tickets) {
            if (ticket.getUserId() != null) {
                scoreByUser.merge(ticket.getUserId(), 1, Integer::sum);
            }
        }

        Map<Long, UserModel> usersById = new HashMap<>();
        for (UserModel user : users) {
            usersById.put(user.getId(), user);
        }

        List<Map<String, Object>> mostActiveUsers = new ArrayList<>();
        scoreByUser.entrySet().stream()
                .sorted(Map.Entry.<Long, Integer>comparingByValue(Comparator.reverseOrder()))
                .limit(5)
                .forEach(entry -> {
                    UserModel user = usersById.get(entry.getKey());
                    String name = user != null && user.getName() != null ? user.getName() : "User #" + entry.getKey();
                    String userRole = user != null && user.getRole() != null ? user.getRole() : "STUDENT";

                    Map<String, Object> item = new HashMap<>();
                    item.put("userId", entry.getKey());
                    item.put("name", name);
                    item.put("role", userRole);
                    item.put("activityCount", entry.getValue());
                    mostActiveUsers.add(item);
                });

        Map<String, Object> payload = new HashMap<>();
        payload.put("totalStudents", totalStudents);
        payload.put("jobsPosted", jobs.size());
        payload.put("assignmentsCreated", assignments.size());
        payload.put("mostActiveUsers", mostActiveUsers);

        return ResponseEntity.ok(payload);
    }
}
