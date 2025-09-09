import * as vscode from 'vscode';
import { IAccessibilitySource } from './IAccessibilitySource';

export class SettingsFileSource implements IAccessibilitySource {
  async getResponse(query: string): Promise<string> {
    // Open the defaultSettings.json system file
    await vscode.commands.executeCommand('workbench.action.openRawDefaultSettings');
    //return 'Opened the default settings file.';
    
    // Remove the word "setting" from the query to focus on the actual setting name
    const cleanedQuery = query.replace(/setting/gi, '').trim();

    // Find the just-opened virtual document
    const doc = vscode.workspace.textDocuments.find(d =>
    d.fileName.toLowerCase().includes('defaultsettings.json') ||
    d.uri.toString().toLowerCase().includes('defaultsettings')
    );

    if (!doc) {
    throw new Error('Could not locate defaultSettings.json');
    }

    const text =  doc.getText();
    const lines = text.split(/\r?\n/);

    let bestMatch = '';
    let bestScore = 0;
    let commentBlock: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('//')) {
        // Accumulate multi-line comments
        commentBlock.push(line.replace(/^\/{2}/, '').trim());
      } else {
        // Check if this is a setting line
        const match = line.match(/"([^"]+)":/);
        if (match && commentBlock.length > 0) {
          const settingName = match[1];
          const fullComment = commentBlock.join(' ');
          // Match query intent: score by number of query words in comment
          const queryWords = cleanedQuery.toLowerCase().split(/\s+/).filter(Boolean);
          let score = 0;
          for (const word of queryWords) {
            if (fullComment.toLowerCase().includes(word)) score++;
          }
          if (score > bestScore) {
            bestScore = score;
            bestMatch = settingName;
          }
          // Reset comment block for next setting
          commentBlock = [];
        } else {
          // Not a setting line, reset comment block
          commentBlock = [];
        }
      }
    }

    return bestMatch;

    }
}
