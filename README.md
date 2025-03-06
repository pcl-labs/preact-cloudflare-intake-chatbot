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

## 🔌 Integration

The Preact Chat component can be easily integrated into various platforms and frameworks.

### Web Component Usage

The easiest way to use Preact Chat in any web project is through our Web Component. This approach works in any modern browser without any framework requirements.

#### Installation

Add the script to your HTML:

```html
<script src="https://cdn.jsdelivr.net/npm/preact-chat@latest/dist/embed/preact-chat.js"></script>
```

#### Basic Usage

Add the chat element to your HTML:

```html
<preact-chat></preact-chat>
```

#### Configuring the Component

The Web Component accepts various attributes for customization:

```html
<preact-chat
  theme="dark"
  api-url="https://your-api.com/chat"
  placeholder="Ask me anything..."
  height="500px"
  show-audio
  show-files
  enable-markdown
></preact-chat>
```

### WordPress Integration

#### Using the Plugin

1. Download the Preact Chat WordPress plugin from the repository
2. Install and activate it in your WordPress admin
3. Use the shortcode `[preact_chat]` to add the chat interface to any post or page

#### Shortcode Usage

Basic usage:
```
[preact_chat]
```

With attributes:
```
[preact_chat theme="dark" api_url="https://your-api.com/chat" height="400px"]
```

#### Gutenberg Block

If you're using the WordPress Block Editor (Gutenberg), you can also add the Preact Chat block from the block library.

### Shopify Integration

#### As a Theme Section

Add this code to your theme's `sections` folder as `preact-chat.liquid`:

```liquid
<div id="preact-chat-container" class="preact-chat-container">
  <preact-chat
    theme="{{ section.settings.theme }}"
    {% if section.settings.api_url != blank %}api-url="{{ section.settings.api_url }}"{% endif %}
    placeholder="{{ section.settings.placeholder }}"
    height="{{ section.settings.height }}"
    {% if section.settings.show_audio %}show-audio{% endif %}
    {% if section.settings.show_files %}show-files{% endif %}
  ></preact-chat>
</div>

<script src="https://cdn.jsdelivr.net/npm/preact-chat@latest/dist/embed/preact-chat.js" defer></script>

{% schema %}
{
  "name": "Chat Interface",
  "settings": [
    {
      "type": "select",
      "id": "theme",
      "label": "Theme",
      "options": [
        {"value": "light", "label": "Light"},
        {"value": "dark", "label": "Dark"},
        {"value": "auto", "label": "Auto (System)"}
      ],
      "default": "auto"
    },
    {
      "type": "text",
      "id": "api_url",
      "label": "API URL (optional)"
    },
    {
      "type": "text",
      "id": "placeholder",
      "label": "Placeholder text",
      "default": "Type a message..."
    },
    {
      "type": "text",
      "id": "height",
      "label": "Height",
      "default": "500px"
    },
    {
      "type": "checkbox",
      "id": "show_audio",
      "label": "Enable audio recording",
      "default": true
    },
    {
      "type": "checkbox",
      "id": "show_files",
      "label": "Enable file attachments",
      "default": true
    }
  ],
  "presets": [
    {
      "name": "Chat Interface",
      "category": "Interactive"
    }
  ]
}
{% endschema %}
```

### React Integration

#### Installation

```bash
npm install preact-chat-react
```

#### Basic Usage

```jsx
import React from 'react';
import PreactChat from 'preact-chat-react';

function App() {
  const handleMessage = (message, files) => {
    console.log('New message:', message, files);
    // Process the message, e.g. send to your API
  };

  return (
    <div className="app">
      <h1>My Chat App</h1>
      <PreactChat 
        theme="dark"
        apiUrl="https://your-api.com/chat"
        onMessage={handleMessage}
        height="500px"
      />
    </div>
  );
}

export default App;
```

### Vue Integration

#### Installation

```bash
npm install preact-chat-vue
```

#### Basic Usage

```vue
<template>
  <div class="app">
    <h1>My Chat App</h1>
    <preact-chat
      theme="dark"
      :api-url="apiUrl"
      @message="handleMessage"
    ></preact-chat>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import PreactChat from 'preact-chat-vue';

export default defineComponent({
  components: {
    PreactChat
  },
  data() {
    return {
      apiUrl: 'https://your-api.com/chat'
    };
  },
  methods: {
    handleMessage(event) {
      console.log('New message:', event.message, event.files);
      // Process the message
    }
  }
});
</script>
```

### Angular Integration

#### Installation

```bash
npm install preact-chat-angular
```

#### Module Setup

```typescript
// app.module.ts
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { PreactChatModule } from 'preact-chat-angular';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, PreactChatModule],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA] // Needed for Web Components
})
export class AppModule {}
```

#### Component Usage

```typescript
// app.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div class="app">
      <h1>My Chat App</h1>
      <preact-chat
        theme="dark"
        [apiUrl]="apiUrl"
        (message)="handleMessage($event)"
      ></preact-chat>
    </div>
  `
})
export class AppComponent {
  apiUrl = 'https://your-api.com/chat';

  handleMessage(event: CustomEvent) {
    console.log('New message:', event.detail.message, event.detail.files);
    // Process the message
  }
}
```

### Advanced Configuration

#### API Reference

| Attribute | Type | Description | Default |
|-----------|------|-------------|---------|
| theme | 'light' \| 'dark' \| 'auto' | Color theme of the chat interface | 'auto' |
| api-url | string | URL to send messages to | '' |
| welcome-message | string | Initial message shown in the chat | '' |
| placeholder | string | Placeholder text for the input | 'Type a message...' |
| show-audio | boolean | Enable audio recording | true |
| show-files | boolean | Enable file attachments | true |
| enable-markdown | boolean | Enable markdown rendering | true |
| height | string | Height of the chat container | '600px' |

#### Events

The Web Component emits custom events:

- `message`: Fired when a user sends a message
- `error`: Fired when an error occurs
- `file-upload`: Fired when a user uploads a file
- `recording-start`: Fired when audio recording starts
- `recording-end`: Fired when audio recording ends

#### Event Handlers

```javascript
// Get the chat element
const chatElement = document.querySelector('preact-chat');

// Listen for messages
chatElement.addEventListener('message', (event) => {
  console.log('Message sent:', event.detail.message);
  console.log('Files:', event.detail.files);
  
  // Send to your API and get a response
  fetch('https://your-api.com/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: event.detail.message,
      files: event.detail.files
    })
  })
  .then(response => response.json())
  .then(data => {
    // Add response to the chat
    chatElement.addMessage({
      content: data.response,
      isUser: false
    });
  });
});
```

#### Manual Installation (No CDN)

If you prefer not to use the CDN, you can download the files and host them yourself:

1. Download the latest release from the repository
2. Host the `preact-chat.js` file on your server
3. Include it in your HTML:

```html
<script src="/path/to/your/preact-chat.js"></script>
```

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
