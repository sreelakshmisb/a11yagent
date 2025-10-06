import * as vscode from 'vscode';
import { AccessibilityHelpSource } from './sources/AccessibilityHelpSource.js';
import { SettingsFileSource } from './sources/SettingsFileSource.js';
import { ReleaseNotesSource } from './sources/ReleaseNotesSource.js';
import { AudioCuesSource } from './sources/AudioCuesSource.js';
import { startTelemetryTracking, stopTelemetryTracking } from './utils/signalTracker.js';
import { classifyQueryType } from './utils/queryTypeDecider.js';

// Explicitly cast 'context' to 'vscode.ExtensionContext'
export function activate(context: vscode.ExtensionContext) {

  // Start telemetry tracking as an ongoing background event
  startTelemetryTracking(context);

  // Register sources and pass the context
  const sources: import('./sources/IAccessibilitySource.js').IAccessibilitySource[] = [
    new AccessibilityHelpSource(context),
    new ReleaseNotesSource(context),
    new SettingsFileSource(context),
    new AudioCuesSource(context)
  ];
  
  // Chat request handler
  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<any> => {
    let contextData = '';

        // If the command is 'init', initialize all sources
    if (request.command === 'init') {
      try {
        await Promise.all(sources.map(source => source.fetchContext()));
        vscode.window.showInformationMessage('All sources initialized successfully.');
      } catch (error) {
        console.error('Error initializing sources:', error);
        vscode.window.showErrorMessage('Failed to initialize all sources.');
      }
      return;
    }

    // Determine the query type using the utility function
    const queryType = await classifyQueryType(request.prompt);

    console.log('Classified Query Type:', queryType);

    // Filter sources based on the query type
    let relevantSources = sources;
    if (queryType === 'audiocues') {
        relevantSources = sources.filter(source => source instanceof AudioCuesSource || source instanceof SettingsFileSource);
    } else if (queryType === 'settings and features') {
        relevantSources = sources.filter(source => source instanceof AccessibilityHelpSource || source instanceof SettingsFileSource);
    }

    const contexts = await Promise.all(relevantSources.map(source => source.getContext(request, context)));
    contextData = contexts.filter(Boolean).join('\n\n');

    // Build the appropriate instruction based on the query type
    let instruction = `
    The user relies on a screen reader and uses keyboard navigation as their primary interaction mode.
    Prioritize keyboard accessibility in answers and avoid mouse-only solutions while responding to queries.
    When possible, suggest command palette entries or CLI commands instead of mouse-based or UI workflows.
    Provide platform-specific keybindings and commands, and clarify any differences in behavior across platforms.
    Format all keyboard shortcuts using backticks. Do not use <kbd> tags or kb(...) macros.`;

    const messages = [
      vscode.LanguageModelChatMessage.User(instruction),
      vscode.LanguageModelChatMessage.User(request.prompt),
      vscode.LanguageModelChatMessage.User(contextData),
    ];

    const chatResponse = await request.model.sendRequest(messages, {}, token);
    for await (const fragment of chatResponse.text) {
      // Relay the output from the language model
      stream.markdown(fragment);
    }
  };

  // Register the chat participant and its request handler
  const a11yAgent = vscode.chat.createChatParticipant('accessibility-agent.participant', handler);
  
  // Add the participant to the extension context's subscriptions for proper cleanup on deactivation
  context.subscriptions.push(a11yAgent);

  const initCommand = 'a11yagent.init';

  const commandHandler = () => {
    vscode.window.showInformationMessage('Initializing a11yagent...');
  };

  context.subscriptions.push(vscode.commands.registerCommand(initCommand, commandHandler));
 
}

export function deactivate() {
  try {
    // Stop telemetry tracking
    stopTelemetryTracking();
    
    // Make sure all other disposables are cleaned up
    console.log('Extension successfully deactivated');
  } catch (error) {
    // Log any errors during deactivation but don't fail
    console.error('Error during extension deactivation:', error);
  }
}