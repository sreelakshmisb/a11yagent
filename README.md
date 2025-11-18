# a11yagent README

a11yagent is a VS Code extension that provides an accessibility-focused chat participant. It helps users with accessibility questions, settings, and release notes by intelligently selecting the right source for each query. Additionally, it tracks and logs accessibility signals (audio cues) played by VS Code to help users understand what they're hearing.

## Features

- **Accessibility Help**: Ask accessibility-related questions and the agent will fetch answers from VS Code's accessibility documentation.
- **Settings Search**: Ask about settings (e.g., "settings volume") and the agent will search through the default settings file, matching your query to the most relevant setting and returning its name.
- **Release Notes**: Ask "what's new" or about release notes, and the agent will fetch the latest VS Code release notes for you.
- **Audio Cues Information**: Get detailed information about VS Code's audio cues and accessibility signals from the source code.
- **Accessibility Signal Tracking**: The extension monitors and logs which accessibility signals are played during your VS Code sessions, storing them in a `tracked_signals.log` file.
- **Tracked Issues and Descriptions**: Track GitHub issues and custom descriptions. Get notified when updates are available, and manage tracked items with a QuickPick menu.
- **Refresh State**: Refresh the state of tracked issues and descriptions to check for updates. The refresh icon disappears once the state is updated.
- **Screen Reader Optimized**: Responses are formatted for screen reader users with keyboard navigation as their primary interaction mode.
- **Intelligent Source Selection**: The agent analyzes your prompt and picks the best source (Accessibility Help, Settings, Release Notes, Audio Cues) to answer your question.

## Requirements

The extension works with VS Code 1.102.0 and later.

## Extension Settings

This extension does not contribute any new settings. It helps you find and understand existing VS Code settings.

## How It Works

### Signal Tracking
The extension:
1. Locates the most recent VS Code log folder
2. Monitors the telemetry.log file in real-time
3. Parses entries related to accessibility signals
4. Records signals to the tracked_signals.log file

### Tracked Items Management
- **Add Items**: Use the QuickPick menu to add GitHub issues or custom descriptions for tracking.
- **Refresh Items**: Click the refresh icon next to a tracked item to update its state. The `hasUpdates` flag is reset, and the QuickPick menu reflects the changes.
- **Remove Items**: Select items in the QuickPick menu to remove them from tracking.

### Chat Integration
When you ask a question, the extension:
1. Analyzes your query
2. Selects relevant information sources
3. Provides screen reader-optimized answers prioritizing keyboard accessibility

## Known Issues

* The agent cannot directly read system files outside the workspace. Settings search is limited to the default settings file.
* Signal tracking depends on access to VS Code log files, which might require appropriate permissions.
* Some features depend on VS Code APIs and may not work in older versions.

## Release Notes

### 0.0.1
Initial release of a11yagent with:
- Chat participant integration
- Accessibility help documentation access
- Settings search capabilities
- Release notes retrieval
- Audio cues information fetching
- Telemetry signal tracking
- Tracked issues and descriptions management
- Refresh state functionality for tracked items

---

## Resources

* [VS Code Accessibility Documentation](https://code.visualstudio.com/docs/editor/accessibility)
* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
* [VS Code Audio Cues Documentation](https://code.visualstudio.com/docs/editor/accessibility#_audio-cues)

**Enjoy using a11yagent!**
