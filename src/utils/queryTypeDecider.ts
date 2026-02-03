import * as vscode from 'vscode';

/**
 * Classifies the query type using a language model.
 * The type of query: 'audioCue', 'settings', 'keybindings', or 'general'.
 */

export async function classifyQueryType(prompt: string): Promise<string> {
    const messages = [
        vscode.LanguageModelChatMessage.User(
            `Classify the following query into one of the categories: 'audioCues', 'settings and features', 'keybindings', or 'general'. Respond with only the category name. Query: "${prompt}"`
        )
    ];

    let chatResponse: vscode.LanguageModelChatResponse | undefined;
    const [model] = await vscode.lm.selectChatModels({id: 'gpt-4.1'});

    try {
      chatResponse = await model.sendRequest(
        messages,
        {},
        new vscode.CancellationTokenSource().token
      );
    } catch (err) {
        console.log('Error in classifying query type:', err);
        return 'general';
      }

    try {
        let text = '';
        for await (const chunk of chatResponse.text) {
            text += chunk;
        }
        const classification = text.trim().toLowerCase();
        if (['audiocues', 'settings and features', 'keybindings', 'general'].includes(classification)) {
            return classification;
        }

    } catch (error) {
        console.error('Error classifying query type:', error);
    }
    return 'general'; // Default to 'general' if classification fails
}