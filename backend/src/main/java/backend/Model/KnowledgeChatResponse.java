package backend.Model;

import java.util.List;

public class KnowledgeChatResponse {
    private String answer;
    private double confidence;
    private List<KnowledgeChatSource> sources;
    private boolean fallback;
    private boolean generalAiAnswer;
    private String answerSource;

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    public double getConfidence() {
        return confidence;
    }

    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }

    public List<KnowledgeChatSource> getSources() {
        return sources;
    }

    public void setSources(List<KnowledgeChatSource> sources) {
        this.sources = sources;
    }

    public boolean isFallback() {
        return fallback;
    }

    public void setFallback(boolean fallback) {
        this.fallback = fallback;
    }

    public boolean isGeneralAiAnswer() {
        return generalAiAnswer;
    }

    public void setGeneralAiAnswer(boolean generalAiAnswer) {
        this.generalAiAnswer = generalAiAnswer;
    }

    public String getAnswerSource() {
        return answerSource;
    }

    public void setAnswerSource(String answerSource) {
        this.answerSource = answerSource;
    }
}
