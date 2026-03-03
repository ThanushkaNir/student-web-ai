package backend.Controller;

import backend.Exseption.UserNotFoundException;
import backend.Model.UserModel;
import backend.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class UserController {
    @Autowired
     public UserRepository userRepository;

    @PostMapping("/user")
    public ResponseEntity<?> newUserModel(@RequestBody UserModel newUserModel){
        if (newUserModel.getName() == null || newUserModel.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Name is required"));
        }
        if (newUserModel.getEmail() == null || newUserModel.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }
        if (newUserModel.getPassword() == null || newUserModel.getPassword().trim().length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("message", "Password must be at least 6 characters"));
        }

        String normalizedEmail = newUserModel.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Email is already in use"));
        }

        newUserModel.setName(newUserModel.getName().trim());
        newUserModel.setEmail(normalizedEmail);
        if (newUserModel.getRole() == null || newUserModel.getRole().isBlank()) {
            newUserModel.setRole("STUDENT");
        }

        try {
            UserModel saved = userRepository.save(newUserModel);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Registration failed due to a server error", "error", e.getMessage()));
        }
    }

    //user Login
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody UserModel loginDetails){
        UserModel user = userRepository.findAllByEmail(loginDetails.getEmail())
                .orElseThrow(()-> new UserNotFoundException("User not found:" +loginDetails.getEmail()));

        //Check the pw is matches
        if(user.getPassword().equals(loginDetails.getPassword())){
            Map<String, Object> response = new HashMap<>();
            response.put("message","login successful");
            response.put("id",user.getId());
            response.put("name",user.getName());
            response.put("email",user.getEmail());
            response.put("role",user.getRole() != null ? user.getRole() : "STUDENT");
            response.put("year",user.getYear());
            response.put("profilePhoto", user.getProfilePhoto());
            response.put("bio", user.getBio());
            response.put("skills", user.getSkills());
            response.put("education", user.getEducation());
            return ResponseEntity.ok(response);


        }else {
            return  ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Wrong Password"));
        }
    }
     //Display
        @GetMapping("/user")
        List<UserModel> getAllUsers(){
        return userRepository.findAll();
        }

        @GetMapping("/user/{id}")
       UserModel getUserById(@PathVariable Long id){
        return  userRepository.findById(id)
                .orElseThrow(()-> new UserNotFoundException("User not found:" +id));
        }

    //Update

    @PutMapping("/user/{id}")
    public UserModel updateProfile(
            @RequestBody UserModel newuserModel,
            @PathVariable Long id
    ) {
        return userRepository.findById(id)
                .map(userModel -> {
                    userModel.setName(newuserModel.getName());
                    userModel.setEmail(newuserModel.getEmail());
                    if (newuserModel.getRole() != null && !newuserModel.getRole().isEmpty()) {
                        userModel.setRole(newuserModel.getRole());
                    }
                    if (newuserModel.getYear() != null) {
                        userModel.setYear(newuserModel.getYear());
                    }
                    if (newuserModel.getProfilePhoto() != null) {
                        userModel.setProfilePhoto(newuserModel.getProfilePhoto());
                    }
                    if (newuserModel.getBio() != null) {
                        userModel.setBio(newuserModel.getBio().trim());
                    }
                    if (newuserModel.getSkills() != null) {
                        userModel.setSkills(newuserModel.getSkills().trim());
                    }
                    if (newuserModel.getEducation() != null) {
                        userModel.setEducation(newuserModel.getEducation().trim());
                    }
                    // only update password if provided
                    if (newuserModel.getPassword() != null &&
                            !newuserModel.getPassword().isEmpty()) {
                        userModel.setPassword(newuserModel.getPassword());
                    }

                    return userRepository.save(userModel);
                })
                .orElseThrow(() -> new UserNotFoundException(id));
    }

    //Delete
    @DeleteMapping("/user/{id}")
    String deleteProfile(@PathVariable Long id) {
        if (!userRepository.existsById(id)){
            throw new UserNotFoundException(id);
        }
        userRepository.deleteById(id);
        return "Deleted account " + id;
    }

}
