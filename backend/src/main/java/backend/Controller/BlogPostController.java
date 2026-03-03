package backend.Controller;

import backend.Model.BlogPost;
import backend.Repository.BlogPostRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/blog")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class BlogPostController {

    @Autowired
    private BlogPostRepository blogPostRepository;

    @GetMapping
    public List<BlogPost> list() {
        return blogPostRepository.findAllByOrderByCreatedAtDesc();
    }

    @GetMapping("/my")
    public List<BlogPost> myPosts(@RequestParam Long authorId) {
        return blogPostRepository.findByAuthorIdOrderByCreatedAtDesc(authorId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BlogPost> getById(@PathVariable Long id) {
        return blogPostRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public BlogPost create(@RequestBody BlogPost post) {
        return blogPostRepository.save(post);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BlogPost> update(@PathVariable Long id, @RequestBody BlogPost body) {
        return blogPostRepository.findById(id)
                .map(b -> {
                    if (body.getTitle() != null) b.setTitle(body.getTitle());
                    if (body.getContent() != null) b.setContent(body.getContent());
                    return ResponseEntity.ok(blogPostRepository.save(b));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!blogPostRepository.existsById(id))
            return ResponseEntity.notFound().build();
        blogPostRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
