
import * as fs from 'fs';
import * as https from 'https';
import * as vscode from 'vscode';
import { IAccessibilitySource } from './IAccessibilitySource';

export class ReleaseNotesSource implements IAccessibilitySource {
  async getContext(request: vscode.ChatRequest): Promise<string> {
    
    // Get the current VS Code version. Only consider major.minor for version comparison
    const currentVersion = vscode.version.split('.').slice(0,2).join('.');

    // GitHub API endpoint for the release-notes directory
    const apiUrl = 'https://api.github.com/repos/microsoft/vscode-docs/contents/release-notes';
    
    // GitHub requires a User-Agent header for API requests
    const options = {
      headers: { 'User-Agent': 'a11yagent2.0' }
    };

    // Fetch the list of release notes files from GitHub
    return new Promise((resolve) => {
      https.get(apiUrl, options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', async () => {
          try {
            // Parse the response and filter for markdown files with version naming
            const files = JSON.parse(body)
              .filter((f:any) => f.name.endsWith('.md') && f.name.startsWith('v1_'))
              .sort((a:any, b:any) => b.name.localeCompare(a.name, undefined, { numeric: true }));

            // Iterate through files from latest to oldest
            for (const file of files) {
              // Download the markdown file using fetch
              const fileUrl = file.download_url;
              let fileContent = '';
              try {
                const response = await fetch(fileUrl);
                fileContent = await response.text();
              } catch {
                continue;
              }
              // Find the first markdown H1 (line starting with '# ')
              const h1Line = fileContent.split('\n').find(line => line.startsWith('# '));
              if (h1Line && h1Line.includes(currentVersion)) {
                // Return the release notes if the H1 matches the current VS Code version
                resolve(`Latest Release Notes:\n${fileContent}`);
                return;
              }
            }
            // No release notes found for the current month
            resolve('No release notes for the current month found.');
          } catch {
            // Error parsing or fetching files
            resolve('No release notes available.');
          }
        });
      }).on('error', () => {
        // Network or request error
        resolve('No release notes available.');
      });
    });
  }
}
