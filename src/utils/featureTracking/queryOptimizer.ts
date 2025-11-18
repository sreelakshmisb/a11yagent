import * as vscode from "vscode";

// Utility fucntion to optimize user queries before running GitHub searches
export async function optimizeQuery(prompt: string): Promise<string> {
  const instruction = `
  From the following detailed issue description, generate a concise, search-optimized GitHub query.
  Focus on the core technical elements: features, key error messages, function/class/module names, APIs, file paths,libraries/frameworks, versions, and the main symptom or behavior.
  Output only the final query string, suitable for use in a GitHub issue search.
  Do not add decorative wording; reuse the user's own terms where possible and avoid complicated language not already present in the description.
  `;
  const messages = [
    vscode.LanguageModelChatMessage.User(instruction),
    vscode.LanguageModelChatMessage.User(prompt),
  ];

  try {
    const [model] = await vscode.lm.selectChatModels({
      vendor: "copilot",
      family: "gpt-4o",
    });
    const cts = new vscode.CancellationTokenSource();
    const chatResponse = await model.sendRequest(messages, {}, cts.token);
    let refinedDescription = "";

    for await (const fragment of chatResponse.text) {
      refinedDescription += fragment;
    }

    return refinedDescription.trim(); // Return the refined description
  } catch (error) {
    vscode.window.showErrorMessage(
      "Error refining the issue description. Using the original description.",
    );
    return prompt; // Fallback to the original prompt if refinement fails
  }
}