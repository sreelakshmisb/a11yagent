# a11yagent


**a11yagent** is a VS Code extension designed to help screen reader users discover accessibility features and troubleshoot accessibility-related issues within VS Code. It provides an interactive chat participant that can answer questions, search for relevant issues, and track updates related to accessibility issues in VS Code.


## Motivation
Copilot frequently provides inadequate responses when asked about accessibility features in VS Code. The workflows/answers it suggests are often UI-based and not optimized for screen reader users. It also provides hallucinated commands or settings and doesn't prioritize accessibility-related information, even when users are operating in screen reader optimized mode. Given the popularity of VS Code and the vast number of accessibility features and settings it has, a11yagent has been built to help users discover and use these features efficiently.


## How It Works
- a11yagent answers questions using a mix of data sources, including VS Code's accessibility documentation, settings, default keybindings, signals/announcements, telemetry logs (if enabled), and release notes.
- It uses the same language models that GitHub Copilot uses, but the answers it generates are grounded using the aforementioned data sources as context and a detailed system prompt so that they are more relevant for screen reader users.
- If the user's question sounds like a bug or an issue, a11yagent looks up related accessibility issues on GitHub using the GitHub MCP server and summarizes any relevant details it finds (workarounds mentioned in the discussions, plans for addressing, etc.) in its response.
- It also gives users the option to track any relevant issues and get updates on their progress or resolution. If there are no relevant issues, it gives you the option to log your query so that you can be notified if any relevant issues are found in the future.


## Prerequisites

### GitHub access (for issue search + tracking)
In order to look up existing accessibility issues on GitHub and track them for updates, a11yagent makes use of the GitHub MCP server. To enable this, you need to install the GitHub MCP server and grant a11yagent permission to use the server and query GitHub. The steps for this are detailed below


- Install the **GitHub MCP server** from VS Code Extensions.
   - Use Ctrl+ Shift+ X(Windows/Linux) or Cmd+ Shift+ X(Mac) to go to the extensions view
   - Enable the Extension marketplace if it is not enabled
   - Type @mcp in the extension marketplace
   - Navigate to the GitHub MCP server and activate the Install button
- Create a GitHub **Personal Access Token (fine‑grained)** from https://github.com/settings/personal-access-tokens/new (you can find this in your GitHub account within settings > developer settings > Personal Access Tokens(fine-grained tokens))
- Grant it access to **Public repositories**
- When the MCP server asks for credentials, paste the token and complete the setup prompts.

### Telemetry Tracking (optional)
- a11yagent uses VS Code's telemetry logs to track unique accessibility signals being played in your current VS Code session.
- To enable this, you need to open the Command Palette(Ctrl + Shift + P in Windows/Linux or Cmd + Shift + P in Mac) and run the command 'Developer: Show Telemetry'. This command enables tracing for telemetry events within VS Code.
- If you have disabled telemetry within your VS Code settings, allyagent will respect these settings.


## How to use

1. Open the **Chat** view in VS Code using Ctrl+ Alt+ I (Windows/Linux) or Ctrl+ Cmd+ I (Mac).
2. Make sure you’re signed in to GitHub so that VS Code's language models are available.
3. Choose a model (recommended: GPT 5.2. Medium) for the chat.
4. You can call the agent by using the `@a11yagent` prefix in the chat input box.
5. Before asking any queries, run the init command using `@a11yagent /init` once to fetch and refresh the agent’s built-in data sources.
6. Ask any question by prefacing it with @a11yagent. You might be asked to grant access to GitHub Copilot's language models when you ask your first query. Please do so to start using the agent.

### Sample Queries
A few example queries you can ask the agent are given below. You can also ask follow-up questions to the agent if the initial response doesn't fully address your query.:
   - How do I turn off a sound cue/announcement?
   - How do I view the output of a Jupyter cell?
   - What are the latest features in this release?
   - I’m having issues using the Process Explorer. It seems to be constantly refreshing, and the screen reader keeps announcing these updates.

Note: If you want the agent to **search and track GitHub issues**, complete the steps in the **GitHub access (for issue search + tracking)** section above.


## Features

### Accessibility chat participant
- You can ask accessibility-related questions, such as how to use specific settings,  what accessibility features of VS Code might be helpful for a particular workflow, or how to fix an issue you are facing in using a feature by invoking the agent with `@a11yagent`.
- You can also ask follow-up questions if the initial response doesn't fully address your query.

### Accessibility issue search
- You can describe an issue you are facing in VS Code to a11yagent, and it'll run a GitHub search to look up and return any matching GitHub issues related to VS Code.
- The response will contain a list of relevant issues it found (sorted in the order of relevance), along with the reasons for relevance, possible workarounds mentioned in the discussions, timelines or plans for addressing the issue, and issue numbers and links for reference.
- You can then choose to track any of these issues to receive updates when they are being worked on/resolved. You can do this using the /log command (e.g., `@a11yagent /log 12345` to log issue number 12345).
- If the returned issues don't match your needs, you can use the `Log Description` button in the response to log your description so that a11yagent can notify you if relevant issues are found in the future.

### Chat commands
Given below is a list of commands supported by a11yagent. All commands should be prefixed by `@a11yagent`.

- `/init`: Fetch and refresh all cached data sources being used by the agent (docs, release notes, default settings, default keybindings, accessibility signals, etc.).

- `/issue <description>`: Search for GitHub issues related to the given description. If you ask a query to the agent that sounds like an issue, the agent will automatically look up relevant issues for you, but you can use this command to trigger the issue search yourself.

- `/log <issue_number>`: Log a GitHub issue for tracking. You'll be notified when there are any updates related to this issue (when it's being worked on, or it gets resolved, etc.).

- `/update`: Check tracked issues and query descriptions for updates. An automatic check for updates runs every time you start a new VS Code session, but you can use this command to trigger a check for updates yourself.

- `/view`: Open the tracked items manager (as a QuickPick menu). You can view and manage all your tracked issues and query descriptions here. You can open the corresponding GitHub issue page, refresh any tracked items, or delete items from tracking. Once you become aware of an update, refreshing the corresponding item ensures that a11yagent knows that you're aware of the update and won't notify you about the same update again. You can choose to keep the item in your tracked list for more future updates or delete it from the list if you don't want to receive any further updates for the issue.


## Release Notes
0.0.2

---

## Resources
- [VS Code Accessibility Documentation](https://code.visualstudio.com/docs/configure/accessibility/accessibility)
- [VS Code Chat Extensions Guide](https://code.visualstudio.com/api/extension-guides/chat)
- [VS Code Settings](https://code.visualstudio.com/docs/getstarted/settings)
- [VS Code Keybindings](https://code.visualstudio.com/docs/getstarted/keybindings)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [VS Code Audio Cues Documentation](https://code.visualstudio.com/docs/editor/accessibility#_audio-cues)
- [GitHub Personal Access Tokens (fine-grained)](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)