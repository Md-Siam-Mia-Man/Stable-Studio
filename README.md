# 🌋 Stable Studio (SDVulkan)

> **A lightning-fast, Vulkan-powered Stable Diffusion Interface.**
> *Created by Md Siam Mia.*

![License](https://img.shields.io/badge/License-MIT-gold?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Windows-black?style=for-the-badge&logo=windows)
![Tech](https://img.shields.io/badge/Backend-Vulkan-red?style=for-the-badge&logo=vulkan)

**Stable Studio** is a standalone, lightweight GUI for running Stable Diffusion locally on your GPU (AMD, NVIDIA, Intel) using the Vulkan backend. No complex Python setups, no heavy dependencies—just download and generate.

---

## ✨ Key Features

* **⚡ Vulkan Backend:** Runs natively on virtually any modern GPU (AMD/NVIDIA/Intel) without CUDA requirements.
* **🎨 Premium UI:** A custom-designed **Gold & Black** interface with "Spring Light" and "Dark" modes.
* **🖌️ Infinite Canvas:** Pan, zoom, and inspect your generations in real-time with a floating control HUD.
* **🛠️ Professional Controls:**
  * Full control over **Steps, CFG Scale, Seed, and Dimensions**.
  * Advanced **Sampler** (Euler A, DPM++, LCM) and **Scheduler** selection.
  * **Threads** and **Memory** optimization settings.
* **📁 Custom Model Support:** Simply drop `.safetensors` or `.gguf` files into the `models/` folder.
* **🚀 Production Ready:** Built-in installer generator, secure production mode (disabled DevTools), and auto-cleanup.

---

## 📥 Installation

### **For Users**

1. Download the latest installer (`Stable_Studio_Setup.exe`) from the [Releases](#) page.
2. Install the application.
3. Place your Stable Diffusion models (`.safetensors`) in the `models/` folder (accessible via the folder icon in the app).
4. Start generating!

---

## 💻 Development Setup

To build this project from source:

### **Prerequisites**

* [Node.js](https://nodejs.org/) (v18+)
* [Neutralinojs CLI](https://neutralino.js.org/) (`npm install -g @neutralinojs/neu`)
* [NSIS](https://nsis.sourceforge.io/) (For building the installer)

### **1. Clone & Initialize**

```bash
git clone https://github.com/yourusername/SDVulkan.git
cd SDVulkan

# Installs dependencies and sets up folder structure
npm install
npm run init
```

### **2. Run in Development Mode**

Starts the app with Hot-Reload and DevTools enabled.

```bash
npm start
```

### **3. Build for Production**

Compiles CSS, bundles the binary, and creates the Windows Installer (`.exe`).

```bash
npm run build
```

*Artifacts will be located in the `release/` folder.*

---

## 📂 Project Structure

```plaintext
/SDVulkan
├── 📁 backend/          # Vulkan executables & DLLs
├── 📁 models/           # Checkpoints (Ignored by Git)
├── 📁 outputs/          # Generated Images (Ignored by Git)
├── 📁 resources/        # Frontend Source
│   ├── 📁 assets/       # Fonts & Icons
│   ├── 📁 css/          # Compiled Styles
│   ├── 📁 js/           # Application Logic
│   └── index.html       # Entry Point
├── 📁 src/              # Tailwind Input CSS
└── 📁 helpers/          # Build & Init Scripts
```

---

## 📜 License

This project is licensed under the **MIT License**.
Copyright (c) 2025 **Md Siam Mia**.

See the [LICENSE](LICENSE) file for details.

```

### Verification

1.  **Check `.gitignore`**: Ensure `models/` and `outputs/` are ignored so you don't accidentally push 2GB+ files.
2.  **Check `package.json`**: Ensure `"author": "Md Siam Mia"` is present.
3.  **Check `LICENSE`**: Ensure the year and name are correct.

**Git Commands to Publish:**

```powershell
git init
git add .
git commit -m "Initial commit - Stable Studio v1.0.0"
git branch -M main
# git remote add origin https://github.com/USERNAME/REPO_NAME.git
# git push -u origin main
