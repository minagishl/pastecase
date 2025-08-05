// Pastecase - Clipboard Manager Application
// Local storage management using IndexedDB

class PastecaseDB {
  constructor() {
    this.dbName = "PastecaseDB";
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

class PastecaseApp {
  constructor() {
    this.db = new PastecaseDB();
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

    // Image preview modal events
    document
      .getElementById("close-preview-btn")
      .addEventListener("click", () => this.hideImagePreview());
    document
      .getElementById("image-preview-modal")
      .addEventListener("click", (e) => {
        if (e.target.id === "image-preview-modal") this.hideImagePreview();
      });

    // Drag and drop events
    this.setupDragAndDrop();
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
      container.innerHTML = "";
      filteredClips.forEach((clip) => {
        const clipElement = this.createClipCard(clip);
        container.appendChild(clipElement);
      });
    }
  }

  // Create clip card using DOM methods
  createClipCard(clip) {
    const date = new Date(clip.createdAt).toLocaleString("en-US");

    // Create main card container
    const card = this.createElement("div", {
      className:
        "bg-white dark:bg-apple-gray-800 rounded-xl shadow-sm border border-apple-gray-200 dark:border-apple-gray-700 p-6 hover:shadow-md transition-shadow duration-200 flex flex-col h-full",
    });

    // Create header section
    const header = this.createCardHeader(clip);
    card.appendChild(header);

    // Create content container that will grow to fill space
    const contentContainer = this.createElement("div", {
      className: "flex-1 flex flex-col",
    });

    // Create content section based on type
    if (clip.type === "text") {
      const content = this.createTextContent(clip);
      contentContainer.appendChild(content);
    } else if (clip.type === "image") {
      const content = this.createImageContent(clip);
      contentContainer.appendChild(content);
    }

    // Create memo section if exists
    if (clip.memo) {
      const memo = this.createMemoSection(clip.memo);
      contentContainer.appendChild(memo);
    }

    // Create tags section
    const tags = this.createTagsSection(clip.tags);
    contentContainer.appendChild(tags);

    card.appendChild(contentContainer);

    // Create footer section (this will be pushed to bottom)
    const footer = this.createCardFooter(clip, date);
    card.appendChild(footer);

    return card;
  }

  // Helper method to create DOM elements
  createElement(tag, attributes = {}, textContent = "") {
    const element = document.createElement(tag);

    Object.keys(attributes).forEach((key) => {
      if (key === "className") {
        element.className = attributes[key];
      } else if (key === "onclick") {
        element.onclick = attributes[key];
      } else {
        element.setAttribute(key, attributes[key]);
      }
    });

    if (textContent) {
      element.textContent = textContent;
    }

    return element;
  }

  // Create card header with type indicator and delete button
  createCardHeader(clip) {
    const header = this.createElement("div", {
      className: "flex items-start justify-between mb-3",
    });

    const typeSection = this.createElement("div", {
      className: "flex items-center space-x-2",
    });

    // Create type label with MIME type info
    let typeText = clip.type === "text" ? "Text" : "Image";
    if (clip.mimeType) {
      if (clip.type === "text" && clip.filename) {
        typeText = `Text File (${
          clip.filename.split(".").pop()?.toUpperCase() || "TXT"
        })`;
      } else if (clip.type === "image") {
        const imageType = clip.mimeType.split("/")[1]?.toUpperCase() || "IMG";
        typeText = `Image (${imageType})`;
      }
    }

    const typeLabel = this.createElement(
      "span",
      {
        className:
          "text-sm font-medium text-apple-gray-500 dark:text-apple-gray-400",
      },
      typeText
    );

    const deleteButton = this.createElement(
      "button",
      {
        className:
          "text-apple-gray-400 hover:text-red-500 transition-colors duration-200",
        onclick: () => this.deleteClip(clip.id),
      },
      "Delete"
    );

    typeSection.appendChild(typeLabel);
    header.appendChild(typeSection);
    header.appendChild(deleteButton);

    return header;
  }

  // Create text content section
  createTextContent(clip) {
    const contentSection = this.createElement("div", {
      className: "mb-4",
    });

    const truncatedContent =
      clip.content.length > 100
        ? clip.content.substring(0, 100) + "..."
        : clip.content;

    const pre = this.createElement(
      "pre",
      {
        className:
          "text-sm text-apple-gray-700 dark:text-apple-gray-300 whitespace-pre-wrap font-mono bg-apple-gray-50 dark:bg-apple-gray-700 p-3 rounded-lg break-words overflow-wrap-anywhere",
      },
      truncatedContent
    );

    contentSection.appendChild(pre);
    return contentSection;
  }

  // Create image content section
  createImageContent(clip) {
    const contentSection = this.createElement("div", {
      className: "mb-4",
    });

    const img = this.createElement("img", {
      src: clip.content,
      alt: "Clip image",
      className:
        "w-full h-48 object-cover rounded-lg border border-apple-gray-200 dark:border-apple-gray-600 cursor-pointer hover:opacity-80 transition-opacity duration-200",
      onclick: () => this.showImagePreview(clip),
    });

    contentSection.appendChild(img);
    return contentSection;
  }

  // Create memo section
  createMemoSection(memo) {
    return this.createElement(
      "p",
      {
        className: "text-sm text-apple-gray-600 dark:text-apple-gray-400 mb-3",
      },
      memo
    );
  }

  // Create tags section
  createTagsSection(tags) {
    const tagsContainer = this.createElement("div", {
      className: "flex flex-wrap gap-1 mb-3",
    });

    tags.forEach((tag) => {
      const tagElement = this.createElement(
        "span",
        {
          className:
            "inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full",
        },
        tag
      );
      tagsContainer.appendChild(tagElement);
    });

    return tagsContainer;
  }

  // Create card footer with date and action button
  createCardFooter(clip, date) {
    const footer = this.createElement("div", {
      className:
        "flex items-center justify-between text-xs text-apple-gray-500 dark:text-apple-gray-400",
    });

    const dateSpan = this.createElement("span", {}, date);

    let actionButton;
    if (clip.type === "text") {
      actionButton = this.createElement(
        "button",
        {
          className:
            "px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors duration-200",
          onclick: () => this.copyToClipboard(clip.content),
        },
        "Copy"
      );
    } else if (clip.type === "image") {
      actionButton = this.createElement(
        "button",
        {
          className:
            "px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors duration-200",
          onclick: () => this.downloadImage(clip.content, `image-${clip.id}`),
        },
        "Download"
      );
    }

    footer.appendChild(dateSpan);
    if (actionButton) {
      footer.appendChild(actionButton);
    }

    return footer;
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
        mimeType: "text/plain",
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
            mimeType: file.type,
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
      this.hideImagePreview();
    }
  }

