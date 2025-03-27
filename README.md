# LinguaReader

<div align="center">
  <img src="/api/placeholder/200/200" alt="LinguaReader Logo" />
  <h3>Enhance your reading experience with interactive vocabulary building</h3>
</div>

LinguaReader is a desktop application designed to help language learners read PDFs while building their vocabulary. It enables users to interact with text by clicking on unknown words to see definitions, save words with familiarity ratings, and quiz themselves on their vocabulary.

## ✨ Features

### 📖 PDF Reading with Multiple View Modes
- **Text View**: Clean, formatted text with interactive word selection
- **PDF View**: Original PDF rendering
- **Split View**: Side-by-side PDF and interactive text

![PDF Reading Interface](/api/placeholder/800/400)

### 🔍 Interactive Vocabulary Building
- Click on any word to see its definition
- Save words to your vocabulary with familiarity ratings (1-5)
- Words are highlighted based on familiarity level across all PDFs
- Organize vocabulary into custom lists

![Vocabulary Building](/api/placeholder/800/400)

### 📚 PDF Library Management
- Keep track of all your uploaded PDFs
- Quick access to recently opened documents
- Track reading progress across documents

### 🎯 Vocabulary Quiz System
- Test yourself on saved words
- Spaced repetition algorithm for optimal retention
- Multiple quiz modes to reinforce learning

![Quiz Interface](/api/placeholder/800/400)

### 📊 Learning Statistics
- Track your vocabulary growth over time
- Visualize your retention progress
- Monitor your reading habits

![Statistics Dashboard](/api/placeholder/800/400)

## 📥 Installation

### Windows
1. Download the latest `.exe` installer from the [Releases](https://github.com/yusufdinc974/LinguaReader/releases) page
2. Run the installer and follow the on-screen instructions
3. Launch LinguaReader from your Start menu or desktop shortcut

### macOS
1. Download the latest `.dmg` file from the [Releases](https://github.com/yusufdinc974/LinguaReader/releases) page
2. Open the downloaded file
3. Drag LinguaReader to your Applications folder
4. Launch LinguaReader from your Applications folder or dock

### Linux
1. Download the appropriate package for your distribution (`.AppImage`, `.deb`, or `.rpm`) from the [Releases](https://github.com/yusufdinc974/LinguaReader/releases) page
2. For `.AppImage`:
   - Make the file executable: `chmod +x LinguaReader-*.AppImage`
   - Run the application: `./LinguaReader-*.AppImage`
3. For `.deb` packages:
   - Install with: `sudo dpkg -i LinguaReader-*.deb`
   - Or use your package manager's GUI
4. For `.rpm` packages:
   - Install with: `sudo rpm -i LinguaReader-*.rpm`
   - Or use your package manager's GUI

## 🚀 Getting Started

### 1. Upload a PDF

Upon launching LinguaReader for the first time, you'll be prompted to upload a PDF:

1. Click the "Upload PDF" button
2. Select a PDF file from your computer
3. The PDF will be processed and opened in Vocabulary Mode

### 2. Reading and Building Vocabulary

1. Navigate through the PDF using the controls at the bottom of the screen
2. Click on any word to see its definition
3. Use the familiarity rating (1-5) to save words to your vocabulary
4. Toggle between Text, PDF, and Split view modes using the buttons at the top

### 3. Manage Your Vocabulary

1. Click on the "Word List" tab to see all your saved vocabulary
2. Create custom lists to organize your vocabulary
3. Edit word details or remove words you no longer want to track

### 4. Quiz Yourself

1. Go to the "Quiz" tab to test your knowledge
2. Select a vocabulary list to quiz yourself on
3. Choose a quiz mode and difficulty
4. Track your progress in the Statistics tab

## 🛠️ Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v14.0.0 or later)
- [npm](https://www.npmjs.com/) (v6.0.0 or later)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yusufdinc974/LinguaReader.git
   cd LinguaReader
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run electron:dev
   ```

### Building

To build the application for distribution:

- For all platforms:
  ```bash
  npm run dist:all
  ```

- For specific platforms:
  ```bash
  npm run dist:win    # Windows
  npm run dist:mac    # macOS
  npm run dist:linux  # Linux
  ```

## 📁 Project Structure

```
LinguaReader/
├── electron/         # Electron main process code
├── public/           # Static assets and Electron entry point
└── src/
    ├── assets/       # Application assets and styles
    ├── components/   # React components
    │   ├── common/          # Shared components
    │   ├── layout/          # Layout components
    │   ├── pdf/             # PDF-related components
    │   ├── quiz/            # Quiz components
    │   ├── stats/           # Statistics components
    │   └── vocabulary-mode/ # Vocabulary mode components
    ├── contexts/     # React contexts for state management
    ├── hooks/        # Custom React hooks
    ├── pages/        # Top-level page components
    ├── services/     # API and utility services
    └── utils/        # Utility functions
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For any questions or feedback, please reach out to [your-email@example.com](mailto:your-email@example.com).

---

<div align="center">
  Made with ❤️ by Yusuf Dinç
</div>
