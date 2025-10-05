import * as vscode from 'vscode';
import { IAccessibilitySource } from './IAccessibilitySource.js';
import * as ts from 'typescript'; // Import TypeScript Compiler API

export class AudioCuesSource implements IAccessibilitySource {

    private readonly url: string = 'https://raw.githubusercontent.com/microsoft/vscode/f554e3c48013328227e23981a33d0f0d902dc75d/src/vs/workbench/contrib/accessibility/browser/accessibilityConfiguration.ts';

    /**
     * Fetches and extracts audio cues and their descriptions from the provided URL.
     */
    async getContext(request: vscode.ChatRequest): Promise<string> {
        try {
            // Fetch the contents from the URL
            const response = await fetch(this.url);
            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.statusText}`);
            }
            const content = await response.text();

            // Find the configuration object in the content
            const configRegex = /const\s+configuration:\s+IConfigurationNode\s*=\s*({[\s\S]*?});/;
            const configMatch = content.match(configRegex);
            if (!configMatch || !configMatch[1]) {
                throw new Error('Configuration object not found in the fetched content');
            }

            // Extract properties section with all its entries
            const configContent = configMatch[1];
            
            // Find the properties section start
            const propertiesStartIndex = configContent.indexOf('properties:');
            if (propertiesStartIndex === -1) {
                throw new Error('Properties section not found in the configuration');
            }
            
            // Extract the properties content by tracking opening and closing braces
            let propertiesContent = '';
            let depth = 0;
            let inProperties = false;
            let startExtract = false;
            
            for (let i = propertiesStartIndex; i < configContent.length; i++) {
                const char = configContent[i];
                
                if (char === '{' && !inProperties) {
                    inProperties = true;
                    continue;
                }
                
                if (inProperties) {
                    if (char === '{') {
                        depth++;
                        startExtract = true;
                    } else if (char === '}') {
                        depth--;
                    }
                    
                    if (startExtract) {
                        propertiesContent += char;
                    }
                    
                    if (depth === 0 && startExtract) {
                        break;
                    }
                }
            }
            
            // Find all keys that start with 'accessibility.signals.'
            const signalRegex = /'accessibility\.signals\.[^']*'\s*:\s*{[^}]*description\s*:\s*localize\s*\(\s*'[^']*',\s*'([^']*)'\)/g;
            const signalKeyRegex = /'(accessibility\.signals\.[^']*)'/;
            
            let match;
            const signals: { [key: string]: string } = {};
            
            // Iterate through the properties to extract signal descriptions
            const lines = propertiesContent.split('\n');
            let currentKey = '';
            let inAccessibilitySignalBlock = false;
            
            for (const line of lines) {
                // Check if the line contains a key starting with 'accessibility.signals.'
                const keyMatch = line.match(/'(accessibility\.signals\.[^']*)':/);
                if (keyMatch) {
                    currentKey = keyMatch[1];
                    inAccessibilitySignalBlock = true;
                    continue;
                }
                
                // If we're inside an accessibility signal block, look for the description
                if (inAccessibilitySignalBlock) {
                    const descMatch = line.match(/description\s*:\s*localize\s*\(\s*'[^']*',\s*'([^']*)'\)/);
                    if (descMatch) {
                        signals[currentKey] = descMatch[1];
                    }
                    
                    // Check if this line contains the closing brace of the object
                    if (line.includes('},')) {
                        inAccessibilitySignalBlock = false;
                    }
                }
            }
            
            // Format the results as a string
            if (Object.keys(signals).length === 0) {
                return "No accessibility signals found.";
            }
            
            let result = "# Accessibility Signals\n\n";
            for (const [key, description] of Object.entries(signals)) {
                result += `- **${key}**: ${description}\n`;
            }
            
            return result;
        } catch (error) {
            console.error('Error fetching accessibility signals:', error);
            return `Error fetching accessibility signals: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
}