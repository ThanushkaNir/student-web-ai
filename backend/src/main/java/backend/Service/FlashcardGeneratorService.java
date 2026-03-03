package backend.Service;

import backend.Model.Flashcard;
import backend.Repository.FlashcardRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class FlashcardGeneratorService {

    @Autowired
    private FlashcardRepository flashcardRepository;

    private static final Pattern SENTENCE = Pattern.compile("[^.!?]+[.!?]");
    private static final Pattern TOKEN = Pattern.compile("[A-Za-z][A-Za-z0-9-]{2,}");
    private static final int MIN_TEXT_LENGTH = 20;
    private static final int MIN_SENTENCE_LENGTH = 18;
    private static final int REQUIRED_MIN_FLASHCARDS = 10;
    private static final Set<String> STOPWORDS = Set.of(
            "the", "and", "for", "that", "with", "this", "from", "have", "are", "was", "were", "been",
            "into", "their", "about", "which", "when", "where", "your", "you", "they", "them", "there",
            "than", "then", "will", "would", "could", "should", "also", "using", "used", "use", "such",
            "many", "most", "more", "less", "some", "each", "only", "very", "between", "after", "before",
            "note", "notes", "document", "study", "students", "student"
    );

    public List<Flashcard> generateAndSave(Long subjectId, Long documentId, String text) {
        List<String> points = extractPoints(text);
        if (points.isEmpty()) return Collections.emptyList();

        flashcardRepository.deleteByDocumentId(documentId);

        List<String> keywordPool = buildKeywordPool(text);

        List<Flashcard> cards = new ArrayList<>();
        LinkedHashSet<String> seenFronts = new LinkedHashSet<>();
        for (String point : points) {
            String keyword = pickKeyword(point, keywordPool);
            String front = buildFrontPrompt(point, keyword);

            if (!seenFronts.add(front)) {
                front = buildFallbackPrompt(point, keyword);
            }

            Flashcard card = new Flashcard();
            card.setSubjectId(subjectId);
            card.setDocumentId(documentId);
            card.setFrontText(front);
            card.setBackText(normalizeBackText(point));
            cards.add(flashcardRepository.save(card));
        }

        int index = 0;
        while (cards.size() < REQUIRED_MIN_FLASHCARDS) {
            String point = points.get(index % points.size());
            String keyword = pickKeyword(point, keywordPool);
            Flashcard card = new Flashcard();
            card.setSubjectId(subjectId);
            card.setDocumentId(documentId);
            card.setFrontText(buildReviewPrompt(point, keyword));
            card.setBackText(normalizeBackText(point));
            cards.add(flashcardRepository.save(card));
            index++;
        }

        return cards;
    }

    private List<String> extractPoints(String text) {
        if (text == null || text.trim().length() < MIN_TEXT_LENGTH) return Collections.emptyList();
        String cleaned = text.replaceAll("\\s+", " ").trim();
        java.util.regex.Matcher matcher = SENTENCE.matcher(cleaned);
        List<String> sentences = new ArrayList<>();
        while (matcher.find()) {
            sentences.add(matcher.group().trim());
        }

        if (sentences.isEmpty()) {
            return List.of(cleaned);
        }

        return sentences.stream()
                .filter(s -> s.length() >= MIN_SENTENCE_LENGTH)
                .limit(20)
                .collect(Collectors.toList());
    }

    private String maskSentence(String sentence, String keyword) {
        if (keyword == null || keyword.isBlank()) return sentence;
        return sentence.replaceFirst("(?i)\\b" + Pattern.quote(keyword) + "\\b", "_____");
    }

    private List<String> buildKeywordPool(String text) {
        Map<String, Integer> counts = new HashMap<>();
        java.util.regex.Matcher matcher = TOKEN.matcher(text);
        while (matcher.find()) {
            String token = matcher.group().toLowerCase(Locale.ROOT);
            if (token.length() < 4 || STOPWORDS.contains(token)) continue;
            counts.merge(token, 1, Integer::sum);
        }

        return counts.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                .map(Map.Entry::getKey)
                .limit(80)
                .collect(Collectors.toList());
    }

    private String pickKeyword(String sentence, List<String> keywordPool) {
        String lower = sentence.toLowerCase(Locale.ROOT);
        for (String token : keywordPool) {
            if (lower.contains(token)) return token;
        }

        java.util.regex.Matcher matcher = TOKEN.matcher(sentence);
        while (matcher.find()) {
            String token = matcher.group().toLowerCase(Locale.ROOT);
            if (token.length() >= 4 && !STOPWORDS.contains(token)) return token;
        }
        return null;
    }

    private String buildFrontPrompt(String point, String keyword) {
        if (keyword == null) {
            return "What is the main idea of this concept?";
        }

        String displayKeyword = toDisplayTerm(keyword);
        String lowerPoint = point.toLowerCase(Locale.ROOT);
        if (lowerPoint.contains(" is ") || lowerPoint.contains(" are ")) {
            return "Define \"" + displayKeyword + "\".";
        }
        if (lowerPoint.contains(" used to ") || lowerPoint.contains(" used for ") || lowerPoint.contains(" purpose ")) {
            return "What is the function of \"" + displayKeyword + "\"?";
        }
        if (lowerPoint.contains(" consists of ") || lowerPoint.contains(" includes ") || lowerPoint.contains(" contains ")) {
            return "What does \"" + displayKeyword + "\" include?";
        }
        if (lowerPoint.contains(" important ") || lowerPoint.contains(" ensures ") || lowerPoint.contains(" helps ")) {
            return "Why is \"" + displayKeyword + "\" important?";
        }
        return "Which concept is described by this statement?";
    }

    private String buildFallbackPrompt(String point, String keyword) {
        String masked = truncate(maskSentence(point, keyword), 140);
        return "Complete the statement: \"" + masked + "\"";
    }

    private String buildReviewPrompt(String point, String keyword) {
        if (keyword == null) {
            return "Summarize this concept in one sentence.";
        }
        String displayKeyword = toDisplayTerm(keyword);
        String lowerPoint = point.toLowerCase(Locale.ROOT);
        if (lowerPoint.contains(" advantage ") || lowerPoint.contains(" benefit ")) {
            return "What is an advantage of \"" + displayKeyword + "\"?";
        }
        if (lowerPoint.contains(" manage ") || lowerPoint.contains(" control ")) {
            return "How does \"" + displayKeyword + "\" help in this topic?";
        }
        return "Explain \"" + displayKeyword + "\" in simple terms.";
    }

    private String normalizeBackText(String point) {
        String cleaned = truncate(point == null ? "" : point.trim(), 220);
        if (cleaned.isEmpty()) {
            return cleaned;
        }
        char last = cleaned.charAt(cleaned.length() - 1);
        if (last != '.' && last != '!' && last != '?') {
            cleaned = cleaned + ".";
        }
        return cleaned;
    }

    private String toDisplayTerm(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return keyword;
        }
        if (keyword.length() <= 6 && keyword.matches("[A-Za-z0-9]+")) {
            return keyword.toUpperCase(Locale.ROOT);
        }
        return keyword.substring(0, 1).toUpperCase(Locale.ROOT) + keyword.substring(1).toLowerCase(Locale.ROOT);
    }

    private static String truncate(String value, int max) {
        if (value == null || value.length() <= max) return value;
        return value.substring(0, max) + "...";
    }
}