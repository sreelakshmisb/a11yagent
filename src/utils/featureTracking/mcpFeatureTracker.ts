import * as vscode from 'vscode';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { getGitHubBearer } from '../../auth.js';

const TRACKED_ISSUES_KEY = 'trackedGithubIssues';
// Global variable to store the MCP client instance
let client: Client | null = null;

//Connect to GitHub’s MCP server over Streamable HTTP.
export async function getGitHubMcpClient(context: vscode.ExtensionContext) {
  const baseUrl = new URL('https://api.githubcopilot.com/mcp');
  if(client){
    return client;
  }

  client =  new Client({
    name: 'github-mcp-client',
    version: '1.0.0'
  }); 

  const transport = new StreamableHTTPClientTransport(baseUrl, {
    requestInit: {
      headers: {
        Authorization: `Bearer ${await getGitHubBearer()}`
      }
  }
  });

  await client.connect(transport);
  console.log('Connected to GitHub MCP using Streamable HTTP');
  return client;
}

// Lets the user describe an issue and select relevant issues to track
export async function logFeature(context: vscode.ExtensionContext) {
  const issueDescription = await vscode.window.showInputBox({
    prompt: 'Describe the Issue you are facing:'
  });

  if (issueDescription) {
    const client = await getGitHubMcpClient(context);
    const issues = await searchMcpIssues(client, issueDescription);

    if (issues.length > 0) {
      const quickPick = vscode.window.createQuickPick();
      quickPick.items = createQuickPickItems(issues.slice(0, 3));
      quickPick.canSelectMany = true;
      quickPick.placeholder = 'Select MCP issues to track:';

      quickPick.onDidTriggerItemButton(async (e) => {
        const issueUrl = e.item.detail;
        if (issueUrl) {
          await vscode.env.openExternal(vscode.Uri.parse(issueUrl));
        }
      });

      quickPick.onDidAccept(async () => {
        const selectedItems = quickPick.selectedItems;
        const trackedIssues = context.globalState.get<any[]>(TRACKED_ISSUES_KEY, []);

        selectedItems.forEach(async selectedItem => {
          const issue = issues.find(issue => issue.html_url === selectedItem.detail);
          if (issue) {
            trackedIssues.push(issue);
          }
        });

        await context.globalState.update(TRACKED_ISSUES_KEY, trackedIssues);
        vscode.window.showInformationMessage('Selected issue(s) have been logged and will be tracked.');
        quickPick.hide();
      });

      quickPick.ignoreFocusOut = true;
      quickPick.show();
    } else {
      vscode.window.showInformationMessage('No relevant issues found for your description.');
    }
  }
}

// Searches Github for issues matching the given description, using the MCP client
async function searchMcpIssues(client: Client, description: string): Promise<any[]> {
  const repositories = [
    'microsoft/vscode',
    'microsoft/vscode-copilot-release'
  ];

  const allIssues: any[] = [];

  for (const repo of repositories) {
    try {
      // Use the search_issues tool for searching and finding issues with relevant descriptions
      const response = await client.callTool({
        name: 'search_issues',
        arguments: {
          query: `${description} repo:${repo} is:issue state:open`
        }
      }) as any;
      
      const textContent = response?.content?.[0]?.text;
      if (!textContent) {
        vscode.window.showErrorMessage(`Empty response from ${repo}`);
        continue;
      }

      // Parse the JSON string
      let parsed;
      try {
        parsed = JSON.parse(textContent);
      } catch {
        vscode.window.showErrorMessage(`Invalid JSON in response from ${repo}`);
        continue;
      }

      // Validate and cast the response
      if (Array.isArray(parsed.items)) {
        const issues = parsed.items.map((issue: any) => ({
          number: issue.number, // Store issue number instead of ID
          title: issue.title,
          html_url: issue.html_url,
          api_url: issue.url,
          repository: repo,
          state: issue.state,
          hasUpdates: false
        }));
        allIssues.push(...issues);
      } else {
        vscode.window.showErrorMessage(`Unexpected response format from ${repo}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to fetch issues from ${repo}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return allIssues;
}

// Removes selected issues from the list of tracked issues
// For an issue with updates, update the state when the user clicks the refresh icon
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

  // Handle the refresh button click
  quickPick.onDidTriggerItemButton(async (e) => {
    if (e.button.tooltip === 'Refresh Issue State') {
      const issueUrl = e.item.detail;
      const issueIndex = trackedIssues.findIndex(issue => issue.html_url === issueUrl);

      if (issueIndex !== -1) {
        // Use the MCP client to refresh the issue state
        const client = await getGitHubMcpClient(context);
        const updatedIssue = await refreshIssueState(client, trackedIssues[issueIndex]);

        if (updatedIssue) {
          trackedIssues[issueIndex] = updatedIssue; // Update the issue in the tracked issues array

          // Save the updated issues back to global state
          await context.globalState.update(TRACKED_ISSUES_KEY, trackedIssues);

          // Update the quick pick items to remove the refresh button
          quickPick.items = createQuickPickItems(trackedIssues);

          vscode.window.showInformationMessage(`State refreshed for issue: ${trackedIssues[issueIndex].title}`);
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
    vscode.window.showInformationMessage('Selected issue(s) have been removed from tracking.');
    quickPick.hide();
  });

  quickPick.ignoreFocusOut = true;
  quickPick.show();
}

// Utility function to refresh the state of a tracked issue using the MCP client
async function refreshIssueState(client: Client, issue: any): Promise<any> {
  try {
    // Extract the repository name in the correct format
    const repoName = issue.repository.includes('/') ? issue.repository.split('/')[1] : issue.repository;

    const response = await client.callTool({
      name: 'issue_read',
      arguments: {
        owner: 'microsoft',
        repo: repoName, // Use the correctly formatted repository name
        issue_number: issue.number,
        method: 'get'
      }
    }) as any;

    const text = response?.content?.[0]?.text;
    if (!text) {
      console.log(`No data received for issue #${issue.number}`);
      return null;
    }

    let parsedIssue;
    try {
      parsedIssue = JSON.parse(text);
    } catch (err) {
      console.log(`Invalid JSON in issue_read response: ${err}`);
      return issue;
    }

  const updatedIssue = {
    ...issue,
    state: parsedIssue.state,
    title: parsedIssue.title,
    hasUpdates: false,
  };

    return updatedIssue;
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to refresh state for issue: ${issue.title}`);
    return null;
  }
}

// Utility function to create QuickPick items for issues
function createQuickPickItems(issues: any[]): vscode.QuickPickItem[] {
  return issues.map(issue => ({
    label: issue.title,
    description: issue.repository,
    detail: issue.html_url,
    buttons: [
      {
        iconPath: new vscode.ThemeIcon('refresh'),
        tooltip: 'Refresh Issue State'
      },
      {
        iconPath: new vscode.ThemeIcon('link-external'),
        tooltip: 'Open Issue'
      }
    ],
  }));
}

