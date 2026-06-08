# FolderScope 🔍📁

**FolderScope** is a premium, high-performance Windows desktop application designed to easily scan, organize, preview, and print documents from complex folder dumps (such as monthly receipt or invoice exports where each file is buried in its own nested folder). 

Built with Electron, HTML5, and Vanilla CSS, FolderScope runs **100% offline** with zero external network dependencies, ensuring absolute privacy for your personal and financial documents.

---

## ✨ Features

- **🔍 Smart Recursive Scanning:** Instantly scans any directory and nested subdirectories to identify printable documents.
- **📄 Native Print Queue:** Dedicated default view displaying all found files in a flat queue.
- **🎛️ Selective Printing:** Check/uncheck specific files, filter lists via real-time search, and print selected documents in bulk with a single click.
- **🖥️ Live Interactive Previews:** Double-click any file to see an instant preview in the side pane (supports PDFs, images, text, HTML, CSV, logs, and markdown).
- **🖨️ Silent Native Printing:** Spools print jobs sequentially directly via Chromium's PDFium engine, bypassing external windows or applications (like Adobe Acrobat).
- **🎨 Modern Aesthetic:** Elegant dark-mode user interface with a custom cyberpunk-themed neon desktop icon.
- **🔒 Privacy First:** 100% local processing. No tracking, telemetry, or remote API calls.

---

## 🛠️ Supported File Types

- **Documents:** `.pdf`, `.html`, `.htm`, `.txt`, `.md`
- **Data & Logs:** `.json`, `.csv`, `.log`
- **Images:** `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed.

### Installation & Run
1. Clone the repository or download the source files.
2. Open your terminal in the project directory.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the application:
   ```bash
   npm start
   ```

---

## 📦 Packaging for Distribution

To bundle the application into a single, shareable Windows Installer (`.exe`):

1. Run the distribution script:
   ```bash
   npm run dist
   ```
2. The standalone installer will be generated inside the `dist/` folder.

---

## 🛡️ License

Distributed under the ISC License. See `LICENSE` or `package.json` for details.
