import * as vscode from 'vscode';
import { IAccessibilitySource } from './IAccessibilitySource';

export class AccessibilityHelpSource implements IAccessibilitySource {
  async getContext(request: import('vscode').ChatRequest): Promise<string> {
    await vscode.commands.executeCommand('editor.action.accessibilityHelp');
    return 'Accessibility help context goes here.';
  }
}
