package backend.Model;

public class KnowledgeChatSource {
    private Long id;
    private String title;
    private String category;

    public KnowledgeChatSource() {}

    public KnowledgeChatSource(Long id, String title, String category) {
        this.id = id;
        this.title = title;
        this.category = category;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }
}
