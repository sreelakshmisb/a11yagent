import https from 'https';
import * as vscode from 'vscode';
import { IAccessibilitySource } from './IAccessibilitySource.js';

export class ReleaseNotesSource implements IAccessibilitySource {
  async getContext(request: vscode.ChatRequest): Promise<string> {
    // Get the current VS Code version. Only consider major.minor for version comparison
    const currentVersion = vscode.version.split('.').slice(0, 2).join('.');

    // GitHub API endpoint for the release-notes directory
    const apiUrl = 'https://api.github.com/repos/microsoft/vscode-docs/contents/release-notes';

    // GitHub requires a User-Agent header for API requests
    const options = {
      headers: { 'User-Agent': 'a11yagent2.0' },
    };

    // Fetch the list of release notes files from GitHub
    return new Promise((resolve) => {
      https.get(apiUrl, options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', async () => {
          try {
            // Parse the response and filter for markdown files with version naming
            const files = JSON.parse(body)
              .filter((f: any) => f.name.endsWith('.md') && f.name.startsWith('v1_'))
              .sort((a: any, b: any) => b.name.localeCompare(a.name, undefined, { numeric: true }));

            // Iterate through files from latest to oldest
            for (const file of files) {
              // Download the markdown file using fetch
              const fileUrl = file.download_url;
              let fileContent = '';
              try {
                const response = await fetch(fileUrl);
                fileContent = await response.text();
              } catch (error) {
                console.error('Error fetching file:', error);
              }

              // Process the file content (e.g., extract relevant sections)
              if (fileContent.includes(currentVersion)) {
                resolve(fileContent);
                return;
              }
            }

            resolve('No relevant release notes found.');
          } catch (error) {
            console.error('Error processing release notes:', error);
            resolve('Error fetching release notes.');
          }
        });
      });
    });
  }
}
