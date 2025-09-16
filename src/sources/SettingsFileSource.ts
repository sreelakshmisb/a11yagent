import * as vscode from 'vscode';
import { IAccessibilitySource } from './IAccessibilitySource';

export class SettingsFileSource implements IAccessibilitySource {
  async getContext(request: import('vscode').ChatRequest): Promise<string> {
    // Fetch the contents of the default VS Code settings and extract names/descriptions
    try {
      const uri = vscode.Uri.parse('vscode://schemas/settings/default');
      const doc = await vscode.workspace.openTextDocument(uri);
      const text = doc.getText();
      try {
        const settingsObject = JSON.parse(text);
        const settingsList: { name: string, description: string }[] = [];
        if (settingsObject && settingsObject.properties) {
          for (const [name, value] of Object.entries(settingsObject.properties)) {
            if (
              value &&
              typeof value === 'object' &&
              'description' in value &&
              typeof (value as any).description === 'string'
            ) {
              settingsList.push({ name, description: (value as any).description });
            }
          }
        }
        return JSON.stringify(settingsList, null, 2);
      } catch (jsonErr) {
        // If not valid JSON, return as is
        return text;
      }
    } catch (err) {
      return 'Could not read default VS Code settings.';
    }
  }
}
