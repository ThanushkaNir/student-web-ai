package backend.Service;

import backend.Model.Question;
import backend.Repository.QuestionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Generates exam-style MCQs from study material.
 * Keeps questions tied to the uploaded text and avoids vague generic prompts.
 */
@Service
public class McqGeneratorService {

    @Autowired
    private QuestionRepository questionRepository;

    private static final Pattern SENTENCE = Pattern.compile("[^.!?]+[.!?]");
    private static final Pattern TOKEN = Pattern.compile("[A-Za-z][A-Za-z0-9-]{2,}");
    private static final int REQUIRED_MIN_QUESTIONS = 20;
    private static final int MIN_TEXT_LENGTH = 20;
    private static final int MIN_SENTENCE_LENGTH = 10;

    private static final Set<String> STOPWORDS = Set.of(
        "the", "and", "for", "that", "with", "this", "from", "have", "are", "was", "were", "been",
        "into", "their", "about", "which", "when", "where", "your", "you", "they", "them", "there",
        "than", "then", "will", "would", "could", "should", "also", "using", "used", "use", "such",
        "many", "most", "more", "less", "some", "each", "only", "very", "between", "after", "before",
        "note", "notes", "document", "study", "students", "student", "is", "it", "be", "has", "do",
        "perform", "multiple", "another", "even", "across", "while"
    );

    public List<String> extractSentences(String text) {
        if (text == null || text.trim().length() < MIN_TEXT_LENGTH) {
            return Collections.emptyList();
        }
        String cleaned = text.replaceAll("\\s+", " ").trim();
        List<String> list = new ArrayList<>();
        Matcher matcher = SENTENCE.matcher(cleaned);
        while (matcher.find()) {
            list.add(matcher.group().trim());
        }
        return list;
    }

    public List<Question> generateAndSave(Long subjectId, Long documentId, String text) {
        List<String> sentences = extractSentences(text).stream()
                .filter(s -> s.length() >= MIN_SENTENCE_LENGTH)
                .collect(Collectors.toList());
        if (sentences.isEmpty()) {
            return Collections.emptyList();
        }

        questionRepository.deleteByDocumentId(documentId);

        Map<String, String> displayTerms = buildDisplayTerms(text);
        List<String> conceptKeywords = extractConceptKeywords(text);
        List<String> allKeywords = buildKeywordPool(text);
        Random random = new Random((documentId != null ? documentId : 0L) + text.length());

        List<Question> questions = new ArrayList<>();
        Set<String> seenQuestions = new HashSet<>();

        for (String sentence : sentences) {
            if (questions.size() >= REQUIRED_MIN_QUESTIONS) {
                break;
            }

            String keyword = pickBestKeywordForSentence(sentence, conceptKeywords, allKeywords);
            if (keyword == null) {
                continue;
            }

            Question q = buildSentenceQuestion(
                    subjectId,
                    documentId,
                    sentence,
                    keyword,
                    conceptKeywords,
                    allKeywords,
                    displayTerms,
                    random,
                    questions.size()
            );
            if (q == null || !seenQuestions.add(q.getQuestionText())) {
                continue;
            }
            questions.add(questionRepository.save(q));
        }

        if (questions.size() < REQUIRED_MIN_QUESTIONS) {
            addFallbackQuestions(subjectId, documentId, sentences, conceptKeywords, allKeywords, displayTerms, questions, random, seenQuestions);
        }

        return questions;
    }

    private void addFallbackQuestions(
            Long subjectId,
            Long documentId,
            List<String> sentences,
            List<String> conceptKeywords,
            List<String> allKeywords,
            Map<String, String> displayTerms,
            List<Question> questions,
            Random random,
            Set<String> seenQuestions
    ) {
        if (sentences.isEmpty()) {
            return;
        }

        List<String> shuffledSentences = new ArrayList<>(sentences);
        Collections.shuffle(shuffledSentences, random);

        for (String sentence : shuffledSentences) {
            if (questions.size() >= REQUIRED_MIN_QUESTIONS) {
                return;
            }

            String keyword = pickBestKeywordForSentence(sentence, allKeywords, conceptKeywords);
            if (keyword == null) {
                continue;
            }

            Question q = buildSentenceQuestion(
                    subjectId,
                    documentId,
                    sentence,
                    keyword,
                    conceptKeywords,
                    allKeywords,
                    displayTerms,
                    random,
                    questions.size()
            );
            if (q == null || !seenQuestions.add(q.getQuestionText())) {
                continue;
            }
            questions.add(questionRepository.save(q));
        }
    }

