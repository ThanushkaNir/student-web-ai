package backend.Service;

import backend.Model.JobPost;
import backend.Model.Resume;
import backend.Model.ResumeMatch;
import backend.Repository.JobPostRepository;
import backend.Repository.ResumeMatchRepository;
import backend.Repository.ResumeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Mock AI: computes match score from keyword overlap. Can be replaced with real AI.
 */
@Service
public class ResumeMatcherService {

    private static final List<String> CORE_SKILLS = List.of(
            "python", "java", "sql", "machine learning", "ml", "data analysis", "statistics",
            "docker", "kubernetes", "aws", "azure", "gcp", "linux", "ci/cd",
            "react", "node", "javascript", "spring", "git", "rest", "api",
            "excel", "power bi", "tableau"
    );

    @Autowired
    private ResumeRepository resumeRepository;
    @Autowired
    private JobPostRepository jobPostRepository;
    @Autowired
    private ResumeMatchRepository matchRepository;

    private static Set<String> tokenize(String text) {
        if (text == null || text.isBlank()) return Set.of();
        return Arrays.stream(text.toLowerCase().split("\\s+"))
                .map(s -> s.replaceAll("[^a-z0-9]", ""))
                .filter(s -> s.length() > 1)
                .collect(Collectors.toSet());
    }

    public ResumeMatch computeAndSave(Long userId, Long resumeId, Long jobId) {
        Resume resume = resumeRepository.findById(resumeId).orElse(null);
        JobPost job = jobPostRepository.findById(jobId).orElse(null);
        if (resume == null || job == null) return null;

        String resumeText = resume.getContent() != null ? resume.getContent() : "";
        String jobText = (job.getTitle() != null ? job.getTitle() + " " : "") + (job.getDescription() != null ? job.getDescription() : "");

        String resumeLower = resumeText.toLowerCase();
        String jobLower = jobText.toLowerCase();

        Set<String> resumeSkillSet = extractMentionedSkills(resumeLower);
        Set<String> jobSkillSet = extractMentionedSkills(jobLower);

        Set<String> resumeWords = tokenize(resumeText);
        Set<String> jobWords = tokenize(jobText);
        if (jobWords.isEmpty()) jobWords = Set.of("skill", "experience");

        long overlap = resumeWords.stream().filter(jobWords::contains).count();

        double keywordScore = jobWords.isEmpty() ? 0.0 : (double) overlap / Math.max(1, jobWords.size());
        double skillScore;
        if (jobSkillSet.isEmpty()) {
            skillScore = keywordScore;
        } else {
            long matchedSkills = jobSkillSet.stream().filter(resumeSkillSet::contains).count();
            skillScore = (double) matchedSkills / jobSkillSet.size();
        }

        boolean hasEducation = containsAny(resumeLower, List.of("bsc", "bachelor", "degree", "university", "diploma", "education"));
        boolean hasExperience = containsAny(resumeLower, List.of("experience", "intern", "project", "worked", "employment"));

        int score = (int) Math.round(
                Math.min(1.0, skillScore) * 70
                        + Math.min(1.0, keywordScore) * 20
                        + (hasEducation ? 5 : 0)
                        + (hasExperience ? 5 : 0)
        );
        score = Math.max(0, Math.min(100, score));

        List<String> missing = (jobSkillSet.isEmpty() ? jobWords : jobSkillSet).stream()
                .filter(w -> !resumeLower.contains(w.toLowerCase()))
                .limit(8)
                .collect(Collectors.toList());

        String pointsToImprove;
        if (missing.isEmpty()) {
            pointsToImprove = "Great alignment. Consider quantifying achievements and adding measurable project impact for an even stronger profile.";
        } else {
            String top = missing.stream().limit(3).collect(Collectors.joining(", "));
            pointsToImprove = "Add " + top + " experience for better match.";
        }

        ResumeMatch match = new ResumeMatch();
        match.setUserId(userId);
        match.setResumeId(resumeId);
        match.setJobId(jobId);
        match.setScorePercent(score);
        match.setPointsToImprove(pointsToImprove);
        return matchRepository.save(match);
    }

    private Set<String> extractMentionedSkills(String text) {
        return CORE_SKILLS.stream()
                .filter(text::contains)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private boolean containsAny(String text, List<String> terms) {
        return terms.stream().anyMatch(text::contains);
    }
}
