# Pastecase

A modern clipboard manager web application built with vanilla JavaScript and Tailwind CSS. Store, organize, and manage your text snippets and images locally in your browser.

> **Note:** This is a simple application created for a school contest.

## Features

### Core Functionality

- **Local Storage**: All data is stored locally using IndexedDB - no server required
- **Text Clips**: Save and manage text snippets with syntax highlighting
- **Image Clips**: Upload and store images with preview functionality
- **Search & Filter**: Find clips by content, tags, or notes
- **Tagging System**: Organize clips with custom tags
- **Notes**: Add optional notes to your clips for better organization

### User Experience

- **Apple-inspired Design**: Clean, modern interface with smooth animations
- **Dark Mode**: Automatic dark/light mode based on system preferences
- **Responsive Design**: Optimized for desktop with mobile compatibility
- **Keyboard Shortcuts**: Quick access with Ctrl+Shift+1 (text) and Ctrl+Shift+2 (image)
- **Toast Notifications**: User-friendly feedback for all actions

### Data Management

- **Sorting**: Order clips by newest or oldest first
- **Category Filtering**: Filter by text or image clips
- **Real-time Search**: Instant search across content, tags, and notes
- **Export Options**: Copy text to clipboard or download images

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5
- **Styling**: Tailwind CSS (CDN)
- **Storage**: IndexedDB for local data persistence
- **Icons**: Unicode characters (no external dependencies)

## File Structure

```
pastecase/
├── index.html          # Main application interface
├── app.js              # Application logic and IndexedDB management
├── .editorconfig       # Editor configuration for consistent formatting
├── LICENSE             # MIT License
└── README.md           # This file
```

## Getting Started

### Prerequisites

- Modern web browser with IndexedDB support
- No additional installation required

### Running the Application

1. Clone or download this repository
2. Open `index.html` in your web browser
3. Start adding text and image clips

### Usage

#### Adding Content

- Click "Add Text" to create a text clip
- Click "Add Image" to upload an image clip
- Add tags (comma-separated) for better organization
- Add optional notes for additional context

#### Managing Clips

- Use the search bar to find specific clips
- Filter by category (Text/Image) using the dropdown
- Sort clips by date (newest/oldest first)
- Click "Copy" on text clips to copy to clipboard
- Click "Download" on image clips to save locally
- Click "Delete" to remove clips (with confirmation)

#### Keyboard Shortcuts

- `Ctrl+Shift+1`: Open add text modal
- `Ctrl+Shift+2`: Open add image modal
- `Escape`: Close any open modal

## Browser Compatibility

- Chrome 58+
- Firefox 55+
- Safari 11+
- Edge 79+

## Data Privacy

- All data is stored locally in your browser using IndexedDB
- No data is sent to external servers
- Data persists until manually deleted or browser data is cleared

## Development

This application uses modern web standards and requires no build process. Simply edit the files and refresh your browser to see changes.

### Code Structure

- `PasteCaseDB`: Handles all IndexedDB operations
- `PasteCaseApp`: Main application class managing UI and user interactions
- Modular design with clear separation of concerns

## Limitations

- Images are stored as Base64 data URLs (storage size considerations)
- No cloud synchronization between devices
- No collaborative features
- Browser storage limits apply

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

This project was created for educational purposes as part of a school contest.

## Contributing

This is a school project, but suggestions and feedback are welcome for learning purposes.
