import * as vscode from 'vscode';
import axios from 'axios';

// Add a flag to indicate updates
const TRACKED_ISSUES_KEY = 'trackedIssues';

// Logs a feature by allowing the user to describe an issue and select relevant GitHub issues to track
export async function logFeature(context: vscode.ExtensionContext) {
  // Prompt the user to describe the issue they are facing
  const issueDescription = await vscode.window.showInputBox({
    prompt: 'Describe the issue you are facing:'
  });

  if (issueDescription) {
    // Search GitHub for issues matching the description
    const issues = await searchGitHubIssues(issueDescription);

    if (issues.length > 0) {
      // Display the top 3 issues in a quick pick menu
      const quickPick = vscode.window.createQuickPick();
      quickPick.items = issues.slice(0, 3).map(issue => ({
        label: issue.title,
        description: issue.repository,
        detail: issue.html_url,
        buttons: [
          {
            iconPath: new vscode.ThemeIcon('link-external'),
            tooltip: 'Open Issue'
          }
        ],
      }));
      quickPick.canSelectMany = true;
      quickPick.placeholder = 'Select issues to track:';

      // Open the issue URL when the external link button is clicked
      quickPick.onDidTriggerItemButton(async (e) => {
        const issueUrl = e.item.detail;
        if (issueUrl) {
          await vscode.env.openExternal(vscode.Uri.parse(issueUrl));
        }
      });

      // Handle the selection of issues to track
      quickPick.onDidAccept(async () => {
        const selectedItems = quickPick.selectedItems;
        const trackedIssues = context.globalState.get<any[]>(TRACKED_ISSUES_KEY, []);

        selectedItems.forEach(async selectedItem => {
          const issue = issues.find(issue => issue.html_url === selectedItem.detail);
          if (issue) {
            trackedIssues.push(issue);
          }
        });

        // Save the selected issues to global state
        await context.globalState.update(TRACKED_ISSUES_KEY, trackedIssues);
        vscode.window.showInformationMessage('Selected issues have been logged and will be tracked.');
        quickPick.hide();
      });

      quickPick.ignoreFocusOut = true;
      quickPick.show();
    } else {
      // Inform the user if no relevant issues were found
      vscode.window.showInformationMessage('No relevant GitHub issues found for your description.');
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
        state: issue.state // Track the state field instead of updated_at
      }));
      allIssues.push(...issues);
    } catch (error) {
      // Log and display an error message if the API request fails
      console.error(`Error fetching issues from ${repo}:`, error);
      vscode.window.showErrorMessage(`Failed to fetch issues from ${repo}.`);
    }
  }

  return allIssues;
}

// Notifies the user about updates to tracked issues
export async function notifyTrackedFeature(context: vscode.ExtensionContext) {
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
// Update state only when the user clicks the refresh icon
// Ensure the refresh icon only appears for issues with updates and disappears after refresh
export async function removeTrackedFeature(context: vscode.ExtensionContext) {
  const trackedIssues = context.globalState.get<any[]>(TRACKED_ISSUES_KEY, []);

  if (trackedIssues.length === 0) {
    // Inform the user if no issues are being tracked
    vscode.window.showInformationMessage('No issues are currently being tracked.');
    return;
  }

  // Display a quick pick menu to select issues to remove
  const quickPick = vscode.window.createQuickPick();
  quickPick.items = trackedIssues.map(issue => ({
    label: issue.title,
    description: issue.repository,
    detail: issue.html_url,
    buttons: [
      {
        iconPath: new vscode.ThemeIcon('link-external'),
        tooltip: 'Open Issue'
      },
      // Keep the refresh button next to the open external button
      ...(issue.hasUpdates ? [{
        iconPath: new vscode.ThemeIcon('refresh'),
        tooltip: 'Refresh Issue State'
      }] : [])
    ]
  }));

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
          quickPick.items = trackedIssues.map(issue => ({
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
            ]
          }));

          vscode.window.showInformationMessage(`State refreshed for issue: ${trackedIssues[issueIndex].title}`);
        } catch (error) {
          console.error(`Error refreshing state for issue ${issueUrl}:`, error);
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

  quickPick.canSelectMany = true;
  quickPick.placeholder = 'Remove issues from tracking by selecting them and clicking on OK';

  // Handle the selection of issues to remove
  quickPick.onDidAccept(async () => {
    const selectedItems = quickPick.selectedItems;
    const updatedIssues = trackedIssues.filter(
      issue => !selectedItems.some(selectedItem => issue.html_url === selectedItem.detail)
    );

    // Update the global state with the remaining issues
    await context.globalState.update(TRACKED_ISSUES_KEY, updatedIssues);
    vscode.window.showInformationMessage('Selected issues have been removed from tracking.');
    quickPick.hide();
  });

  quickPick.ignoreFocusOut = true;
  quickPick.show();
}