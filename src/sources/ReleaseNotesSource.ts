import * as vscode from 'vscode';
import { IAccessibilitySource } from './IAccessibilitySource';

export class ReleaseNotesSource implements IAccessibilitySource {
  async getResponse(query: string): Promise<string> {
    await vscode.commands.executeCommand('update.showCurrentReleaseNotes');
    return 'Opened the latest VS Code release notes.';
  }
}
