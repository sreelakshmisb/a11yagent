import * as vscode from 'vscode';
import axios, { AxiosError } from 'axios';
import { getGitHubBearer } from '../auth.js';

// Add a flag to indicate updates
const TRACKED_ISSUES_KEY = 'trackedIssues';

// Logs a feature by allowing the user to describe an issue and selecting relevant GitHub issues to track
export async function logFeature(context: vscode.ExtensionContext) {
  // Prompt the user to describe the issue they are facing
  const issueDescription = await vscode.window.showInputBox({
    prompt: 'Describe the issue you are facing:'
  });

  if (issueDescription) {
    // Refine the issue description before searching GitHub issues
    const refinedDescription = await refineDescription(issueDescription);

    // Search GitHub for issues matching the refined description
    const issues = await searchGitHubIssues(refinedDescription);

    if (issues.length > 0) {
      // Display the top 3 issues in a quick pick menu
      const quickPick = vscode.window.createQuickPick();
      quickPick.placeholder = 'Select issues to track:';
      quickPick.canSelectMany = false;
      quickPick.items = createQuickPickItems(issues.slice(0, 3));

      // Add a last row entry to create an issue in the VS Code GitHub repository
      quickPick.items = [
        ...quickPick.items,
        {
          label: '$(add) Create Issue in VS Code Repo',
          detail: 'Create a new issue in the VS Code repository',
          alwaysShow: true, // Ensure the button is always visible
        },
      ];

      // Open the issue URL when the external link button is clicked
      quickPick.onDidTriggerItemButton(async (e) => {
        const issueUrl = e.item.detail;
        if (issueUrl) {
          await vscode.env.openExternal(vscode.Uri.parse(issueUrl));
        }
      });

      quickPick.onDidAccept(async () => {
        const selectedItem = quickPick.selectedItems[0];
        const trackedIssues = context.globalState.get<any[]>(TRACKED_ISSUES_KEY, []);

        if (selectedItem.detail === 'Create a new issue in the VS Code repository') {
          // Open the GitHub issue creation page for VS Code
          await createGitHubIssue(issueDescription);
        } else {
          // Handle tracking selected issues
          const issue = issues.find(issue => issue.html_url === selectedItem.detail);
          if (issue) {
            trackedIssues.push(issue);
          }
        }

        // Save the selected issue to global state
        await context.globalState.update(TRACKED_ISSUES_KEY, trackedIssues);
        vscode.window.showInformationMessage('Selected issue has been logged and will be tracked.');
        quickPick.hide();

      });

      quickPick.ignoreFocusOut = true;
      quickPick.show();

    } else {
      // Inform the user if no relevant issues were found
      const action = await vscode.window.showInformationMessage(
        'No relevant GitHub issues found for your description.',
        'Create Issue in VS Code Repo'
      );
      if (action === 'Create Issue in VS Code Repo') {
        await createGitHubIssue(issueDescription);
      }
    }
  }
}

// Searches GitHub for issues matching the given description
async function searchGitHubIssues(description: string): Promise<any[]> {
  const repositories = [
    'microsoft/vscode',
    'microsoft/vscode-copilot-release'
  ];
  const allIssues: any[] = [];
  for (const repo of repositories) {
    try {
      // Query the GitHub API for open issues in the specified repositories
      const response = await axios.get(`https://api.github.com/search/issues`, {
        params: {
          q: `${description} repo:${repo} is:issue state:open`
        }
      });
      const issues = response.data.items.map((issue: any) => ({
        title: issue.title,
        html_url: issue.html_url,
        api_url: issue.url,
        repository: repo,
        state: issue.state, // Track the state field instead of updated_at
        hasUpdates: false // Initialize hasUpdates to false
      }));
      allIssues.push(...issues);
    } catch (error) {
      // Log and display an error message if the API request fails
      vscode.window.showErrorMessage(`Failed to fetch issues from ${repo}.`);
    }
  }
  return allIssues;
}

// Function to create a GitHub issue in vs code repo
async function createGitHubIssue(description: string) {
  const body = encodeURIComponent(description);
  const url = `https://github.com/microsoft/vscode/issues/new?body=${body}`;
  await vscode.env.openExternal(vscode.Uri.parse(url));
 
}

// Checks for updates to tracked issues and notifies the user about the same
export async function checkForUpdates(context: vscode.ExtensionContext) {
  const trackedIssues = context.globalState.get<any[]>(TRACKED_ISSUES_KEY, []);

  if (trackedIssues.length > 0) {
    // Check for updates to each tracked issue
    const updates = await Promise.all(
      trackedIssues.map(async issue => {
        try {
          const response = await axios.get(issue.api_url, {
            headers: {
              Accept: 'application/vnd.github+json',
            },
          });
          return { ...issue, state: response.data.state };
        } catch (error) {
          console.error(`Error checking updates for issue ${issue.html_url}:`, error);
          return null;
        }
      })
    );

    // Filter issues that have had a state change
    const updatedIssues = updates.filter((update, index) => update && update.state !== trackedIssues[index].state);

    if (updatedIssues.length > 0) {
      // Set the hasUpdates flag only for issues with state changes
      updatedIssues.forEach(updatedIssue => {
        const issueIndex = trackedIssues.findIndex(issue => issue.html_url === updatedIssue.html_url);
        if (issueIndex !== -1) {
          trackedIssues[issueIndex].hasUpdates = true;
          trackedIssues[issueIndex].state = updatedIssue.state; // Update the state
        }
      });

      // Save the updated issues back to global state
      await context.globalState.update(TRACKED_ISSUES_KEY, trackedIssues);

      // Notify the user about the updates
      vscode.window.showInformationMessage(
        `State changes detected for ${updatedIssues.length} tracked issue(s). Check your tracked issues.`
      );
    }
  }
}

