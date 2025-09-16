import * as vscode from 'vscode';
import { AccessibilityHelpSource } from './sources/AccessibilityHelpSource';
import { SettingsFileSource } from './sources/SettingsFileSource';
import { ReleaseNotesSource } from './sources/ReleaseNotesSource';

export function activate(context: vscode.ExtensionContext) {

  // Register sources
  const sources: import('./sources/IAccessibilitySource').IAccessibilitySource[] = [
    new ReleaseNotesSource(),
    new SettingsFileSource(),
    new AccessibilityHelpSource()
  ];

  // Chat request handler
  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<any> => {
    // Aggregate context from all sources
    const contexts = await Promise.all(sources.map(source => source.getContext(request)));
    const combinedContext = contexts.filter(Boolean).join('\n\n');
    const instruction = `
    The user relies on a screen reader and uses keyboard navigation as their primary interaction mode.
    Prioritize keyboard accessibility in answers and avoid mouse-only solutions while responding to queries.
    When possible, suggest command palette entries or CLI commands instead of mouse-based or UI workflows.
    Provide platform-specific keybindings and commands, and clarify any differences in behavior across platforms.
    Format all keyboard shortcuts using backticks. Do not use <kbd> tags or kb(...) macros.`

    const messages = [
      vscode.LanguageModelChatMessage.User(instruction),
      vscode.LanguageModelChatMessage.User(combinedContext),
      vscode.LanguageModelChatMessage.User(request.prompt)
    ];

    const chatResponse = await request.model.sendRequest(messages, {}, token);
    for await (const fragment of chatResponse.text) {
      // Relay the output from the language model
      stream.markdown(fragment);
    }
  };

  // Register the chat participant and its request handler
  const a11yAgent = vscode.chat.createChatParticipant('accessibility-agent.participant', handler);

}

    export function deactivate() { }