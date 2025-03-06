# Preact Chat GPT Interface

A modern, accessible, and feature-rich chat interface built with Preact and TypeScript. This project implements a ChatGPT-like interface with advanced UI features, offering a seamless user experience.

<h2 align="center">
  <img height="256" width="256" src="./src/assets/preact.svg">
</h2>

## 🚀 Live Demo

Visit the live demo at:
- [chat.blawby.com](https://chat.blawby.com) (custom domain)
- [preact-chat-gpt-interface.pages.dev](https://preact-chat-gpt-interface.pages.dev) (Cloudflare Pages)

## ✨ Features

- **Modern Chat Interface** — Sleek design inspired by ChatGPT
- **Markdown Support** — Rich message formatting with code syntax highlighting
- **Media Handling**
  - File uploads and previews
  - Audio recording with waveform visualization
  - Image capture via camera
  - Full-screen drag-and-drop for all media types
- **Responsive Design** — Works across all device sizes
- **Accessibility** — ARIA attributes, keyboard navigation, and screen reader support
- **Dark/Light Mode** — Automatic theme switching based on system preferences
- **iOS-like Scrollbars** — Elegant auto-hiding scrollbars with smooth animations

## 🛠️ Technical Highlights

- Built with **Preact** and **TypeScript** for performance and type safety
- **Vite** for lightning-fast development and optimized builds
- **CSS Variables** for theming and dynamic styling
- **SSR Compatible** — Works with server-side rendering
- **Virtualized Message List** for handling large chat histories efficiently
- **Cloudflare Pages** deployment with custom domain support

## 🏗️ Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/paulchrisluke/preact-chat-gpt-interface.git
cd preact-chat-gpt-interface

# Install dependencies
npm install
```

### Development

```bash
# Start the development server
npm run dev
```

This starts a dev server at http://localhost:5173/

### Production Build

```bash
# Build for production
npm run build
```

This builds the app for production, emitting to `dist/`. It also prerenders the app to static HTML for SEO and faster loading.

### Preview Production Build

```bash
# Preview the production build locally
npm run preview
```

This starts a server at http://localhost:4173/ to test the production build locally.

## 🌩️ Deployment

### Cloudflare Pages

This project is configured for deployment to Cloudflare Pages:

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy to Cloudflare Pages
npm run build && wrangler pages deploy dist --project-name=preact-chat-gpt-interface
```

## 📝 Todo & Roadmap

See [todo.md](./todo.md) for the current development roadmap and planned features.

## 🧰 Code Organization

- `src/` - Source code
  - `components/` - Reusable UI components
  - `assets/` - Static assets
  - `utils/` - Utility functions
  - `index.tsx` - Main application entry point
  - `style.css` - Global styling

## 📄 License

MIT

---

Built with ❤️ by [Paul Chris Luke](https://github.com/paulchrisluke)
