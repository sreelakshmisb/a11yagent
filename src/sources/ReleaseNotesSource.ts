import https from 'https';
import * as vscode from 'vscode';
import { IAccessibilitySource } from './IAccessibilitySource.js';
import * as fs from 'fs';
import * as path from 'path';

export class ReleaseNotesSource implements IAccessibilitySource {
  private readonly cacheFilePath: string;

  constructor(context: vscode.ExtensionContext) {
    this.cacheFilePath = path.join(context.extensionPath, 'cache', 'releaseNotes.md');
  }

  /**
   * Fetches release notes from the GitHub API and stores them in a cache file.
   */
  async fetchContext(): Promise<string> {
    const currentVersion = vscode.version.split('.').slice(0, 2).join('.');
    const apiUrl = 'https://api.github.com/repos/microsoft/vscode-docs/contents/release-notes';
    const options = { headers: { 'User-Agent': 'a11yagent2.0' } };

    return new Promise((resolve, reject) => {
      https.get(apiUrl, options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', async () => {
          try {
            const files = JSON.parse(body)
              .filter((f: any) => f.name.endsWith('.md') && f.name.startsWith('v1_'))
              .sort((a: any, b: any) => b.name.localeCompare(a.name, undefined, { numeric: true }));

            let result = '# Release Notes\n\n';

            for (const file of files) {
              const fileUrl = file.download_url;
              try {
                const response = await fetch(fileUrl);
                const fileContent = await response.text();

                if (fileContent.includes(currentVersion)) {
                  result += fileContent;
                  break;
                }
              } catch (error) {
                console.error('Error fetching file:', error);
              }
            }

            if (result) {
              // Ensure the cache folder exists
              const cacheDir = path.dirname(this.cacheFilePath);
              if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
              }
              fs.writeFileSync(this.cacheFilePath, result, 'utf8');
              //console.log('Release notes cached successfully.');
              resolve(result);
            } else {
              resolve('');
            }
          } catch (error) {
            console.error('Error processing release notes:', error);
            reject(``);
          }
        });
        res.on('error', () => {
          reject(``);
        });
      });
    });
  }

  /**
   * Reads release notes from the cache file and returns them.
   */
  async getContext(request: vscode.ChatRequest, context: vscode.ExtensionContext): Promise<string> {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        //console.log('Reading cached release notes.');
        return fs.readFileSync(this.cacheFilePath, 'utf8');
      } else {
        //console.log('Cache file not found. Fetching release notes.');
        await this.fetchContext();
        return fs.readFileSync(this.cacheFilePath, 'utf8');
      }
    } catch (error) {
      console.error('Error in getContext:', error);
      return ``;
    }
  }
}
