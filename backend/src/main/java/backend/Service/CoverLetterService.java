package backend.Service;

import backend.Model.CoverLetter;
import backend.Model.JobPost;
import backend.Repository.CoverLetterRepository;
import backend.Repository.JobPostRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * AI-powered cover letter generator: extracts job details, identifies key skills,
 * and generates personalized, professional cover letters.
 */
@Service
public class CoverLetterService {

    @Autowired
    private CoverLetterRepository coverLetterRepository;
    @Autowired
    private JobPostRepository jobPostRepository;

    public CoverLetter generateAndSave(Long userId, Long jobId, String jobDescriptionRaw) {
        String jobDesc = jobDescriptionRaw != null ? jobDescriptionRaw : "";
        String jobTitle = "";
        String company = "";

        if (jobId != null) {
            var opt = jobPostRepository.findById(jobId);
            if (opt.isPresent()) {
                var j = opt.get();
                jobTitle = j.getTitle() != null ? j.getTitle() : "";
                company = j.getCompany() != null ? j.getCompany() : "";
                jobDesc = (jobTitle + "\n" + (j.getDescription() != null ? j.getDescription() : "")).trim();
            }
        }

        if (jobTitle.isBlank()) {
            jobTitle = extractJobTitle(jobDesc);
        }

        List<String> keySkills = extractKeySkills(jobDesc);
        List<String> responsibilities = extractResponsibilities(jobDesc);
        String seniority = detectSeniority(jobDesc);

        String generated = generatePersonalizedCoverLetter(jobTitle, company, keySkills, responsibilities, seniority);

        CoverLetter cl = new CoverLetter();
        cl.setUserId(userId);
        cl.setJobId(jobId);
        cl.setJobDescription(jobDesc);
        cl.setGeneratedText(generated);
        return coverLetterRepository.save(cl);
    }

    private String extractJobTitle(String jobDesc) {
        if (jobDesc == null || jobDesc.isBlank()) {
            return "this position";
        }
        String[] lines = jobDesc.split("\\n");
        for (String line : lines) {
            String clean = line.trim();
            if (clean.length() > 5 && clean.length() < 100 && !clean.contains("@") && !clean.startsWith("•")) {
                return clean;
            }
        }
        return "this position";
    }

    private List<String> extractKeySkills(String jobDesc) {
        List<String> skills = new ArrayList<>();
        if (jobDesc == null) return skills;

        String lower = jobDesc.toLowerCase();
        String[] commonSkills = {
                "python", "java", "javascript", "sql", "react", "node",
                "docker", "kubernetes", "aws", "azure", "machine learning",
                "data analysis", "spring", "rest api", "microservices",
                "agile", "scrum", "git", "linux", "ci/cd"
        };

        for (String skill : commonSkills) {
            if (lower.contains(skill.toLowerCase()) && skills.size() < 6) {
                skills.add(capitalizeWords(skill));
            }
        }
        return skills;
    }

    private List<String> extractResponsibilities(String jobDesc) {
        List<String> items = new ArrayList<>();
        if (jobDesc == null) return items;

        String[] lines = jobDesc.split("\\n");
        for (String line : lines) {
            String clean = line.trim();
            if ((clean.startsWith("•") || clean.startsWith("-") || clean.startsWith("*")) && items.size() < 3) {
                String resp = clean.replaceAll("^[•\\-*\\s]+", "").trim();
                if (!resp.isBlank() && resp.length() < 120) {
                    items.add(resp);
                }
            }
        }
        return items;
    }

    private String detectSeniority(String jobDesc) {
        if (jobDesc == null) return "entry";
        String lower = jobDesc.toLowerCase();
        if (lower.contains("senior") || lower.contains("lead") || lower.contains("architect")) {
            return "senior";
        } else if (lower.contains("mid") || lower.contains("experienced")) {
            return "mid";
        } else if (lower.contains("junior") || lower.contains("intern") || lower.contains("entry")) {
            return "entry";
        }
        return "entry";
    }

    private String generatePersonalizedCoverLetter(String jobTitle, String company, List<String> skills, List<String> responsibilities, String seniority) {
        StringBuilder letter = new StringBuilder();
        letter.append("Dear Hiring Manager,\n\n");

        // Opening paragraph
        if (!company.isBlank()) {
            letter.append("I am writing to express my strong interest in the ").append(jobTitle)
                    .append(" position at ").append(company).append(". ");
        } else {
            letter.append("I am writing to express my interest in the ").append(jobTitle).append(" role. ");
        }

        letter.append("I am confident that my background, technical expertise, and passion for technology make me an excellent fit for your team.\n\n");

        // Body - highlight relevant skills and alignment
        if (!skills.isEmpty()) {
            letter.append("With hands-on experience in ").append(String.join(", ", skills.subList(0, Math.min(3, skills.size()))));
            if (skills.size() > 3) {
                letter.append(", and more");
            }
            letter.append(", I am well-positioned to contribute immediately to your team. ");
        }

        if (!responsibilities.isEmpty()) {
            letter.append("I am particularly excited about the opportunity to ").append(responsibilities.get(0).toLowerCase())
                    .append(", as this aligns perfectly with my professional goals. ");
        }

        letter.append("I am eager to bring my problem-solving abilities, attention to detail, and collaborative mindset to your organization.\n\n");

        // Closing paragraph
        letter.append("I would welcome the opportunity to discuss how my background and skills can contribute to your team's success. ");
        letter.append("Thank you for considering my application. I look forward to the possibility of speaking with you soon.\n\n");

        letter.append("Sincerely,\n").append("[Your Name]");

        return letter.toString();
    }

    private String capitalizeWords(String input) {
        if (input == null || input.isBlank()) return input;
        String[] words = input.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String word : words) {
            if (sb.length() > 0) sb.append(" ");
            sb.append(word.substring(0, 1).toUpperCase()).append(word.substring(1));
        }
        return sb.toString();
    }
}
