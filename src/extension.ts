import * as vscode from 'vscode';
import { AccessibilityHelpSource } from './sources/AccessibilityHelpSource.js';
import { SettingsFileSource } from './sources/SettingsFileSource.js';
import { ReleaseNotesSource } from './sources/ReleaseNotesSource.js';
import { AudioCuesSource } from './sources/AudioCuesSource.js';
import { KeybindingsSource } from './sources/KeybindingsSource.js';
import { startTelemetryTracking, stopTelemetryTracking, fetchTrackedSignals } from './utils/signalTracker.js';
import { classifyQueryType } from './utils/queryTypeDecider.js';
import { removeTrackedFeature } from './utils/featureTracking/featureRemover.js';
import { checkForUpdates} from './utils/featureTracking/updateChecker.js';
import { checkQuery } from './utils/featureTracking/queryOptimizer.js';
import { fetchAndTrackIssue, logDescription } from './utils/featureTracking/githubHelper.js';
import { ACCESSIBILITY_INSTRUCTIONS } from './constants.js';
import { searchAccessibilityIssuesTool, SearchAccessibilityIssuesInput } from './tools.js';

 
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
    new AudioCuesSource(context),
    new KeybindingsSource(context)
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
        stream.markdown(' You can also choose to track your description using the button below.');
        // Provide a button to track the description
          stream.button({
            command: 'a11yagent.logDescription',
            title: 'Track Description',
            arguments: [context, request.prompt]
          });
      } catch (error) {
        console.error('Error processing query:', error);
        vscode.window.showErrorMessage('Failed to process query.');
      }
      return;
    }

    if (request.command === 'log') {
      try {
        // Extract issue number from the prompt
        const issueNumber = request.prompt.trim();
        
        if (!issueNumber) {
          stream.markdown('Please provide an issue number. Usage: `/log <issue_number>`\n\nExample: `/log 123456`');
          return;
        }

        // Call fetchAndTrackIssue to get and track the issue
        const result = await fetchAndTrackIssue(context, issueNumber);
        
        // Display the result message in chat
        stream.markdown(result.message);
        
        // If successfully added, show button to view tracked issues
        if (result.success || result.message.includes('already being tracked')) {
          // Inform the user about the button to view tracked issues
          stream.button({
            command: 'a11yagent.removeTrackedFeature',
            title: 'View Tracked Issues'
          });
        }
      } catch (error) {
        console.error('Error processing log command:', error);
        stream.markdown('An error occurred while processing the log command. Please try again.');
      }
      return;
    }

    if (request.command === 'view') {
      try {
        // Directly call the removeTrackedFeature function
        stream.markdown('To view tracked issues, please go to the tracked issues menu using the button below.');
        stream.button({
          command: 'a11yagent.removeTrackedFeature',
          title: 'View Tracked Issues'
        });
      } catch (error) {
        console.error('Error processing view command:', error);
        stream.markdown('An error occurred while processing the view command. Please try again.');
      }
      return;
    }

    if (request.command === 'update') {
      try {
        // Directly call the removeTrackedFeature function
        await checkForUpdates(context, stream);
      } catch (error) {
        console.error('Error processing update command:', error);
        stream.markdown('An error occurred while processing the update command. Please try again.');
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

        // Include tracked signals log as additional context
        const trackedSignals = fetchTrackedSignals();
        if (trackedSignals) {
            contextData += `\n${trackedSignals}`;
        }
    } else if (queryType === 'settings and features') {
        relevantSources = sources.filter(source => source instanceof AccessibilityHelpSource || source instanceof SettingsFileSource);
    }
    else if (queryType === 'keybindings') {
        relevantSources = sources.filter(source => source instanceof KeybindingsSource);
    }

    const contexts = await Promise.all(relevantSources.map(source => source.getContext(request, context)));
    contextData += contexts.filter(Boolean).join('\n\n');

    const instruction = ACCESSIBILITY_INSTRUCTIONS;

    const messages = [
      vscode.LanguageModelChatMessage.User(instruction),
      vscode.LanguageModelChatMessage.User(contextData),
      vscode.LanguageModelChatMessage.User(request.prompt)
    ];

    const tools = [searchAccessibilityIssuesTool];

    const chatResponse = await request.model.sendRequest(
      messages,
      { tools },
      token
    );

    //handle logic for chat response parts (text vs tool calls))
    for await (const part of chatResponse.stream) {
      if (part instanceof vscode.LanguageModelToolCallPart) {
        const { name, input } = part;
        if (name === 'search_accessibility_issues') {
          const toolInput = input as SearchAccessibilityIssuesInput;
          // Execute the issue finding logic
          await checkQuery(
            { ...request, prompt: toolInput.description },
            chatContext,
            stream,
            token
          );
          stream.markdown('You can also choose to track your description using the button below.');
          stream.button({
            command: 'a11yagent.logDescription',
            title: 'Track Description',
            arguments: [context, toolInput.description]
          });
        }
      } else if (part instanceof vscode.LanguageModelTextPart) {
        stream.markdown(part.value);
      }
    }
  };

  // Register the chat participant and its request handler
  const a11yAgent = vscode.chat.createChatParticipant('accessibility-agent.participant', handler);
  
  // Add the participant to the extension context's subscriptions for proper cleanup on deactivation
  context.subscriptions.push(a11yAgent);

  // Register commands for viewing tracked features, logging descriptions
  context.subscriptions.push(vscode.commands.registerCommand('a11yagent.removeTrackedFeature', () => removeTrackedFeature(context)));
  context.subscriptions.push(vscode.commands.registerCommand('a11yagent.logDescription', (context, description, stream) => logDescription(context, description)));
  //context.subscriptions.push(vscode.commands.registerCommand('a11yagent.checkForUpdates', () => checkForUpdates(context)));

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