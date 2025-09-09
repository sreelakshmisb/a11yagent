
import * as vscode from 'vscode';
import { IAccessibilitySource } from './sources/IAccessibilitySource';
import { AccessibilityHelpSource } from './sources/AccessibilityHelpSource';
import { SettingsFileSource } from './sources/SettingsFileSource';
import { ReleaseNotesSource } from './sources/ReleaseNotesSource';

export function activate(context: vscode.ExtensionContext) {
  // Function to pick a single source based on the prompt
  function pickSource(prompt: string, sources: IAccessibilitySource[]): IAccessibilitySource | undefined {
    // If the prompt contains 'help', pick AccessibilityHelpSource
    if (/help/i.test(prompt)) {
      return sources.find(src => src instanceof AccessibilityHelpSource);
    }
    // If the prompt asks for what's new, pick ReleaseNotesSource
    if (/what'?s\s+new|release\s*notes|update/i.test(prompt)) {
      return sources.find(src => src instanceof ReleaseNotesSource);
    }
    // If the prompt contains 'settings', pick SettingsFileSource
    if (/settings/i.test(prompt)) {
        console.log("hi");
      return sources.find(src => src instanceof SettingsFileSource);
    }
    // Otherwise,return the first source (default)
    return sources[0];
  }

  // Creating sources
  const sources: IAccessibilitySource[] = [
    new AccessibilityHelpSource(),
    new SettingsFileSource(),
    new ReleaseNotesSource(),
  ];

  // Chat request handler
  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<any> => {

    //Picking the source 
    const selectedSource: IAccessibilitySource | undefined = pickSource(request.prompt, sources);

    let response = '';
    if (selectedSource) {
      response = await selectedSource.getResponse(request.prompt);
    }
    if (response && response.trim() !== '') {
      // sending message to stream
      stream.markdown(response);
    } else {
      // sending message to stream
      stream.markdown('No relevant accessibility source found for your query.');
    }
  };

  // Registering the chat participant and its request handler
  const a11yAgent = vscode.chat.createChatParticipant('accessibility-agent.participant', handler);

  // Setting properties for @a11yAgent
  //a11yAgent.iconPath = vscode.Uri.joinPath(context.extensionUri, 'a11yAgent.jpeg');

}