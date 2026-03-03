package backend.Service;

import backend.Model.KnowledgeChatResponse;
import backend.Model.KnowledgeChatSource;
import backend.Model.KnowledgeEntry;
import backend.Repository.KnowledgeEntryRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class KnowledgeChatService {

    private static final int MAX_SOURCES = 3;
    private static final int MAX_SNIPPET = 220;
    private static final Logger logger = LoggerFactory.getLogger(KnowledgeChatService.class);

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${ai.provider:auto}")
    private String provider;

    @Value("${ai.openai.api-key:}")
    private String openAiApiKey;

    @Value("${ai.openai.model:gpt-4o-mini}")
    private String openAiModel;

    @Value("${ai.gemini.api-key:}")
    private String geminiApiKey;

    @Value("${ai.gemini.model:gemini-2.5-flash}")
    private String geminiModel;

    @Value("${ai.allow-general-fallback:true}")
    private boolean allowGeneralFallback;

    @Autowired
    private KnowledgeEntryRepository knowledgeRepository;

    public KnowledgeChatResponse ask(String userMessage) {
        String question = userMessage == null ? "" : userMessage.trim();
        if (question.isEmpty()) {
            return buildFallback("Please enter your question.");
        }

        List<KnowledgeEntry> matches = knowledgeRepository.search(question);
        if (matches.isEmpty()) {
            return buildGeneralAiFallback(question);
        }

        List<KnowledgeEntry> ranked = matches.stream()
                .sorted((a, b) -> Integer.compare(score(b, question), score(a, question)))
                .limit(MAX_SOURCES)
                .collect(Collectors.toList());

        String answer = generateHybridAnswer(question, ranked);
        List<KnowledgeChatSource> sources = ranked.stream()
                .map(entry -> new KnowledgeChatSource(entry.getId(), entry.getTitle(), entry.getCategory()))
                .collect(Collectors.toList());

        KnowledgeChatResponse response = new KnowledgeChatResponse();
        response.setAnswer(answer);
        response.setSources(sources);
        response.setFallback(false);
        response.setGeneralAiAnswer(false);
        response.setAnswerSource("knowledge-base");
        response.setConfidence(calculateConfidence(ranked, question));
        return response;
    }

    private KnowledgeChatResponse buildGeneralAiFallback(String question) {
        if (!allowGeneralFallback) {
            return buildFallback("I could not find an exact answer in the knowledge base. Please try different words or create a support ticket.");
        }

        String answer = tryGenerateGeneralAnswer(question);
        if (answer == null || answer.isBlank()) {
            return buildFallback("I could not find an answer in the knowledge base, and the AI provider is unavailable right now.");
        }

        KnowledgeChatResponse response = new KnowledgeChatResponse();
        response.setAnswer(answer.trim());
        response.setConfidence(0.45);
        response.setSources(Collections.emptyList());
        response.setFallback(false);
        response.setGeneralAiAnswer(true);
        response.setAnswerSource(resolveProviderLabel());
        return response;
    }

    private String tryGenerateGeneralAnswer(String question) {
        String selected = provider == null ? "auto" : provider.trim().toLowerCase(Locale.ROOT);
        if (selected.equals("openai")) {
            return callOpenAiGeneral(question);
        }
        if (selected.equals("gemini")) {
            return callGeminiGeneral(question);
        }

        String openAi = callOpenAiGeneral(question);
        if (openAi != null && !openAi.isBlank()) {
            return openAi;
        }
        return callGeminiGeneral(question);
    }

    private String generateHybridAnswer(String question, List<KnowledgeEntry> ranked) {
        String llmAnswer = tryGenerateWithConfiguredProvider(question, ranked);
        if (llmAnswer != null && !llmAnswer.isBlank()) {
            return llmAnswer.trim();
        }
        return buildAnswer(ranked);
    }

    private String tryGenerateWithConfiguredProvider(String question, List<KnowledgeEntry> ranked) {
        String selected = provider == null ? "auto" : provider.trim().toLowerCase(Locale.ROOT);
        if (selected.equals("openai")) {
            return callOpenAi(question, ranked);
        }
        if (selected.equals("gemini")) {
            return callGemini(question, ranked);
        }

        // auto mode: try OpenAI first, then Gemini
        String openAi = callOpenAi(question, ranked);
        if (openAi != null && !openAi.isBlank()) {
            return openAi;
        }
        return callGemini(question, ranked);
    }

    private String callOpenAi(String question, List<KnowledgeEntry> ranked) {
        if (openAiApiKey == null || openAiApiKey.isBlank()) {
            return null;
        }
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", openAiModel);
            body.put("temperature", 0.2);
            body.put("messages", List.of(
                    Map.of("role", "system", "content", "You are a university assistant. Use only the provided context. If unsure, say you are not sure."),
                    Map.of("role", "user", "content", buildPrompt(question, ranked))
            ));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                    .header("Authorization", "Bearer " + openAiApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                logger.warn("Gemini KB call failed: status={}, body={}", response.statusCode(), response.body());
                return null;
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            if (content.isMissingNode() || content.isNull()) {
                return null;
            }
            return content.asText();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return null;
        } catch (IOException ex) {
            logger.warn("Gemini KB call exception", ex);
            return null;
        }
    }

    private String callGemini(String question, List<KnowledgeEntry> ranked) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            return null;
        }
        try {
            String encodedKey = URLEncoder.encode(geminiApiKey, StandardCharsets.UTF_8);
            String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + geminiModel + ":generateContent?key=" + encodedKey;

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("contents", List.of(
                    Map.of("parts", List.of(
                            Map.of("text", buildPrompt(question, ranked))
                    ))
            ));
            body.put("generationConfig", Map.of("temperature", 0.2));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                logger.warn("Gemini general call failed: status={}, body={}", response.statusCode(), response.body());
                return null;
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
            if (textNode.isMissingNode() || textNode.isNull()) {
                return null;
            }
            return textNode.asText();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return null;
        } catch (IOException ex) {
            logger.warn("Gemini general call exception", ex);
            return null;
        }
    }

    private String callOpenAiGeneral(String question) {
        if (openAiApiKey == null || openAiApiKey.isBlank()) {
            return null;
        }
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", openAiModel);
            body.put("temperature", 0.4);
            body.put("messages", List.of(
                    Map.of("role", "system", "content", "You are a helpful university assistant. Answer clearly and briefly. If the answer may vary by university, say that the student should verify with their university."),
                    Map.of("role", "user", "content", "Question: " + question)
            ));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                    .header("Authorization", "Bearer " + openAiApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return null;
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            if (content.isMissingNode() || content.isNull()) {
                return null;
            }
            return "General AI answer:\n" + content.asText().trim();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return null;
        } catch (IOException ex) {
            return null;
        }
    }

    private String callGeminiGeneral(String question) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            return null;
        }
        try {
            String encodedKey = URLEncoder.encode(geminiApiKey, StandardCharsets.UTF_8);
            String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + geminiModel + ":generateContent?key=" + encodedKey;

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("contents", List.of(
                    Map.of("parts", List.of(
                            Map.of("text", "You are a helpful university assistant. Answer clearly and briefly. If the answer may vary by university, tell the student to verify with their university.\n\nQuestion: " + question)
                    ))
            ));
            body.put("generationConfig", Map.of("temperature", 0.4));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return null;
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
            if (textNode.isMissingNode() || textNode.isNull()) {
                return null;
            }
            return "General AI answer:\n" + textNode.asText().trim();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return null;
        } catch (IOException ex) {
            return null;
        }
    }

    private String buildPrompt(String question, List<KnowledgeEntry> ranked) {
        StringBuilder context = new StringBuilder();
        for (int i = 0; i < ranked.size(); i++) {
            KnowledgeEntry entry = ranked.get(i);
            context.append(i + 1)
                    .append(") Title: ").append(safe(entry.getTitle()))
                    .append("\nCategory: ").append(safe(entry.getCategory()))
                    .append("\nContent: ").append(trimSnippet(safe(entry.getContent())))
                    .append("\n\n");
        }
        return "Question:\n" + question + "\n\n"
                + "Knowledge base context:\n" + context
                + "Instructions:\n"
                + "- Answer only using this context.\n"
                + "- Keep answer clear and student-friendly.\n"
                + "- If context is insufficient, clearly say that.\n";
    }

    private KnowledgeChatResponse buildFallback(String message) {
        KnowledgeChatResponse response = new KnowledgeChatResponse();
        response.setAnswer(message);
        response.setConfidence(0.0);
        response.setSources(Collections.emptyList());
        response.setFallback(true);
        response.setGeneralAiAnswer(false);
        response.setAnswerSource("fallback");
        return response;
    }

    private String resolveProviderLabel() {
        String selected = provider == null ? "auto" : provider.trim().toLowerCase(Locale.ROOT);
        if (selected.equals("openai")) {
            return "openai";
        }
        if (selected.equals("gemini")) {
            return "gemini";
        }
        if (openAiApiKey != null && !openAiApiKey.isBlank()) {
            return "openai";
        }
        if (geminiApiKey != null && !geminiApiKey.isBlank()) {
            return "gemini";
        }
        return "fallback";
    }

    private int score(KnowledgeEntry entry, String query) {
        String q = query.toLowerCase(Locale.ROOT);
        String title = safe(entry.getTitle()).toLowerCase(Locale.ROOT);
        String content = safe(entry.getContent()).toLowerCase(Locale.ROOT);
        String category = safe(entry.getCategory()).toLowerCase(Locale.ROOT);

        int value = 0;
        if (title.contains(q)) value += 5;
        if (content.contains(q)) value += 3;
        if (category.contains(q)) value += 2;

        for (String token : q.split("\\s+")) {
            if (token.length() < 3) continue;
            if (title.contains(token)) value += 2;
            if (content.contains(token)) value += 1;
            if (category.contains(token)) value += 1;
        }
        return value;
    }

    private String buildAnswer(List<KnowledgeEntry> entries) {
        StringBuilder builder = new StringBuilder();
        builder.append("Based on the knowledge base, here is what I found:\n\n");
        for (int i = 0; i < entries.size(); i++) {
            KnowledgeEntry entry = entries.get(i);
            builder.append(i + 1).append(". ")
                    .append(safe(entry.getTitle()));
            if (entry.getCategory() != null && !entry.getCategory().isBlank()) {
                builder.append(" (").append(entry.getCategory()).append(")");
            }
            builder.append(": ")
                    .append(trimSnippet(safe(entry.getContent())))
                    .append("\n");
        }
        return builder.toString().trim();
    }

    private double calculateConfidence(List<KnowledgeEntry> entries, String query) {
        int combined = entries.stream().mapToInt(entry -> score(entry, query)).sum();
        double normalized = Math.min(1.0, combined / 20.0);
        return Math.round(normalized * 100.0) / 100.0;
    }

    private String trimSnippet(String content) {
        String normalized = content.replaceAll("\\s+", " ").trim();
        if (normalized.length() <= MAX_SNIPPET) return normalized;
        return normalized.substring(0, MAX_SNIPPET) + "...";
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
