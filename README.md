# Insait Draw H

**A modern vector graphics editor — native desktop app with an embedded Web UI.**

[![Microsoft Store](https://img.shields.io/badge/Microsoft%20Store-Download-blue?logo=microsoft)](https://apps.microsoft.com/detail/9NQ3PMZT0289)

---

## Overview

**Insait Draw H** is a vector graphics editor that combines a native Windows desktop shell (built with [Avalonia UI](https://avaloniaui.net/)) with a React-powered web interface embedded via WebView. It provides a comfortable workspace for illustrations, designs, and digital artwork — all running locally on your device.

When the app starts, it spins up a lightweight local HTTP server so the Web UI is also accessible from a browser on the same PC or any device on the same network.

---

## ✨ Features

- **Vector editing workspace** — intuitive canvas with shape tools, layers, and boolean operations
- **Embedded Web UI** — React frontend running inside the desktop app (no internet required)
- **Local-only workflow** — projects and settings stay on your device
- **Page / artboard presets** — A4, A3, Letter, HD/1080p, and custom sizes
- **Pasteboard background with grid** — comfortable positioning and alignment
- **Zoom controls** — including 100% and Fit to View
- **Multi-language interface** — English, Ukrainian, German, Turkish, Russian
- **File association** — optional `.insd` project file association on Windows
- **Accessible from the network** — open the Web UI from another device via `http://<your-PC-IP>:8765/`

---

## 📥 Installation

### ✅ Recommended: Microsoft Store

The easiest way to install Insait Draw H is from the **Microsoft Store** — no manual setup required:

**[➡ Get it on Microsoft Store](https://apps.microsoft.com/detail/9NQ3PMZT0289)**

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | C# · [Avalonia UI](https://avaloniaui.net/) |
| Web UI | React · Vite |
| WebView | [CefGlue / Xilium.CefGlue](https://gitlab.com/xiliumhq/chromiumembedded/cefglue) |
| Local server | Built-in .NET HTTP server (port **8765** by default) |

---

## 🌐 Using the Built-in Web Server

When the app is running, its Web UI is available at:

| Location | URL |
|----------|-----|
| Same PC | `http://localhost:8765/` or `http://127.0.0.1:8765/` |
| Another device (same network) | `http://<your-PC-IP>:8765/` |

> **Note:** The app automatically picks the first available port starting from **8765**. If that port is busy, check the port number shown in the app's status bar.

### Firewall

To allow access from other devices, you may need to add a Windows Firewall inbound rule for the selected port (default **8765**).

---

## 📝 Known Limitations

- Browser-style navigation history is not available inside the embedded WebView.
- Session / tab history restore is not supported.

---

## 📄 License

See LICENSE for details.

---
