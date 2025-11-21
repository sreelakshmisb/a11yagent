import * as vscode from 'vscode';
import { AccessibilityHelpSource } from './sources/AccessibilityHelpSource.js';
import { SettingsFileSource } from './sources/SettingsFileSource.js';
import { ReleaseNotesSource } from './sources/ReleaseNotesSource.js';
import { AudioCuesSource } from './sources/AudioCuesSource.js';
import { startTelemetryTracking, stopTelemetryTracking } from './utils/signalTracker.js';
import { classifyQueryType } from './utils/queryTypeDecider.js';
import { removeTrackedFeature } from './utils/featureTracking/featureRemover.js';
import { logFeature } from './utils/featureTracking/featureLogger.js';
import { checkForUpdates } from './utils/featureTracking/updateChecker.js';
import { checkQuery } from './utils/featureTracking/queryOptimizer.js';

 
// Explicitly cast 'context' to 'vscode.ExtensionContext'
export async function activate(context: vscode.ExtensionContext) {

  // Check if telemetry is enabled before starting telemetry tracking
  if (vscode.env.isTelemetryEnabled) {
    startTelemetryTracking(context);
  }

  // Listen for changes to the telemetry setting
  const telemetryChangeListener = vscode.env.onDidChangeTelemetryEnabled((isEnabled) => {
    if (isEnabled) {
      startTelemetryTracking(context);
    } else {
      stopTelemetryTracking();
    }
  });

  // Add the listener to the extension's subscriptions for cleanup
  context.subscriptions.push(telemetryChangeListener);

  // Notify users of updates to tracked issues when VS Code starts
  checkForUpdates(context);

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
        vscode.window.showInformationMessage('Fetched and updated all data sources used by a11yagent.');
      } catch (error) {
        console.error('Error updating data sources used by a11yagent:', error);
        vscode.window.showErrorMessage('Failed to update all data sources used by a11yagent.');
      }
      return;
    }

    if (request.command === 'issue') {
      try {
        // Call checkQuery with the request prompt
        await checkQuery(request, chatContext, stream, token);
      } catch (error) {
        console.error('Error processing query:', error);
        vscode.window.showErrorMessage('Failed to process query.');
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
    Don't suggest keyboard shortcuts not mentioned in the official VS Code documentation.
    Provide platform-specific keybindings and commands, and clarify any differences in behavior across platforms.
    Format all keyboard shortcuts using backticks. Do not use <kbd> tags or kb(...) macros. 
    Don't provide settings not mentioned in the Accessibility settings section or audio cues not mentioned in the Accessibility Signals section.
    If you're not sure of a setting, audio cue or feature suggest multiple possibilities rather than guessing.
    Suggest accessibility-specific features, as much as possible, before general VS Code features.`;

    const messages = [
      vscode.LanguageModelChatMessage.User(instruction),
      vscode.LanguageModelChatMessage.User(contextData),
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
  
  // Add the participant to the extension context's subscriptions for proper cleanup on deactivation
  context.subscriptions.push(a11yAgent);

  // Register commands for logging and viewing tracked features
  //context.subscriptions.push(vscode.commands.registerCommand('a11yagent.logFeature', () => logFeature(context)));
  context.subscriptions.push(vscode.commands.registerCommand('a11yagent.removeTrackedFeature', () => removeTrackedFeature(context)));
  context.subscriptions.push(vscode.commands.registerCommand('a11yagent.checkForUpdates', () => checkForUpdates(context)));

}

export function deactivate() {
  try {
    // Stop telemetry tracking
    stopTelemetryTracking();
    console.log('Extension successfully deactivated');
  } catch (error) {
    console.error('Error during extension deactivation:', error);
  }
}