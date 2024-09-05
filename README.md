# AI-Powered Autocomplete Chrome Extension

This Chrome extension provides an AI-powered autocomplete feature for textarea elements across web pages. It offers intelligent suggestions as you type, enhancing your writing experience.

## Features

- AI-powered autocomplete suggestions
- Works on any textarea element across websites
- Tab key interaction for accepting suggestions
- Fallback to simulated mode when AI is unavailable
- Smooth overlay display of suggestions

## Installation

1. Clone this repository or download the source code.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked" and select the directory containing the extension files.

## Usage

1. Focus on any textarea element on a web page.
2. Start typing, and you'll see autocomplete suggestions appear.
3. Use the Tab key to accept suggestions:
   - Single Tab press: Accept the first word of the suggestion
   - Double Tab press: Accept the entire suggestion
   - Hold Tab: Continuously accept words from the suggestion

## Dependencies

This extension requires access to the `window.ai` API for AI-powered suggestions. If unavailable, it falls back to a simulated mode using the predefined word list.