    private Question buildSentenceQuestion(
            Long subjectId,
            Long documentId,
            String sentence,
            String keyword,
            List<String> conceptKeywords,
            List<String> allKeywords,
            Map<String, String> displayTerms,
            Random random,
            int questionIndex
    ) {
        if (questionIndex % 2 == 0) {
            Question cloze = buildClozeFillQuestion(subjectId, documentId, sentence, keyword, conceptKeywords, allKeywords, displayTerms, random);
            if (cloze != null) {
                return cloze;
            }
        }
        return buildConceptQuestion(subjectId, documentId, sentence, keyword, conceptKeywords, allKeywords, displayTerms, random);
    }

    private Question buildClozeFillQuestion(
            Long subjectId,
            Long documentId,
            String sentence,
            String keyword,
            List<String> conceptKeywords,
            List<String> allKeywords,
            Map<String, String> displayTerms,
            Random random
    ) {
        String displayKeyword = displayTerm(keyword, displayTerms);
        String masked = sentence.replaceFirst("(?i)\\b" + Pattern.quote(keyword) + "\\b", "_____");
        if (masked.equals(sentence)) {
            return null;
        }

        String questionText = "Choose the correct word to complete the sentence. \"" + truncate(masked, 180) + "\"";
        List<String> options = buildSemanticOptions(keyword, conceptKeywords, allKeywords, displayTerms, random);
        if (options.size() < 4) {
            return null;
        }
        return buildQuestionWithOptions(subjectId, documentId, questionText, options, displayKeyword, random);
    }

    private Question buildConceptQuestion(
            Long subjectId,
            Long documentId,
            String sentence,
            String keyword,
            List<String> conceptKeywords,
            List<String> allKeywords,
            Map<String, String> displayTerms,
            Random random
    ) {
        String displayKeyword = displayTerm(keyword, displayTerms);
        String normalizedSentence = normalizeSentenceForQuestion(sentence);
        if (normalizedSentence == null) {
            return null;
        }
        String questionText;
        if (looksLikeAcronym(displayKeyword)) {
            questionText = "What is the main function of " + displayKeyword + "?";
        } else if (looksLikeContainerConcept(displayKeyword)) {
            questionText = "What is meant by \"" + displayKeyword + "\" in this context?";
        } else {
            questionText = "Which statement best describes \"" + displayKeyword + "\"?";
        }

        List<String> options = buildConceptOptions(keyword, normalizedSentence, conceptKeywords, allKeywords, displayTerms, random);
        if (options.size() < 4) {
            return null;
        }
        return buildQuestionWithOptions(subjectId, documentId, questionText, options, displayKeyword, random);
    }

    private Question buildQuestionWithOptions(
            Long subjectId,
            Long documentId,
            String questionText,
            List<String> options,
            String correct,
            Random random
    ) {
        List<String> shuffled = new ArrayList<>(options);
        Collections.shuffle(shuffled, random);

        Question q = new Question();
        q.setSubjectId(subjectId);
        q.setDocumentId(documentId);
        q.setQuestionText(questionText);
        q.setOptionA(shuffled.get(0));
        q.setOptionB(shuffled.get(1));
        q.setOptionC(shuffled.get(2));
        q.setOptionD(shuffled.get(3));
        q.setCorrectAnswer(letterForCorrect(shuffled, correct));
        return q;
    }

    private String letterForCorrect(List<String> options, String correct) {
        for (int i = 0; i < options.size(); i++) {
            if (options.get(i).equalsIgnoreCase(correct)) {
                return switch (i) {
                    case 0 -> "A";
                    case 1 -> "B";
                    case 2 -> "C";
                    default -> "D";
                };
            }
        }
        return "A";
    }

