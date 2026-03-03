package backend.Config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class UploadConfig {

    @Value("${app.upload.dir:${java.io.tmpdir}/itpm-uploads}")
    private String uploadDir;

    private Path path;

    @PostConstruct
    public void init() throws IOException {
        path = Paths.get(uploadDir).toAbsolutePath();
        Files.createDirectories(path);
    }

    public Path getUploadPath() {
        return path;
    }

    public String getUploadDir() {
        return uploadDir;
    }
}