// Removes selected issues from the list of tracked issues
// For an issue with updates, updates the state when the user clicks the refresh icon
export async function removeTrackedFeature(context: vscode.ExtensionContext) {
  const trackedIssues = context.globalState.get<any[]>(TRACKED_ISSUES_KEY, []);

  if (trackedIssues.length === 0) {
    // Inform the user if no issues are being tracked
    vscode.window.showInformationMessage('No issues are currently being tracked.');
    return;
  }

  // Display a quick pick menu to select issues to remove
  const quickPick = vscode.window.createQuickPick();
  quickPick.items = createQuickPickItems(trackedIssues);
  quickPick.canSelectMany = true;

  // Handle the refresh button click
  quickPick.onDidTriggerItemButton(async (e) => {
    if (e.button.tooltip === 'Refresh Issue State') {
      const issueUrl = e.item.detail;
      const issueIndex = trackedIssues.findIndex(issue => issue.html_url === issueUrl);

      if (issueIndex !== -1) {
        try {
          const response = await axios.get(trackedIssues[issueIndex].api_url, {
            headers: {
              Accept: 'application/vnd.github+json',
            },
          });
          trackedIssues[issueIndex].state = response.data.state; // Update the state
          trackedIssues[issueIndex].hasUpdates = false; // Reset the hasUpdates flag

          // Save the updated issues back to global state
          await context.globalState.update(TRACKED_ISSUES_KEY, trackedIssues);

          // Update the quick pick items to remove the refresh button
          quickPick.items = createQuickPickItems(trackedIssues);

          vscode.window.showInformationMessage(`State refreshed for issue: ${trackedIssues[issueIndex].title}`);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to refresh state for issue: ${trackedIssues[issueIndex].title}`);
        }
      }
    } else if (e.button.tooltip === 'Open Issue') {
      const issueUrl = e.item.detail;
      if (issueUrl) {
        await vscode.env.openExternal(vscode.Uri.parse(issueUrl));
      }
    }
  });

  quickPick.onDidAccept(async () => {
    const selectedItems = quickPick.selectedItems;
    const updatedTrackedIssues = trackedIssues.filter(issue => !selectedItems.find(selected => selected.detail === issue.html_url));

    // Save the updated tracked issues list to global state
    await context.globalState.update(TRACKED_ISSUES_KEY, updatedTrackedIssues);
    vscode.window.showInformationMessage('Selected issue(s) have been removed from tracking.');
    quickPick.hide();
  });

  quickPick.ignoreFocusOut = true;
  quickPick.show();
}

// Utility function to create QuickPick items for GitHub issues
function createQuickPickItems(issues: any[]): vscode.QuickPickItem[] {
  return issues.map(issue => ({
    label: issue.title,
    description: issue.repository,
    detail: issue.html_url,
    buttons: [
      {
        iconPath: new vscode.ThemeIcon('link-external'),
        tooltip: 'Open Issue'
      },
      ...(issue.hasUpdates ? [{
        iconPath: new vscode.ThemeIcon('refresh'),
        tooltip: 'Refresh Issue State'
      }] : [])
    ],
  }));
}

// Utility function to refine the user's issue description before running a GitHub search
async function refineDescription(prompt: string): Promise<string> {
  const instruction = `
  From the following detailed issue description, generate a concise, search-optimized GitHub query.
  Focus on the core technical elements: features, key error messages, function/class/module names, APIs, file paths,libraries/frameworks, versions, and the main symptom or behavior.
  Output only the final query string, suitable for use in a GitHub issue search.
  Do not add decorative wording; reuse the user's own terms where possible and avoid complicated language not already present in the description.
  `;
    const messages = [
        vscode.LanguageModelChatMessage.User(instruction),
        vscode.LanguageModelChatMessage.User(prompt)
    ];

    try {
        const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
        const cts = new vscode.CancellationTokenSource();
        const chatResponse = await model.sendRequest(messages, {}, cts.token);
        let refinedDescription = '';

        for await (const fragment of chatResponse.text) {
            refinedDescription += fragment;
        }

        return refinedDescription.trim(); // Return the refined description
    } catch (error) {
        vscode.window.showErrorMessage('Error refining the issue description. Using the original description.');
        return prompt; // Fallback to the original prompt if refinement fails
    }
}