    private Map<String, String> buildDisplayTerms(String text) {
        Map<String, String> displayTerms = new HashMap<>();
        Matcher matcher = TOKEN.matcher(text);
        while (matcher.find()) {
            String original = matcher.group();
            String normalized = original.toLowerCase(Locale.ROOT);
            displayTerms.putIfAbsent(normalized, normalizeDisplayToken(original));
        }
        return displayTerms;
    }

    private List<String> buildKeywordPool(String text) {
        Map<String, Integer> counts = new HashMap<>();
        Matcher matcher = TOKEN.matcher(text);
        while (matcher.find()) {
            String token = matcher.group().toLowerCase(Locale.ROOT);
            if (token.length() >= 4 && !STOPWORDS.contains(token)) {
                counts.merge(token, 1, Integer::sum);
            }
        }

        return counts.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                .map(Map.Entry::getKey)
                .limit(80)
                .collect(Collectors.toList());
    }

    private List<String> extractConceptKeywords(String text) {
        Map<String, Integer> counts = new HashMap<>();
        Matcher matcher = TOKEN.matcher(text);
        while (matcher.find()) {
            String token = matcher.group().toLowerCase(Locale.ROOT);
            if (token.length() >= 4 && !STOPWORDS.contains(token)) {
                counts.merge(token, 1, Integer::sum);
            }
        }

        return counts.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                .map(Map.Entry::getKey)
                .limit(40)
                .collect(Collectors.toList());
    }

    private String pickBestKeywordForSentence(String sentence, List<String> primaryPool, List<String> secondaryPool) {
        String lower = sentence.toLowerCase(Locale.ROOT);
        for (String token : primaryPool) {
            if (containsWholeWord(lower, token)) {
                return token;
            }
        }
        for (String token : secondaryPool) {
            if (containsWholeWord(lower, token)) {
                return token;
            }
        }
        return pickKeywordFromSentence(sentence);
    }

    private String pickKeywordFromSentence(String sentence) {
        Matcher matcher = TOKEN.matcher(sentence);
        while (matcher.find()) {
            String token = matcher.group().toLowerCase(Locale.ROOT);
            if (token.length() >= 4 && !STOPWORDS.contains(token)) {
                return token;
            }
        }
        return null;
    }

    private boolean containsWholeWord(String sentence, String token) {
        return Pattern.compile("(?i)\\b" + Pattern.quote(token) + "\\b").matcher(sentence).find();
    }

    private List<String> buildSemanticOptions(
            String correctAnswer,
            List<String> primaryPool,
            List<String> fallbackPool,
            Map<String, String> displayTerms,
            Random random
    ) {
        LinkedHashSet<String> options = new LinkedHashSet<>();
        options.add(displayTerm(correctAnswer, displayTerms));

        addMatchingCandidates(options, correctAnswer, primaryPool, displayTerms, random);
        if (options.size() < 4) {
            addMatchingCandidates(options, correctAnswer, fallbackPool, displayTerms, random);
        }

        return new ArrayList<>(options);
    }

    private List<String> buildConceptOptions(
            String correctAnswer,
            String sentence,
            List<String> primaryPool,
            List<String> fallbackPool,
            Map<String, String> displayTerms,
            Random random
    ) {
        LinkedHashSet<String> options = new LinkedHashSet<>();
        options.add(displayTerm(correctAnswer, displayTerms));

        addSentenceBasedCandidates(options, correctAnswer, sentence, displayTerms);
        addMatchingCandidates(options, correctAnswer, primaryPool, displayTerms, random);
        if (options.size() < 4) {
            addMatchingCandidates(options, correctAnswer, fallbackPool, displayTerms, random);
        }

        return new ArrayList<>(options);
    }

    private void addSentenceBasedCandidates(
            LinkedHashSet<String> options,
            String correctAnswer,
            String sentence,
            Map<String, String> displayTerms
    ) {
        Matcher matcher = TOKEN.matcher(sentence);
        while (matcher.find()) {
            if (options.size() >= 4) {
                return;
            }
            String token = matcher.group().toLowerCase(Locale.ROOT);
            if (token.equalsIgnoreCase(correctAnswer)) {
                continue;
            }
            if (!isCompatibleDistractor(correctAnswer, token)) {
                continue;
            }
            options.add(displayTerm(token, displayTerms));
        }
    }

