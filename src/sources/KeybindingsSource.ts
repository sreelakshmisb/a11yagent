import * as vscode from 'vscode';
import { IAccessibilitySource } from './IAccessibilitySource.js';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export class KeybindingsSource implements IAccessibilitySource {
  private readonly cacheFilePath: string;

  constructor(context: vscode.ExtensionContext) {
    this.cacheFilePath = path.join(context.extensionPath, 'cache', 'keybindings.md');
  }

  // Fetches the default keybindings file and stores it in the cache file.
  async fetchContext(): Promise<string> {

    await vscode.commands.executeCommand("workbench.action.openDefaultKeybindingsFile");
    const doc = vscode.window.activeTextEditor?.document;
    if (!doc) {return '';} // if nothing is fetched

    let text = doc.getText();

    // Close the editor tab immediately
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");

    const cmds = await vscode.commands.getCommands(true); 

    const cleaned = this.cleanKeybindingsContent(text);
    
    // Ensure the cache folder exists
    const cacheDir = path.dirname(this.cacheFilePath);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    fs.writeFileSync(this.cacheFilePath, '# Keyboard shortcuts\n\n' + cleaned, 'utf8');
    return cleaned;
  }

  /**
   * Cleans up the keybindings content before storing.
   * - Removes comments (// ...)
   * - Removes extra blank lines
   * - Removes duplicate keybinding objects (same key & command)
   * - Ensures valid array structure
   */
  cleanKeybindingsContent(raw: string): string {
    // Remove comment lines
    let lines = raw.split('\n').filter(line => !line.trim().startsWith('//'));
    // Remove consectutive blank lines
    lines = lines.filter((line, idx, arr) => line.trim() !== '' || (idx > 0 && arr[idx-1].trim() !== ''));

    // Extract the array part, in between [ and ]
    const startIdx = lines.findIndex(l => l.trim().startsWith('['));
    const endIdx = lines.lastIndexOf(']');
    if (startIdx === -1 || endIdx === -1) {
      return lines.join('\n');
    }
    const header = lines.slice(0, startIdx);
    const arrLines = lines.slice(startIdx + 1, endIdx);
    const footer = lines.slice(endIdx + 1);

    // Parse objects, remove duplicates
    const objects: any[] = [];
    let buffer: string[] = [];
    for (const line of arrLines) {
      if (line.trim().startsWith('{')) {buffer = [];}
      buffer.push(line);
      if (line.trim().endsWith('},') || line.trim().endsWith('}')) {
        try {
          // Remove trailing comma for JSON.parse
          let objStr = buffer.join('\n').replace(/,$/, '');
          const obj = JSON.parse(objStr);
          if (!objects.some(o => o.key === obj.key && o.command === obj.command)) {
            objects.push(obj);
          }
        } catch { /* skip invalid */ }
        buffer = [];
      }
    }

    // Rebuild array
    const prettyObjects = objects.map(obj => {
      return '  ' + JSON.stringify(obj, null, 2);
    });
    const result = [
      ...header,
      '[',
      ...prettyObjects.join(',\n').split('\n'),
      ']',
      ...footer
    ];
    return result.join('\n');
  }

  async getContext(request: vscode.ChatRequest, context: vscode.ExtensionContext): Promise<string> {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        return fs.readFileSync(this.cacheFilePath, 'utf8');
      } else {
        return await this.fetchContext();
      }
    } catch (error) {
      return '';
    }
  }
}