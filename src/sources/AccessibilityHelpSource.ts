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

        // Find the "Accessibility" heading and extract content from there
        const headings = main?.querySelectorAll('h1');
        let accessibilityHeading = null;
        for (const heading of headings || []) {
          if (heading.textContent?.includes('Accessibility')) {
            accessibilityHeading = heading;
            break;
          }
        }

        let content = '';
        if (accessibilityHeading) {
          // Get the heading and all following siblings, preserving heading level info
          let currentElement = accessibilityHeading;
          while (currentElement) {
            const text = currentElement.textContent?.trim();
            if (text) {
              // Mark headings with their level (h1-h6)
              const tagName = currentElement.tagName?.toLowerCase();
              if (tagName?.match(/^h[1-6]$/)) {
                const level = parseInt(tagName[1]);
                const headerMarker = `[H${level}]`;
                content += `${headerMarker} ${text}\n`;
              } else {
                content += text + '\n';
              }
            }
            currentElement = currentElement.nextElementSibling as any;
          }
        } else {
          // Fallback to all main content if heading not found
          content = main?.textContent?.trim() || '';
        }

        // Clean up the content before storing
        const cleaned = this.cleanAccessibilityContent(content);

        // Store the content in the cache file
        fs.writeFileSync(this.cacheFilePath, '# Accessibility Documentation\n\n' + cleaned, 'utf8');
        return cleaned;
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
   * Cleans up the accessibility help content before storing.
   * - Converts heading markers [H1-H6] to proper markdown headers
   * - Removes consecutive blank lines
   * - Cleans up extra whitespace
   */
  cleanAccessibilityContent(raw: string): string {
    let lines = raw.split('\n').map(line => line.trim());

    // Convert heading markers [H1-H6] to markdown headers
    lines = lines.map(line => {
      const match = line.match(/^\[H([1-6])\]\s+(.+)$/);
      if (match) {
        const level = parseInt(match[1]);
        const text = match[2];
        return `${'#'.repeat(level)} ${text}`;
      }
      return line;
    });

    // Remove consecutive blank lines (keep max 1)
    lines = lines.filter((line, idx, arr) => line !== '' || (idx > 0 && arr[idx - 1] !== ''));

    // Clean up extra spaces within lines
    let content = lines.join('\n').replace(/  +/g, ' ');

    return content.trim();
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