    private void addMatchingCandidates(
            LinkedHashSet<String> options,
            String correctAnswer,
            List<String> pool,
            Map<String, String> displayTerms,
            Random random
    ) {
        List<String> candidates = new ArrayList<>(pool);
        Collections.shuffle(candidates, random);
        for (String candidate : candidates) {
            if (options.size() >= 4) {
                return;
            }
            if (candidate.equalsIgnoreCase(correctAnswer)) {
                continue;
            }
            if (!isCompatibleDistractor(correctAnswer, candidate)) {
                continue;
            }
            options.add(displayTerm(candidate, displayTerms));
        }
    }

    private boolean isCompatibleDistractor(String correct, String candidate) {
        if (candidate == null || candidate.length() < 3) {
            return false;
        }
        if (STOPWORDS.contains(candidate.toLowerCase(Locale.ROOT))) {
            return false;
        }
        boolean correctAcronym = isAcronymLike(correct);
        boolean candidateAcronym = isAcronymLike(candidate);
        if (correctAcronym != candidateAcronym) {
            return false;
        }
        if (candidate.equals(candidate.toUpperCase(Locale.ROOT)) && !correctAcronym) {
            return false;
        }
        if (candidate.equalsIgnoreCase("while") || candidate.equalsIgnoreCase("even") || candidate.equalsIgnoreCase("across")) {
            return false;
        }
        if (candidate.equalsIgnoreCase("important") || candidate.equalsIgnoreCase("ensuring") || candidate.equalsIgnoreCase("these")) {
            return false;
        }

        int correctLength = correct.length();
        int candidateLength = candidate.length();
        return Math.abs(correctLength - candidateLength) <= Math.max(4, correctLength / 2);
    }

    private boolean isAcronymLike(String token) {
        return token.length() <= 6 && token.equals(token.toUpperCase(Locale.ROOT));
    }

    private String displayTerm(String token, Map<String, String> displayTerms) {
        return displayTerms.getOrDefault(token.toLowerCase(Locale.ROOT), normalizeDisplayToken(token));
    }

    private String normalizeDisplayToken(String token) {
        if (token == null || token.isBlank()) {
            return token;
        }
        if (token.equals(token.toUpperCase(Locale.ROOT)) && token.length() <= 6 && token.matches("[A-Z0-9]+")) {
            return token.toUpperCase(Locale.ROOT);
        }
        return token.substring(0, 1).toUpperCase(Locale.ROOT) + token.substring(1).toLowerCase(Locale.ROOT);
    }

    private static String truncate(String s, int max) {
        if (s == null || s.length() <= max) {
            return s;
        }
        return s.substring(0, max) + "...";
    }

    private static String truncateToSentenceBoundary(String s, int max) {
        if (s == null || s.length() <= max) {
            return s;
        }
        int boundary = Math.max(s.lastIndexOf(' ', max), s.lastIndexOf(',', max));
        if (boundary < max / 2) {
            boundary = max;
        }
        return s.substring(0, boundary).trim() + "...";
    }

    private String normalizeSentenceForQuestion(String sentence) {
        if (sentence == null) {
            return null;
        }
        String cleaned = sentence.replaceAll("\\s+", " ").trim();
        if (cleaned.length() > 220) {
            return null;
        }
        if (cleaned.endsWith("...")) {
            return null;
        }
        if (!cleaned.endsWith(".") && !cleaned.endsWith("?") && !cleaned.endsWith("!")) {
            cleaned = cleaned + ".";
        }
        return cleaned;
    }

    private boolean looksLikeAcronym(String token) {
        return token != null && token.length() <= 6 && token.equals(token.toUpperCase(Locale.ROOT));
    }

    private boolean looksLikeContainerConcept(String token) {
        if (token == null) {
            return false;
        }
        String normalized = token.toLowerCase(Locale.ROOT);
        return normalized.equals("database") || normalized.equals("table") || normalized.equals("record")
                || normalized.equals("attribute") || normalized.equals("schema");
    }
}
