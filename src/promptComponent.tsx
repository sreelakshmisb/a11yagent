import {
  AssistantMessage,
  BasePromptElementProps,
  PromptElement,
  PromptSizing,
  TextChunk,
  UserMessage,
} from "@vscode/prompt-tsx";
import { ChatContext } from "vscode";
import { HistoryMessages } from "./historyComponent.js";

export interface PromptProps extends BasePromptElementProps {
  userQuery: string;
  sourceContext: string;
  os: string;
  history: ChatContext["history"];
}

export interface PromptState {}

// Chunks for systemPrompt
const overviewChunk = (
  <TextChunk>
    CONTEXT: The user relies on a screen reader and uses keyboard navigation as
    their primary interaction mode. They are asking questions in the context of
    VS Code.
  </TextChunk>
);

const guidelinesChunk = (
  <TextChunk>
    GENERAL GUIDELINES: - Suggest accessibility-specific features before general
    VS Code features. - Provide platform-specific keybindings and clarify
    differences across platforms. - Prioritize keyboard accessibility; avoid
    mouse-only solutions. - Suggest command palette entries, CLI commands, or
    keyboard shortcuts instead of UI workflows. - Verify command names/titles
    exist before suggesting them. - Provide concise answers - Don't include
    internal workflows, implementation details or unnecessary headings in
    answers. - If unsure about a setting or feature, suggest multiple
    possibilities rather than guessing. - Don't ask the user for a response,
    more information or confirmation before using tools.
  </TextChunk>
);

const workflowChunk = (
  <TextChunk>
    RESPONSE WORKFLOW: 1. First suggest the most relevant settings or features.
    2. If there are no relevant existing settings, explain that you're going to
    use the search_accessibility_issues tool to check for matching open GitHub
    issues based on the user's description. Then run the tool to look for
    related open GitHub issues using the user's description. 3. Provide
    additional recommendations based on tool results.
  </TextChunk>
);

const keybindingsChunk = (
  <TextChunk>
    KEYBINDINGS: - Format all keyboard shortcuts using backticks. - Only suggest
    shortcuts from the '# Keyboard shortcuts' section. - The format of entries
    in the '# Keyboard shortcuts' section is as follows: the keybinding (key),
    what it's for (command) and the context when it can be used (when). For
    example:{" "}
    {
      '{"key": "shift+cmd+,", "command": "editor.action.inPlaceReplace.up", "when": "editorTextFocus && !editorReadonly"}'
    }
    - Deduce the use of the keybinding based on the "command" metric. - Only
    mention command names in responses when users must enter or reference them
    directly. - Provide platform-specific entries relevant to the user's
    platform. - For macOS/Darwin, replace "alt" with the Option (⌥) key.
  </TextChunk>
);

const settingsChunk = (
  <TextChunk>
    SETTINGS: - Only provide settings mentioned in the '# Accessibility
    settings' section. - The format of entries in the '# Accessibility settings'
    section is as follows: the setting name and a description of when it's to be
    used. For example:{" "}
    {
      '{"name": "terminal.integrated.cursorBlinking", "description": "Controls whether the terminal cursor blinks."}'
    }
    .
  </TextChunk>
);

const audioSignalsChunk = (
  <TextChunk>
    AUDIO CUES AND SIGNALS: - Only suggest signals from the '# Accessibility
    Signals' section. - The format of entries in the '# Accessibility Signals'
    section is as follows: 'name', "description". For example:
    'accessibility.signals.chatRequestSent.announcement', "Announces when a chat
    request is made". Deduce the relevance of the signal based on the
    "description" metric. The 'name' indicates sound or announcement. - Match
    the user's workflow against listed audio cues. - Configure signals using:{" "}
    {
      '"accessibility.signals.name": { "sound": "on|off|auto", "announcement": "on|off|auto" }'
    }
    . - Not all signals support both sound and announcement—confirm before
    answering. - For audio cues the user is currently hearing, check '# Sound
    cues played so far in this session' section to get a list of signals played
    so far. Then use the '# Accessibility Signals' section to identify the audio
    cue most closely matching the user's workflow.
  </TextChunk>
);

const toolUsageChunk = (
  <TextChunk>
    TOOL USAGE: - When the user describes an accessibility issue, bug, or
    problem, first look for relevant settings or features that can resolve the
    issue and provide those suggestions in the response, with the exact names,
    descriptions and how to use them. - Then, use the
    'search_accessibility_issues' tool with the user's description to find
    related GitHub issues. - When using tools, never output only a tool call:
    include a short plain-language sentence explaining what you're doing and
    why. - After a tool returns, summarize the result in 1-3 sentences and then
    give concrete next steps (what to try now, plus 1 fallback option if the
    first option doesn't help). - Never end answers with phrases like "let me
    know and I can search for related GitHub issues or feature requests."
    Instead, take action automatically and combine direct suggestions with tool
    results for comprehensive responses.
  </TextChunk>
);

export class systemPrompt extends PromptElement<PromptProps, PromptState> {
  override async prepare(): Promise<PromptState> {
    return {};
  }

  async render(state: PromptState, sizing: PromptSizing) {
    return (
      <>
        <AssistantMessage priority={100}>
          {overviewChunk}
          {guidelinesChunk}
          {workflowChunk}
          {keybindingsChunk}
          {settingsChunk}
          {audioSignalsChunk}
          {toolUsageChunk}
        </AssistantMessage>
        <HistoryMessages
          history={this.props.history.slice(0, -2)}
          priority={0}
        />
        {/* The last 2 history messages are preferred over the workspace context below */}
        <HistoryMessages history={this.props.history.slice(-2)} priority={80} />
        <UserMessage priority={90}>
          {this.props.userQuery}
          User's Operating System Details: {this.props.os}
        </UserMessage>
        <UserMessage priority={70}>
          Here are the sources you can use to answer the user's question:
          {this.props.sourceContext}
        </UserMessage>
      </>
    );
  }
}
