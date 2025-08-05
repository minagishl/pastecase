// PasteCase - Clipboard Manager Application
// Local storage management using IndexedDB

class PasteCaseDB {
  constructor() {
    this.dbName = "PasteCaseDB";
    this.version = 1;
    this.db = null;
  }

  // Initialize IndexedDB
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create clips object store
        if (!db.objectStoreNames.contains("clips")) {
          const store = db.createObjectStore("clips", {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("type", "type", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
          store.createIndex("tags", "tags", {
            unique: false,
            multiEntry: true,
          });
        }
      };
    });
  }

  // Save clip
  async saveClip(clipData) {
    const transaction = this.db.transaction(["clips"], "readwrite");
    const store = transaction.objectStore("clips");

    const clip = {
      ...clipData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.add(clip);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all clips
  async getAllClips() {
    const transaction = this.db.transaction(["clips"], "readonly");
    const store = transaction.objectStore("clips");

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Delete clip
  async deleteClip(id) {
    const transaction = this.db.transaction(["clips"], "readwrite");
    const store = transaction.objectStore("clips");

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Search clips
  async searchClips(query, type = null) {
    const clips = await this.getAllClips();
    return clips.filter((clip) => {
      const matchesType = !type || clip.type === type;
      const matchesQuery =
        !query ||
        clip.content.toLowerCase().includes(query.toLowerCase()) ||
        (clip.memo && clip.memo.toLowerCase().includes(query.toLowerCase())) ||
        clip.tags.some((tag) =>
          tag.toLowerCase().includes(query.toLowerCase())
        );

      return matchesType && matchesQuery;
    });
  }
}

class PasteCaseApp {
  constructor() {
    this.db = new PasteCaseDB();
    this.clips = [];
    this.currentSort = "newest";
    this.currentFilter = "";
    this.currentSearch = "";

    this.init();
  }

  async init() {
    try {
      await this.db.init();
      await this.loadClips();
      this.bindEvents();
      this.renderClips();
    } catch (error) {
      console.error("Initialization error:", error);
      this.showError("Failed to initialize the application");
    }
  }

  // Bind events
  bindEvents() {
    // Modal related events
    document
      .getElementById("add-text-btn")
      .addEventListener("click", () => this.showTextModal());
    document
      .getElementById("add-image-btn")
      .addEventListener("click", () => this.showImageModal());

    // Text modal events
    document
      .getElementById("text-modal-cancel")
      .addEventListener("click", () => this.hideTextModal());
    document
      .getElementById("text-modal-save")
      .addEventListener("click", () => this.saveTextClip());

    // Image modal events
    document
      .getElementById("image-modal-cancel")
      .addEventListener("click", () => this.hideImageModal());
    document
      .getElementById("image-modal-save")
      .addEventListener("click", () => this.saveImageClip());
    document
      .getElementById("image-input")
      .addEventListener("change", (e) => this.previewImage(e));

    // Search and filter events
    document
      .getElementById("search-input")
      .addEventListener("input", (e) => this.handleSearch(e.target.value));
    document
      .getElementById("category-filter")
      .addEventListener("change", (e) => this.handleFilter(e.target.value));
    document
      .getElementById("sort-select")
      .addEventListener("change", (e) => this.handleSort(e.target.value));

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => this.handleKeyboard(e));

    // Close modal on outside click
    document.getElementById("text-modal").addEventListener("click", (e) => {
      if (e.target.id === "text-modal") this.hideTextModal();
    });
    document.getElementById("image-modal").addEventListener("click", (e) => {
      if (e.target.id === "image-modal") this.hideImageModal();
    });
  }

  // Load clips
  async loadClips() {
    try {
      this.clips = await this.db.getAllClips();
    } catch (error) {
      console.error("Clip loading error:", error);
      this.showError("Failed to load data");
    }
  }

  // Render clips
  renderClips() {
    const container = document.getElementById("clips-container");
    const emptyState = document.getElementById("empty-state");

    let filteredClips = this.clips;

    // Apply search filter
    if (this.currentSearch) {
      filteredClips = filteredClips.filter(
        (clip) =>
          clip.content
            .toLowerCase()
            .includes(this.currentSearch.toLowerCase()) ||
          (clip.memo &&
            clip.memo
              .toLowerCase()
              .includes(this.currentSearch.toLowerCase())) ||
          clip.tags.some((tag) =>
            tag.toLowerCase().includes(this.currentSearch.toLowerCase())
          )
      );
    }

    // Apply category filter
    if (this.currentFilter) {
      filteredClips = filteredClips.filter(
        (clip) => clip.type === this.currentFilter
      );
    }

    // Apply sorting
    filteredClips.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return this.currentSort === "newest" ? dateB - dateA : dateA - dateB;
    });

    if (filteredClips.length === 0) {
      container.innerHTML = "";
      emptyState.classList.remove("hidden");
    } else {
      emptyState.classList.add("hidden");
      container.innerHTML = filteredClips
        .map((clip) => this.createClipCard(clip))
        .join("");
    }
  }

  // Create clip card
  createClipCard(clip) {
    const date = new Date(clip.createdAt).toLocaleString("en-US");
    const tags = clip.tags
      .map(
        (tag) =>
          `<span class="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">${tag}</span>`
      )
      .join(" ");

    if (clip.type === "text") {
      const truncatedContent =
        clip.content.length > 100
          ? clip.content.substring(0, 100) + "..."
          : clip.content;
      return `
                <div class="bg-white dark:bg-apple-gray-800 rounded-xl shadow-sm border border-apple-gray-200 dark:border-apple-gray-700 p-6 hover:shadow-md transition-shadow duration-200">
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex items-center space-x-2">
                            <span class="text-sm font-medium text-apple-gray-500 dark:text-apple-gray-400">Text</span>
                        </div>
                        <button onclick="pasteCaseApp.deleteClip(${
                          clip.id
                        })" class="text-apple-gray-400 hover:text-red-500 transition-colors duration-200">
                          Delete
                        </button>
                    </div>
                    <div class="mb-4">
                        <pre class="text-sm text-apple-gray-700 dark:text-apple-gray-300 whitespace-pre-wrap font-mono bg-apple-gray-50 dark:bg-apple-gray-700 p-3 rounded-lg">${truncatedContent}</pre>
                    </div>
                    ${
                      clip.memo
                        ? `<p class="text-sm text-apple-gray-600 dark:text-apple-gray-400 mb-3">${clip.memo}</p>`
                        : ""
                    }
                    <div class="flex flex-wrap gap-1 mb-3">${tags}</div>
                    <div class="flex items-center justify-between text-xs text-apple-gray-500 dark:text-apple-gray-400">
                        <span>${date}</span>
                        <button onclick="pasteCaseApp.copyToClipboard('${clip.content.replace(
                          /'/g,
                          "\\'"
                        )}')" class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors duration-200">
                            Copy
                        </button>
                    </div>
                </div>
            `;
    } else if (clip.type === "image") {
      return `
                <div class="bg-white dark:bg-apple-gray-800 rounded-xl shadow-sm border border-apple-gray-200 dark:border-apple-gray-700 p-6 hover:shadow-md transition-shadow duration-200">
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex items-center space-x-2">
                            <span class="text-sm font-medium text-apple-gray-500 dark:text-apple-gray-400">Image</span>
                        </div>
                        <button onclick="pasteCaseApp.deleteClip(${
                          clip.id
                        })" class="text-apple-gray-400 hover:text-red-500 transition-colors duration-200">
                            Delete
                        </button>
                    </div>
                    <div class="mb-4">
                        <img src="${
                          clip.content
                        }" alt="Clip image" class="w-full h-48 object-cover rounded-lg border border-apple-gray-200 dark:border-apple-gray-600">
                    </div>
                    ${
                      clip.memo
                        ? `<p class="text-sm text-apple-gray-600 dark:text-apple-gray-400 mb-3">${clip.memo}</p>`
                        : ""
                    }
                    <div class="flex flex-wrap gap-1 mb-3">${tags}</div>
                    <div class="flex items-center justify-between text-xs text-apple-gray-500 dark:text-apple-gray-400">
                        <span>${date}</span>
                        <button onclick="pasteCaseApp.downloadImage('${
                          clip.content
                        }', 'image-${
        clip.id
      }')" class="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors duration-200">
                            Download
                        </button>
                    </div>
                </div>
            `;
    }
  }

  // Show text modal
  showTextModal() {
    document.getElementById("text-modal").classList.remove("hidden");
    document.getElementById("text-content").focus();
  }

  // Hide text modal
  hideTextModal() {
    document.getElementById("text-modal").classList.add("hidden");
    document.getElementById("text-content").value = "";
    document.getElementById("text-tags").value = "";
    document.getElementById("text-memo").value = "";
  }

  // Show image modal
  showImageModal() {
    document.getElementById("image-modal").classList.remove("hidden");
  }

  // Hide image modal
  hideImageModal() {
    document.getElementById("image-modal").classList.add("hidden");
    document.getElementById("image-input").value = "";
    document.getElementById("image-tags").value = "";
    document.getElementById("image-memo").value = "";
    document.getElementById("image-preview").classList.add("hidden");
  }

  // Preview image
  previewImage(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        document.getElementById("preview-img").src = e.target.result;
        document.getElementById("image-preview").classList.remove("hidden");
      };
      reader.readAsDataURL(file);
    }
  }

  // Save text clip
  async saveTextClip() {
    const content = document.getElementById("text-content").value.trim();
    const tags = document
      .getElementById("text-tags")
      .value.split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag);
    const memo = document.getElementById("text-memo").value.trim();

    if (!content) {
      this.showError("Please enter some text");
      return;
    }

    try {
      await this.db.saveClip({
        type: "text",
        content: content,
        tags: tags,
        memo: memo,
      });

      await this.loadClips();
      this.renderClips();
      this.hideTextModal();
      this.showSuccess("Text clip saved successfully");
    } catch (error) {
      console.error("Save error:", error);
      this.showError("Failed to save clip");
    }
  }

  // Save image clip
  async saveImageClip() {
    const fileInput = document.getElementById("image-input");
    const tags = document
      .getElementById("image-tags")
      .value.split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag);
    const memo = document.getElementById("image-memo").value.trim();

    if (!fileInput.files[0]) {
      this.showError("Please select an image file");
      return;
    }

    try {
      const file = fileInput.files[0];
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          await this.db.saveClip({
            type: "image",
            content: e.target.result,
            tags: tags,
            memo: memo,
            filename: file.name,
            filesize: file.size,
          });

          await this.loadClips();
          this.renderClips();
          this.hideImageModal();
          this.showSuccess("Image clip saved successfully");
        } catch (error) {
          console.error("Save error:", error);
          this.showError("Failed to save clip");
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("File reading error:", error);
      this.showError("Failed to read the file");
    }
  }

  // Delete clip
  async deleteClip(id) {
    if (!confirm("Are you sure you want to delete this clip?")) return;

    try {
      await this.db.deleteClip(id);
      await this.loadClips();
      this.renderClips();
      this.showSuccess("Clip deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      this.showError("Failed to delete clip");
    }
  }

  // Copy to clipboard
  async copyToClipboard(content) {
    try {
      await navigator.clipboard.writeText(content);
      this.showSuccess("Copied to clipboard successfully");
    } catch (error) {
      console.error("Copy error:", error);
      this.showError("Failed to copy to clipboard");
    }
  }

  // Download image
  downloadImage(dataUrl, filename) {
    const link = document.createElement("a");
    link.download = filename + ".png";
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showSuccess("Image downloaded successfully");
  }

  // Handle search
  handleSearch(query) {
    this.currentSearch = query;
    this.renderClips();
  }

  // Handle filter
  handleFilter(filter) {
    this.currentFilter = filter;
    this.renderClips();
  }

  // Handle sort
  handleSort(sort) {
    this.currentSort = sort;
    this.renderClips();
  }

  // Handle keyboard shortcuts
  handleKeyboard(event) {
    // Ctrl+Shift+1: Add text
    if (event.ctrlKey && event.shiftKey && event.key === "!") {
      event.preventDefault();
      this.showTextModal();
    }
    // Ctrl+Shift+2: Add image
    if (event.ctrlKey && event.shiftKey && event.key === "@") {
      event.preventDefault();
      this.showImageModal();
    }
    // Escape: Close modals
    if (event.key === "Escape") {
      this.hideTextModal();
      this.hideImageModal();
    }
  }

  // Show success message
  showSuccess(message) {
    this.showToast(message, "success");
  }

  // Show error message
  showError(message) {
    this.showToast(message, "error");
  }

  // Show toast notification
  showToast(message, type) {
    const toast = document.createElement("div");
    toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all duration-300 transform translate-x-full ${
      type === "success" ? "bg-green-500" : "bg-red-500"
    }`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Animation
    setTimeout(() => {
      toast.classList.remove("translate-x-full");
    }, 100);

    // Auto remove
    setTimeout(() => {
      toast.classList.add("translate-x-full");
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }
}

// Initialize application
let pasteCaseApp;
document.addEventListener("DOMContentLoaded", () => {
  pasteCaseApp = new PasteCaseApp();
});
