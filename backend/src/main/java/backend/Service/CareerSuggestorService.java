package backend.Service;

import backend.Model.CareerSuggestion;
import backend.Repository.CareerSuggestionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Mock AI: suggests career path from keywords in interests/skills. Can be replaced with real AI.
 */
@Service
public class CareerSuggestorService {

    private static final Map<String, List<String>> PATH_KEYWORDS = Map.ofEntries(
        Map.entry("Data Scientist / Machine Learning Engineer", List.of(
            "python", "machine learning", "ml", "data analysis", "analytics", "statistics", "sql", "ai", "modeling"
        )),
        Map.entry("DevOps Engineer / Cloud Engineer", List.of(
            "linux", "network", "networking", "cloud", "aws", "azure", "gcp", "docker", "kubernetes", "ci/cd", "automation"
        )),
        Map.entry("Backend Software Engineer", List.of(
            "java", "spring", "api", "backend", "database", "microservices", "node", "architecture"
        )),
        Map.entry("Frontend Engineer / UI Engineer", List.of(
            "frontend", "web", "javascript", "react", "html", "css", "ui", "ux"
        )),
        Map.entry("Mobile App Developer", List.of(
            "mobile", "android", "ios", "flutter", "react native", "kotlin", "swift"
        )),
        Map.entry("Cybersecurity Analyst", List.of(
            "security", "cyber", "penetration", "ethical hacking", "soc", "vulnerability", "network security"
        ))
    );

    @Autowired
    private CareerSuggestionRepository suggestionRepository;

    public CareerSuggestion suggestAndSave(Long userId, String interests, String skills) {
        String normalizedInterests = normalize(interests);
        String normalizedSkills = normalize(skills);
        String combined = normalizedInterests + " " + normalizedSkills;

        if (combined.isBlank()) {
            return saveSuggestion(userId, interests, skills,
                    "Software Engineer",
                    "Add at least 3 skills/interests to get a more personalized career suggestion.");
        }

        Map<String, Integer> scores = new LinkedHashMap<>();
        for (Map.Entry<String, List<String>> e : PATH_KEYWORDS.entrySet()) {
            int score = scorePath(combined, normalizedSkills, normalizedInterests, e.getValue());
            scores.put(e.getKey(), score);
        }

        List<Map.Entry<String, Integer>> ranked = scores.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                .collect(Collectors.toList());

        String bestPath = ranked.isEmpty() ? "Software Engineer" : ranked.get(0).getKey();
        int bestScore = ranked.isEmpty() ? 0 : ranked.get(0).getValue();

        String reason;
        if (bestScore <= 0) {
            reason = "We could not find a strong keyword match yet. Try adding concrete tools (e.g., Python, SQL, Docker, React, Linux).";
        } else {
            List<String> matchedKeywords = PATH_KEYWORDS.getOrDefault(bestPath, List.of()).stream()
                    .filter(combined::contains)
                    .distinct()
                    .limit(5)
                    .collect(Collectors.toList());

            String topAlternatives = ranked.stream()
                    .skip(1)
                    .filter(e -> e.getValue() > 0)
                    .limit(2)
                    .map(Map.Entry::getKey)
                    .collect(Collectors.joining(" | "));

            reason = "Matched keywords: " + (matchedKeywords.isEmpty() ? "general technical profile" : String.join(", ", matchedKeywords)) + ". "
                    + "Recommended path: " + bestPath + ". "
                    + (topAlternatives.isBlank() ? "" : "Also consider: " + topAlternatives + ". ")
                    + "Next step: build 1 project and 1 certification aligned to this path.";
        }

        return saveSuggestion(userId, interests, skills, bestPath, reason);
    }

    private CareerSuggestion saveSuggestion(Long userId, String interests, String skills, String suggestedPath, String reason) {
        CareerSuggestion s = new CareerSuggestion();
        s.setUserId(userId);
        s.setInterests(interests);
        s.setSkills(skills);
        s.setSuggestedPath(suggestedPath);
        s.setReason(reason);
        return suggestionRepository.save(s);
    }

    private int scorePath(String combined, String skills, String interests, List<String> keywords) {
        int score = 0;
        for (String keyword : keywords) {
            if (combined.contains(keyword)) {
                score += 2;
                if (skills.contains(keyword)) {
                    score += 2;
                }
                if (interests.contains(keyword)) {
                    score += 1;
                }
            }
        }
        return score;
    }

    private String normalize(String text) {
        return text == null ? "" : text.toLowerCase().replaceAll("[^a-z0-9+/#\\s]", " ").replaceAll("\\s+", " ").trim();
    }
}
