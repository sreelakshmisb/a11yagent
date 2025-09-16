import { IAccessibilitySource } from './IAccessibilitySource';

export class AccessibilityHelpSource implements IAccessibilitySource {
  async getContext(request: import('vscode').ChatRequest): Promise<string> {
    // Dynamically fetch the main content of the VS Code accessibility documentation
    try {
      const res = await fetch('https://code.visualstudio.com/docs/configure/accessibility/accessibility');
      if (!res.ok) {
        return 'Could not fetch VS Code accessibility documentation.';
      }
      const html = await res.text();
      // Use JSDOM to extract the main readable content from the HTML
      try {
        const { JSDOM } = await import('jsdom');
        const dom = new JSDOM(html);
        // VS Code docs uses <main> for main content
        const main = dom.window.document.querySelector('main');
        if (main) {
          // Get all text content, trimmed
          return main.textContent?.trim() || '';
        } else {
          return '';
        }
      } catch (parseErr) {
        // If jsdom or parsing fails, return the raw HTML
        return html;
      }
    } catch (err) {
      return '';
    }
  }
}
