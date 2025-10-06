import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { IAccessibilitySource } from './IAccessibilitySource.js';
import * as ts from 'typescript'; // Import TypeScript Compiler API

export class AudioCuesSource implements IAccessibilitySource {

    private readonly url: string = 'https://raw.githubusercontent.com/microsoft/vscode/f554e3c48013328227e23981a33d0f0d902dc75d/src/vs/workbench/contrib/accessibility/browser/accessibilityConfiguration.ts';
    private readonly cacheFilePath: string;

    constructor(context: vscode.ExtensionContext) {
        this.cacheFilePath = path.join(context.extensionPath, 'cache', 'signals.md');
    }

    /**
     * Fetches and extracts audio cues and their descriptions from the provided URL.
     * Uses a cache file to avoid repeated network requests and ensures the cache persists across VS Code sessions.
     */
    async fetchContext(): Promise<string> {
        try {

            // fetch the contents from the URL
            const response = await fetch(this.url);
            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.statusText}`);
            }
            const content = await response.text();

            // Extract all 'localize' calls for 'accessibility.signals'
            const localizeRegex = /localize\('accessibility\.signals\.[^']*', \"[^\"]*\"\)/g;
            const matches = content.match(localizeRegex);

            if (!matches) {
                return '';
            }

            // Process matches to remove 'localize(' and ')' and sort them
            const processedSignals = matches
                .map(match => match.replace(/localize\(/, '').replace(/\)$/,'').trim())
                .sort()
                .filter((item, index, array) => array.indexOf(item) === index); // Remove duplicates

            // Format the results as a string
            let result = '# Accessibility Signals\n\n';
            for (const signal of processedSignals) {
                result += `- ${signal}\n`;
            }
            // Store the results in the cache file
            fs.writeFileSync(this.cacheFilePath, result, 'utf8');
            console.log('Signals cached successfully.');
            return result;
        } catch (error) {
            console.error('Error fetching accessibility signals:', error);
            return ``;
        }
    }

    async getContext(request: vscode.ChatRequest, context: vscode.ExtensionContext): Promise<string> {
        try {
            // Check if the cache file exists
            if (fs.existsSync(this.cacheFilePath)) {
                console.log('Reading cached signal data');
                return fs.readFileSync(this.cacheFilePath, 'utf8');
            }
            // If the cache file does not exist, fetch the context
            console.log('Cache file not found. Fetching signals and descriptions.');
            return await this.fetchContext();

        } catch (error) {
            console.error('Error in getContext:', error);
            return ``;
        }
    }
}