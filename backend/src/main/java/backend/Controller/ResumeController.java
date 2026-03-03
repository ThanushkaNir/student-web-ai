package backend.Controller;

import backend.Config.UploadConfig;
import backend.Model.Resume;
import backend.Repository.ResumeRepository;
import backend.Service.PdfTextService;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/resumes")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class ResumeController {

    @Autowired
    private ResumeRepository resumeRepository;

    @Autowired
    private UploadConfig uploadConfig;

    @Autowired
    private PdfTextService pdfTextService;

    @GetMapping
    public List<Resume> getByUser(@RequestParam Long userId) {
        return resumeRepository.findByUserIdOrderByUploadedAtDesc(userId);
    }

    @GetMapping("/latest")
    public ResponseEntity<Resume> getLatest(@RequestParam Long userId) {
        return resumeRepository.findFirstByUserIdOrderByUploadedAtDesc(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resume> getById(@PathVariable Long id) {
        return resumeRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Resume create(@RequestBody Resume resume) {
        return resumeRepository.save(resume);
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadResume(
            @RequestParam Long userId,
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty.");
        }

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "resume";
        String lowerName = originalName.toLowerCase();
        byte[] bytes = file.getBytes();

        String extractedText;
        if (lowerName.endsWith(".pdf")) {
            try (ByteArrayInputStream inputStream = new ByteArrayInputStream(bytes)) {
                extractedText = pdfTextService.extractText(inputStream);
            }
        } else if (lowerName.endsWith(".docx")) {
            extractedText = extractDocxText(new ByteArrayInputStream(bytes));
        } else if (lowerName.endsWith(".txt")) {
            extractedText = new String(bytes, StandardCharsets.UTF_8);
        } else {
            return ResponseEntity.badRequest().body("Unsupported file type. Please upload PDF, DOCX, or TXT.");
        }

        if (extractedText == null || extractedText.trim().length() < 20) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Could not extract enough text from the uploaded CV.");
        }

        String ext = ".txt";
        int dot = originalName.lastIndexOf('.');
        if (dot >= 0 && dot < originalName.length() - 1) {
            ext = originalName.substring(dot);
        }

        Path dest = uploadConfig.getUploadPath().resolve(UUID.randomUUID() + ext);
        Files.write(dest, bytes);

        Resume resume = new Resume();
        resume.setUserId(userId);
        resume.setContent(extractedText.trim());
        resume.setFilePath(dest.toAbsolutePath().toString());
        return ResponseEntity.ok(resumeRepository.save(resume));
    }

    private String extractDocxText(InputStream inputStream) throws IOException {
        StringBuilder sb = new StringBuilder();
        try (XWPFDocument document = new XWPFDocument(inputStream)) {
            document.getParagraphs().forEach(p -> {
                if (p != null && p.getText() != null) {
                    sb.append(p.getText()).append("\n");
                }
            });
            document.getTables().forEach(table -> table.getRows().forEach(row -> row.getTableCells().forEach(cell -> {
                if (cell != null && cell.getText() != null) {
                    sb.append(cell.getText()).append(" ");
                }
            })));
        }
        return sb.toString();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!resumeRepository.existsById(id))
            return ResponseEntity.notFound().build();
        resumeRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
