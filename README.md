# a11yagent

**a11yagent** is a VS Code extension designed to help screen reader users discover accessibility features and settings within VS Code. It provides an interactive chat participant that can answer questions, search for relevant issues, and track updates related to accessibility issues in VS Code.

## Motivation

Copilot frequently provides inadequate responses when asked about accessibility features in VS Code. The workflows/answers it suggests are often mouse-based and not optimized for screen reader users. It also provides hallucinated commands or settings and doesn't prioritize accessibiltiy-related information, even when users are in screen reader optimized mode. Given the popularitly of VS Code and the vast number of accessibility features and settings it has, a11yagent has been made to help users discover and use these features.

## How It Works

a11yagent uses a combination of data sources (VS Code Accessibility documentation, accessibility settings, keybindings, signals/announcements, release notes and GitHub issues) to answer any user query. The chat partcipant works best when used with GPT-5.2.

## Prerequisites 

### GitHub MCP Server
a11yagent makes use of the Github MCP server. You need to complete the following steps to install the MCP server and provide the required permissions.
- Within VS Code, use Cmd+ Shift+ X(Mac) or Ctrl+ Shift+ X(Windows/Linux) to view extensions
- Enable the Extension marketplace if it is not enabled
- Type @mcp in the extension marketplace
- Navigate to the GitHub MCP server and activate the Install button
- Create a PAT from https://github.com/settings/personal-access-tokens/new (you can find this within fine-grained tokens in developer settings)
- Set Repository access: Public Repositories

### Telemetry Tracking (optional)
a11yagent uses telemetry logs to track unique accessibility signals being played in the current session. To use this, open the Command Pallette and run the command 'Developer:Show Telemetry'. This command enables tracing for telemetry events within VS Code. If you have disabled telemetry within your VS Code settings, allyagent will respect these settings.

## How to use (pre-deployment, for testing purposes) 

1. Clone the repository
2. Launch VS Code and open the cloned repository as a workspace
2. Run `npm install` in the terminal, at the root of the repository, to install dependencies
5. Make sure you’re signed in to GitHub to access models/chat
3. Launch the VS Code extension development host by pressing `F5` or run the command 'Debug: Start Debugging' from the Command Palette. This will compile and run the extension in a new Extension Development Host window.
4. Open the VS Code Chat pane in the extension development host window. 
5. Choose a model (recommended : GPT 5.2) in chat 
5. Before asking any qustions to the agent, run the /init command with the agent to initialize all data sources used by it.(i.e. run @a11yagent /init)
6. Now you can start using a11yagent. A few example queries you can ask are :
- How do I turn off a sound cue/announcement?
- How do I view the output of a Jupyter cell?
- What are the latest features in this release?
- I’m having issues using the Process Explorer. It seems to be constantly refreshing, and the screen reader keeps announcing these updates. 


## Features

- **Accessibility chat participant**: You can ask accessibility-related questions, such as how to use specific settings,  what accessibility features of VS Code might be helpful for a particular workflow, or how to fix an issue you are facing in using a feature by invoking the agent with @a11yagent. You can also ask follow-up questions if the initial reponse doesn't fully address your query.

- **Accessibility issue search**: If your query contains an issue you are facing within VS Code, a11yagent runs a GitHub search to look for matching issues and returns a list of relevant issues, if any. You can then choose to track any of these issues to receive updates when they are being worked on/resolved. If the returned issues don't match your needs, you can chooose to 'Log Description' so that a11yagent can notify you if relevant issues are found in the future. 


### Chat commands

All commands should be prefixed by @a11yagent to specify that they are meant for the agent.
- `/init`: Fetch and refresh all cached sources (docs, release notes, default settings, default keybindings, accessibility signals).
- `/log <issue_number>`: Fetches a specific GitHub issue and adds it to your tracked issues list.
- `/view`: Opens the tracked items manager (QuickPick menu). You can view and manage all your tracked issues and descriptions here. You can open the coorespondng GitHub issue page, refresh any tracked item to check for updates or delete items from tracking.
- `/update`: Checks tracked issues/descriptions for updates


## Release Notes

### 0.0.1

Initial release.

---

## Resources

- [VS Code Accessibility Documentation](https://code.visualstudio.com/docs/configure/accessibility/accessibility)
- [VS Code Chat Extensions Guide](https://code.visualstudio.com/api/extension-guides/chat)
- [VS Code Settings](https://code.visualstudio.com/docs/getstarted/settings)
- [VS Code Keybindings](https://code.visualstudio.com/docs/getstarted/keybindings)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [VS Code Audio Cues Documentation](https://code.visualstudio.com/docs/editor/accessibility#_audio-cues)
- [GitHub Personal Access Tokens (fine-grained)](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

