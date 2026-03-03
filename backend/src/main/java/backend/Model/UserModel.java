package backend.Model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;

@Entity
public class UserModel {
    @Id
    @GeneratedValue
    private Long id;
    private String name;
    private String email;
    private String password;
    /** Role: STUDENT, ALUMNI, ADMIN */
    private String role = "STUDENT";
    /** Student year: 1, 2, 3, 4 (for job visibility: only 3rd/4th see jobs) */
    private Integer year;
    @Lob
    private String profilePhoto;
    @Lob
    private String bio;
    @Lob
    private String skills;
    @Lob
    private String education;

    public UserModel() {
    }

    public UserModel(Long id, String name, String email, String password, String role) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.password = password;
        this.role = role != null ? role : "STUDENT";
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role != null ? role : "STUDENT";
    }

    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }

    public String getProfilePhoto() {
        return profilePhoto;
    }

    public void setProfilePhoto(String profilePhoto) {
        this.profilePhoto = profilePhoto;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getSkills() {
        return skills;
    }

    public void setSkills(String skills) {
        this.skills = skills;
    }

    public String getEducation() {
        return education;
    }

    public void setEducation(String education) {
        this.education = education;
    }
}
