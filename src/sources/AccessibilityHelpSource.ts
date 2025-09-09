import * as vscode from 'vscode';
import { IAccessibilitySource } from './IAccessibilitySource';

export class AccessibilityHelpSource implements IAccessibilitySource {
  async getResponse(query: string): Promise<string> {
    await vscode.commands.executeCommand('editor.action.accessibilityHelp');
    return 'Opened Accessibility Help dialog.';
  }
}
