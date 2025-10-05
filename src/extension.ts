import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AccessibilityHelpSource } from './sources/AccessibilityHelpSource.js';
import { SettingsFileSource } from './sources/SettingsFileSource.js';
import { ReleaseNotesSource } from './sources/ReleaseNotesSource.js';
import { startTelemetryTracking, stopTelemetryTracking } from './signalTracker.js';

// Explicitly cast 'context' to 'vscode.ExtensionContext'
export function activate(context: vscode.ExtensionContext) {

  // Start telemetry tracking as an ongoing background event
  startTelemetryTracking(context);

  // Register sources
  const sources: import('./sources/IAccessibilitySource.js').IAccessibilitySource[] = [
    new AccessibilityHelpSource(),
    new ReleaseNotesSource(),
    new SettingsFileSource()
  ];
  
  // Paths to accessibility signals files
  const signalsFilePath = path.join(context.extensionPath, 'accessibility_signals.md');
  const trackedSignalsPath = path.join(context.extensionPath, 'tracked_signals.log');
  
  // Function to detect if query is specifically about identifying a recent sound
  const isRecentAudioCueQuery = (prompt: string): boolean => {
    const recentAudioCueKeywords = [
      'what sound', 'what was that sound', 'recent sound', 'just played', 
      'just heard', 'what signal', 'what audio cue', 'sound that played',
      'what was that noise', 'what is that sound'
    ];
    
    prompt = prompt.toLowerCase();
    return recentAudioCueKeywords.some(keyword => prompt.includes(keyword));
  };
  
  // Function to detect if the query is about audio cues/signals
  const isAudioCueQuery = (prompt: string): boolean => {
    const audioCueKeywords = [
      'audio cue', 'audio cues', 'sound', 'sound cues', 'audio signal', 
      'accessibility.signal', 'sound signal', 'audio notification', 'beep', 
      'audio feedback', 'sound notification', 'accessibility sound'
    ];
    
    prompt = prompt.toLowerCase();
    // Use the isRecentAudioCueQuery function to check for recent sound keywords as well
    return audioCueKeywords.some(keyword => prompt.includes(keyword)) || 
           isRecentAudioCueQuery(prompt);
  };  // Chat request handler
  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<any> => {
    let context = '';
    
    // Check if the query is about audio cues
    if (isAudioCueQuery(request.prompt)) {
      try {
        // Read the signals documentation
        const allSignals = fs.readFileSync(signalsFilePath, 'utf8');
        context += "\n\n##All Audio Cues\n\n" + allSignals;
        
        // If the query is about a sound that just played, try to include user's recent actions
        if (isRecentAudioCueQuery(request.prompt)) {        
          // Add tracked signals if the file exists
          if (fs.existsSync(trackedSignalsPath)) {
            const trackedSignals = fs.readFileSync(trackedSignalsPath, 'utf8');
            if (trackedSignals.trim()) {
              context += "\n\n## Recently Tracked Audio Signals\n\n" + trackedSignals;
            }
          }
          context += "\n\n## Note on Tracked Signals\n\nthese signals are not in order. They are just a unique list of signals that have been played in the current session, in no particular order";
          console.log("Using audio cues file with recent sound identification context");
        } else {
          console.log("Using audio cues file as context");
        }
      } catch (error) {
        console.error("Error reading audio cues file:", error);
      }
    } else {
      // For non-audio cue queries, use the normal sources
      const contexts = await Promise.all(sources.map(source => source.getContext(request)));
      context = contexts.filter(Boolean).join('\n\n');
    }
    
    // Build the appropriate instruction based on the query type
    let instruction = `
    The user relies on a screen reader and uses keyboard navigation as their primary interaction mode.
    Prioritize keyboard accessibility in answers and avoid mouse-only solutions while responding to queries.
    When possible, suggest command palette entries or CLI commands instead of mouse-based or UI workflows.
    Provide platform-specific keybindings and commands, and clarify any differences in behavior across platforms.
    Format all keyboard shortcuts using backticks. Do not use <kbd> tags or kb(...) macros.`;
    
    // Add specific instructions for recent sound identification
    if (isRecentAudioCueQuery(request.prompt)) {
      instruction += ` 
    SOUND IDENTIFICATION INSTRUCTIONS:
    The user is asking about a sound/signal that was just played. Do NOT ask them to refer to logs or files.
    Check the All Audio Cues section in the context to check what signal is likely to have played, based on the actions the user recently undertook.
    Refer the "Recently Tracked Audio Signals" section in the context to identify what signals have been tracked. the signal will be in the list, but need not be the latest entry.
    Be decisive in your response - identify the most likely signal that was played and explain what triggered it.
    Briefly explain the purpose of the identified signal in the context of the user's recent actions.`;
    }

    const messages = [
      vscode.LanguageModelChatMessage.User(instruction),
      vscode.LanguageModelChatMessage.User(context),
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