# 📚 LinguaReader

![Banner Placeholder](https://via.placeholder.com/1200x400/0f172a/38bdf8?text=LinguaReader+Preview)

> **A powerful, modern PDF reader designed for language learners.**  
> *Read native content, translate instantly context-aware, and build your vocabulary seamlessly using Spaced Repetition.*

[![Release](https://img.shields.io/github/v/release/yusufdinc974/LinguaReader?style=for-the-badge&color=38bdf8)](https://github.com/yusufdinc974/LinguaReader/releases)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Windows-gray?style=for-the-badge&logo=linux&logoColor=white)](https://github.com/yusufdinc974/LinguaReader/releases)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## ✨ Features

### 📖 Smart PDF Reading
*   **Resume Anywhere**: Automatically remembers your last page for every book.
*   **Distraction Free**: Focus mode cleans up the interface for deep reading.
*   **Fast Rendering**: Powered by optimized PDF.js for smooth scrolling.

### 🌐 Instant Contextual Translation
*   **Click-to-Translate**: Simply click any word to get its meaning instantly.
*   **Sentence Context**: Translates whole sentences to help you grasp idioms and grammar.
*   **Powered by AI**: Uses advanced translation models for high accuracy.

### 🧠 Vocabulary Building (SRS)
*   **One-Click Add**: Save interesting words to your custom lists instantly.
*   **Spaced Repetition**: Built-in flashcard system (Anki-style) ensures you review words right before you forget them.
*   **Smart Quizzes**: Test yourself with multiple-choice questions derived from your actual reading context.

### 🎨 Modern & Customizable
*   **Theming**: Beautiful Dark and Light modes.
*   **Visualization**: Track your daily progress with interactive charts.
*   **Responsive**: Works great on any screen size.

---

## 📸 Screenshots

| Reading Mode | Translation & Vocab |
|:---:|:---:|
| ![Reading Mode](https://via.placeholder.com/600x400/1e293b/94a3b8?text=Reading+Interface) | ![Translation](https://via.placeholder.com/600x400/1e293b/94a3b8?text=Translation+Popup) |

| Vocabulary Dashboard | Flashcard Quiz |
|:---:|:---:|
| ![Dashboard](https://via.placeholder.com/600x400/1e293b/94a3b8?text=Vocab+Dashboard) | ![Quiz](https://via.placeholder.com/600x400/1e293b/94a3b8?text=SRS+Quiz) |

---

## 🚀 Installation

### 🐧 Linux (Debian/Ubuntu/Mint)
The recommended way for productivity.

1.  **Download** the latest `.deb` file from the [Releases Page](https://github.com/yusufdinc974/LinguaReader/releases).
2.  **Install**:
    ```bash
    sudo dpkg -i linguareader_1.0.4_amd64.deb
    ```
3.  Launch **LinguaReader** from your applications menu.

*(Note: An `AppImage` is also available if you prefer portable apps).*

### 🪟 Windows
1.  **Download** the `.exe` installer from [Releases](https://github.com/yusufdinc974/LinguaReader/releases).
2.  Run the installer.
3.  *(If prompted by SmartScreen, click "More info" > "Run anyway" - this is normal for open source apps not signed with an enterprise certificate).*

---

## 🛠️ Development

Want to contribute or build it yourself?

### Prerequisites
*   Node.js (v18 or later)
*   NPM

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/yusufdinc974/LinguaReader.git
cd LinguaReader

# 2. Install dependencies
npm install

# 3. Run development server (Vite + Electron)
npm run dev
```

### Building

```bash
# Build for Linux
npm run build:linux

# Build for Windows
npm run build:win
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/yusufdinc974">Yusuf Dinc</a></p>
</div>
