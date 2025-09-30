export class AudioCuesSource {

    private readonly url: string = 'https://raw.githubusercontent.com/microsoft/vscode/f554e3c48013328227e23981a33d0f0d902dc75d/src/vs/workbench/contrib/accessibility/browser/accessibilityConfiguration.ts';

    /**
     * Fetches and extracts audio cues and their descriptions from the provided URL.
     */
    public async getContext(): Promise<{ name: string; description: string }[]> {
        const response = await fetch(this.url);
        const fileContent = await response.text();

        const audioCues: { name: string; description: string }[] = [];

        // Refine logic to extract signal name and description from `localize` calls in `properties`
        const configurationMatch = fileContent.match(/const configuration: IConfigurationNode = (\{[\s\S]*?\});/);
        if (configurationMatch) {
            try {
                const configurationObject = eval(`(${configurationMatch[1]})`); // Use eval to handle JavaScript-like syntax
                if (configurationObject.properties) {
                    for (const [key, value] of Object.entries(configurationObject.properties)) {
                        if (
                            value &&
                            typeof value === 'object' &&
                            'description' in value &&
                            typeof (value as any).description === 'string'
                        ) {
                            const descriptionMatch = (value as any).description.match(/localize\('([^']+)',\s*"([^"]+)"\)/);
                            if (descriptionMatch) {
                                const signalName = descriptionMatch[1];
                                const signalDescription = descriptionMatch[2];
                                audioCues.push({
                                    name: signalName,
                                    description: signalDescription
                                });
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error parsing configuration object:', error);
            }
        }

        return audioCues;
    }
}