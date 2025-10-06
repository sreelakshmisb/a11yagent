import * as vscode from 'vscode';
import { IAccessibilitySource } from './IAccessibilitySource.js';
import * as fs from 'fs';
import * as path from 'path';

export class SettingsFileSource implements IAccessibilitySource {
  private readonly cacheFilePath: string;

  constructor(context: vscode.ExtensionContext) {
    this.cacheFilePath = path.join(context.extensionPath, 'cache', 'settingsFile.md');
  }

  /**
   * Fetches the default VS Code settings and stores them in a cache file.
   */
  async fetchContext(): Promise<string> {
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
        const formattedSettings = JSON.stringify(settingsList, null, 2);
        fs.writeFileSync(this.cacheFilePath, formattedSettings, 'utf8');
        //console.log('Settings file content cached successfully.');
        return formattedSettings;
      } catch (jsonErr) {
        // If not valid JSON, store the raw text
        fs.writeFileSync(this.cacheFilePath, text, 'utf8');
        console.error('Failed to parse JSON. Raw text cached instead.');
        return text;
      }
    } catch (err) {
      const errorMessage = 'Could not read default VS Code settings.';
      console.error(errorMessage, err);
      return '';
    }
  }

  /**
   * Reads the default VS Code settings from the cache file and returns them.
   */
  async getContext(request: vscode.ChatRequest, context: vscode.ExtensionContext): Promise<string> {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        //console.log('Reading cached settings file content.');
        return fs.readFileSync(this.cacheFilePath, 'utf8');
      } else {
        //console.log('Cache file not found. Fetching settings file content.');
        return await this.fetchContext();
      }
    } catch (error) {
      console.error('Error in getContext:', error);
      return '';
    }
  }
}
