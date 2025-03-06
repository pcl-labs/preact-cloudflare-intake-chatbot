# Preact ChatGPT Clone

A full-featured, high-performance **ChatGPT interface clone** built with Preact. This project faithfully recreates the ChatGPT experience while adding powerful enhancements and maintaining excellent performance.

<h2 align="center">
  <img height="256" width="256" src="./src/assets/preact.svg">
</h2>

<p align="center">
  <strong>Total Bundle Size: ~40KB gzipped</strong><br>
  <small>HTML (1.2KB) + CSS (4.2KB) + JS (34.6KB)</small>
</p>

## 🤖 About

This project implements a **complete ChatGPT-like interface** with all the familiar features users expect, built on the lightweight Preact framework instead of React. Perfect for developers who want a ChatGPT-style interface without the overhead of heavier libraries.

## 🚀 Live Demo

Try it yourself:
- [chat.blawby.com](https://chat.blawby.com)
- [preact-chat-gpt-interface.pages.dev](https://preact-chat-gpt-interface.pages.dev)

## 💪 Performance 

- **Tiny Footprint**: ~40KB total gzipped bundle (compared to 100KB+ for typical React apps)
- **Fast Initial Load**: Under 200ms Time-to-Interactive on fast connections
- **No Framework Bloat**: Preact's 3KB core vs React's 40KB foundation
- **Optimized Rendering**: Virtual DOM diffing with batched updates
- **Efficient Media Handling**: Lazy loading for images and media files

## ✨ Features

### Core ChatGPT Features Implemented
- **Chat Interface** — Familiar ChatGPT-style conversation flow
- **Message Styling** — Markdown support with code blocks and syntax highlighting
- **Loading States** — Realistic typing indicators and loading states
- **Message History** — Virtualized list for performance with large conversation histories
- **Dark/Light Mode** — Automatic theme switching based on system preferences

### Enhanced Features
- **Media Attachments** — Send images, videos, and documents (not in original ChatGPT)
- **Audio Recording** — Record and send audio messages with waveform visualization
- **Camera Integration** — Capture and send photos directly from your device
- **Drag-and-Drop** — Full-screen file dropping with intuitive visual feedback
- **Accessibility** — ARIA-compliant with keyboard navigation and screen reader support
- **iOS-style Scrollbars** — Elegant auto-hiding scrollbars with smooth animations
- **SSR Compatible** — Server-side rendering support for better SEO and performance

## 🧩 Why Preact?

This clone achieves a **full ChatGPT experience in just ~40KB** (gzipped) by using Preact instead of React:

- **Dramatically Smaller**: The entire app is smaller than React alone
- **Faster Load Times**: ~40KB total vs 100-300KB for typical React apps
- **API Compatibility**: Same API as React, making migration seamless
- **Better Mobile Experience**: Less JS means faster load times on mobile networks
- **Lower Memory Usage**: Requires less RAM to run smoothly
- **Same Modern Features**: Hooks, Context, etc. without the overhead

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

This builds the app for production, emitting to `dist/`. It prerenders the app to static HTML for SEO benefits.

## 🌩️ Deployment

### Cloudflare Pages

Deploy with Cloudflare Pages for optimal performance:

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy to Cloudflare Pages
npm run build && wrangler pages deploy dist --project-name=preact-chat-gpt-interface
```

## 📝 Roadmap

See [todo.md](./todo.md) for the development roadmap and upcoming features.

## 🧰 Technical Details

### Stack
- **Preact** — For lightweight UI rendering
- **TypeScript** — For type safety and better developer experience
- **Vite** — For fast development and optimized builds
- **CSS Variables** — For flexible theming and styling

### Code Structure
- `src/components/` — Reusable UI components (Message, InputArea, etc.)
- `src/utils/` — Utility functions and helpers
- `src/index.tsx` — Main application entry point
- `src/style.css` — Global styling

## 👥 Contributing

We welcome contributions from the community! Whether it's bug fixes, feature additions, or documentation improvements, your help is appreciated.

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on how to contribute to this project.

By contributing, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## 📄 License

MIT

---

Built with ❤️ by [Paul Chris Luke](https://github.com/paulchrisluke)
