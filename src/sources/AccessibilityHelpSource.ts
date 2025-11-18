import * as vscode from 'vscode';
import { IAccessibilitySource } from './IAccessibilitySource.js';
import * as fs from 'fs';
import * as path from 'path';

export class AccessibilityHelpSource implements IAccessibilitySource {
  private readonly cacheFilePath: string;

  constructor(context: vscode.ExtensionContext) {
    this.cacheFilePath = path.join(context.extensionPath, 'cache', 'accessibilityHelp.md');
  }

  /**
   * Fetches the VS Code accessibility documentation and stores it in a cache file.
   */
  async fetchContext(): Promise<string> {
    try {
      const response = await fetch('https://code.visualstudio.com/docs/configure/accessibility/accessibility');
      if (!response.ok) {
        throw new Error('Could not fetch VS Code accessibility documentation.');
      }
      const html = await response.text();

      // Ensure the cache folder exists
      const cacheDir = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      // Use JSDOM to extract the main readable content from the HTML
      try {
        const { JSDOM } = await import('jsdom');
        const dom = new JSDOM(html);
        const main = dom.window.document.querySelector('main');
        let content = '# Accessibility Documentation\n\n';
        content += main?.textContent?.trim() || '';

        // Store the content in the cache file
        fs.writeFileSync(this.cacheFilePath, content, 'utf8');
        //console.log('Accessibility help content cached successfully.');
        return content;
      } catch (parseErr) {
        // If jsdom or parsing fails, store the raw HTML
        fs.writeFileSync(this.cacheFilePath, html, 'utf8');
        console.error('Failed to parse HTML. Raw HTML cached instead.');
        return html;
      }
    } catch (error) {
      console.error('Error fetching accessibility help content:', error);
      return ``;
    }
  }

  /**
   * Reads the accessibility documentation from the cache file and returns it.
   */
  async getContext(request: vscode.ChatRequest, context: vscode.ExtensionContext): Promise<string> {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        //console.log('Reading cached accessibility help content.');
        return fs.readFileSync(this.cacheFilePath, 'utf8');
      } else {
        //console.log('Cache file not found. Fetching accessibility help content.');
        await this.fetchContext();
        return fs.readFileSync(this.cacheFilePath, 'utf8');
      }
    } catch (error) {
      console.error('Error in getContext:', error);
      return ``;
    }
  }
}