  // Show image preview modal
  showImagePreview(clip) {
    const modal = document.getElementById("image-preview-modal");
    const previewImage = document.getElementById("preview-image");
    const imageTitle = document.getElementById("preview-image-title");
    const downloadBtn = document.getElementById("preview-download-btn");
    const deleteBtn = document.getElementById("preview-delete-btn");

    // Set image source and title
    previewImage.src = clip.content;
    imageTitle.textContent =
      clip.memo || `Image - ${new Date(clip.createdAt).toLocaleDateString()}`;

    // Update button handlers
    downloadBtn.onclick = () => {
      this.downloadImage(clip.content, `image-${clip.id}`);
      this.hideImagePreview();
    };

    deleteBtn.onclick = () => {
      if (confirm("Are you sure you want to delete this image?")) {
        this.deleteClip(clip.id);
        this.hideImagePreview();
      }
    };

    // Show modal
    modal.classList.remove("hidden");

    // Focus trap for accessibility
    downloadBtn.focus();
  }

  // Hide image preview modal
  hideImagePreview() {
    const modal = document.getElementById("image-preview-modal");
    const previewImage = document.getElementById("preview-image");

    modal.classList.add("hidden");
    previewImage.src = "";

    // Clean up event handlers
    document.getElementById("preview-download-btn").onclick = null;
    document.getElementById("preview-delete-btn").onclick = null;
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

  // Setup drag and drop functionality
  setupDragAndDrop() {
    // Prevent default drag behaviors on the entire document
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      document.addEventListener(eventName, this.preventDefaults, false);
    });

    // Highlight drop zone when item is dragged over
    ["dragenter", "dragover"].forEach((eventName) => {
      document.addEventListener(eventName, () => this.showDropZone(), false);
    });

    ["dragleave", "drop"].forEach((eventName) => {
      document.addEventListener(
        eventName,
        (e) => {
          // Only hide if we're leaving the document or dropping
          if (e.type === "drop" || !e.relatedTarget) {
            this.hideDropZone();
          }
        },
        false
      );
    });

    // Handle dropped files
    document.addEventListener("drop", (e) => this.handleDrop(e), false);
  }

  // Prevent default drag behaviors
  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Show drop zone
  showDropZone() {
    document.getElementById("drop-zone").classList.remove("hidden");
  }

  // Hide drop zone
  hideDropZone() {
    document.getElementById("drop-zone").classList.add("hidden");
  }

  // Handle dropped files
  async handleDrop(e) {
    const files = e.dataTransfer.files;

    for (let file of files) {
      await this.processDroppedFile(file);
    }
  }

  // Process individual dropped file
  async processDroppedFile(file) {
    const mimeType = file.type;
    const fileName = file.name;
    const fileSize = file.size;

    try {
      if (mimeType.startsWith("image/")) {
        // Handle image files
        const reader = new FileReader();
        reader.onload = async (e) => {
          await this.db.saveClip({
            type: "image",
            content: e.target.result,
            tags: ["dropped-file"],
            memo: `Dropped image: ${fileName}`,
            filename: fileName,
            filesize: fileSize,
            mimeType: mimeType,
          });

          await this.loadClips();
          this.renderClips();
          this.showSuccess(`Image "${fileName}" added successfully`);
        };
        reader.readAsDataURL(file);
      } else if (
        mimeType.startsWith("text/") ||
        mimeType === "application/json" ||
        fileName.endsWith(".txt") ||
        fileName.endsWith(".md")
      ) {
        // Handle text files
        const reader = new FileReader();
        reader.onload = async (e) => {
          await this.db.saveClip({
            type: "text",
            content: e.target.result,
            tags: ["dropped-file", "text-file"],
            memo: `Dropped file: ${fileName}`,
            filename: fileName,
            filesize: fileSize,
            mimeType: mimeType,
          });

          await this.loadClips();
          this.renderClips();
          this.showSuccess(`Text file "${fileName}" added successfully`);
        };
        reader.readAsText(file);
      } else {
        // Unsupported file type
        this.showError(`Unsupported file type: ${mimeType || "unknown"}`);
      }
    } catch (error) {
      console.error("Error processing dropped file:", error);
      this.showError(`Failed to process file: ${fileName}`);
    }
  }
}

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
  window.pastecaseApp = new PastecaseApp();
});
