# a11yagent README


a11yagent is a VS Code extension that provides an accessibility-focused chat participant. It helps users with accessibility questions, settings, and release notes by intelligently selecting the right source for each query.

## Features


### Features

- **Accessibility Help**: Ask accessibility-related questions and the agent will open the relevant Accessibility Help dialog in VS Code.
- **Settings Search**: Ask about settings (e.g., "settings volume") and the agent will search through the default settings file, matching your query to the most relevant setting and returning its name.
- **Release Notes**: Ask "what's new" or about release notes, and the agent will open the latest VS Code release notes for you.
- **Intelligent Source Selection**: The agent analyzes your prompt and picks the best source (Accessibility Help, Settings, Release Notes) to answer your question.

## Requirements


No special requirements. The extension works with VS Code 1.102.0 and later.

## Extension Settings


This extension does not contribute any new settings. It helps you find and understand existing VS Code settings.

## Known Issues

* The agent cannot directly read system files outside the workspace. Settings search is limited to the default settings file.
* Some features depend on VS Code APIs and may not work in older versions.

## Release Notes


### 1.0.0
Initial release of a11yagent with chat participant, accessibility help, settings search, and release notes features.

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

 accessagent

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
