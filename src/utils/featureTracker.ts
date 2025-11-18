import * as vscode from "vscode";
import axios from "axios";

// Add a flag to indicate updates
const TRACKED_ISSUES_KEY = "trackedIssues";
const TRACKED_DESCRIPTIONS_KEY = "trackedDescriptions";

// Define the format for issues and descriptions
interface TrackedDescription {
  title: string;
  description: string;
  hasUpdates: boolean;
  html_url: string;
}

interface TrackedIssue {
  title: string;
  html_url: string;
  api_url: string;
  repository: string;
  state: string;
  hasUpdates: boolean;
}

// Logs a feature by allowing the user to describe an issue and selecting relevant GitHub issues to track
export async function logFeature(context: vscode.ExtensionContext) {
  // Prompt the user to describe the issue they are facing
  const issueDescription = await vscode.window.showInputBox({
    prompt: "Describe the issue you are facing:",
  });

  if (issueDescription) {
    // Search GitHub for issues matching the refined description
    const issues = await searchGitHubIssues(issueDescription);
    // Display the top 3 issues in a quick pick menu
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = "Select issues to track:";
    quickPick.canSelectMany = false;
    quickPick.items = [
      ...createQuickPickItems(context, issues.slice(0, 5), false),
      {
        label: "$(add) Create Issue in VS Code Repo",
        description: "",
        detail: "Create a new issue in the VS Code repository",
        buttons: [],
      },
      {
        label: "$(eye) Log Description for tracking",
        description: "",
        detail: "Notify me if related issues are created",
        buttons: [],
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
      const trackedIssues = context.globalState.get<any[]>(
        TRACKED_ISSUES_KEY,
        [],
      );

      if (
        selectedItem.detail === "Create a new issue in the VS Code repository"
      ) {
        // Open the GitHub issue creation page for VS Code
        await createGitHubIssue(issueDescription);
      } else if (
        selectedItem.detail === "Notify me if related issues are created"
      ) {
        //Get a title and add the description for tracking
        const title = await vscode.window.showInputBox({
          prompt: "Provide a title for this description:",
        });

        if (title) {
          const trackedDescriptions = context.globalState.get<
            Array<TrackedDescription>
          >(TRACKED_DESCRIPTIONS_KEY, []);
          trackedDescriptions.push({
            title,
            description: issueDescription,
            hasUpdates: false,
            html_url: "",
          });
          await context.globalState.update(
            TRACKED_DESCRIPTIONS_KEY,
            trackedDescriptions,
          );
          vscode.window.showInformationMessage(
            "Description and title have been marked for tracking.",
          );
        } else {
          vscode.window.showWarningMessage(
            "Tracking canceled as no title was provided.",
          );
        }
      } else {
        // Handle tracking selected issues
        const issue = issues.find(
          (issue) => issue.html_url === selectedItem.detail,
        );
        if (issue) {
          // Add the issue to the list of tracked issues
          trackedIssues.push(issue);
          await context.globalState.update(TRACKED_ISSUES_KEY, trackedIssues);
          vscode.window.showInformationMessage(
            `Issue "${issue.title}" is now being tracked.`,
          );
        }
      }

      quickPick.hide();
    });

    quickPick.ignoreFocusOut = true;
    quickPick.show();
    if (issues.length === 0) {
      // Inform the user if no relevant issues were found
      const action = await vscode.window.showInformationMessage(
        "No relevant GitHub issues found for your description."
      );
    }
  }
}

// Removes selected issues from the list of tracked issues
// For an issue with updates, updates the state when the user clicks the refresh icon
export async function removeTrackedFeature(context: vscode.ExtensionContext) {
  const trackedIssues = context.globalState.get<any[]>(TRACKED_ISSUES_KEY, []);
  const trackedDescriptions = context.globalState.get<any[]>(
    TRACKED_DESCRIPTIONS_KEY,
    [],
  );

  if (trackedIssues.length === 0 && trackedDescriptions.length === 0) {
    // Inform the user if no issues are being tracked
    vscode.window.showInformationMessage(
      "No issues are currently being tracked.",
    );
    return;
  }

  // Display a quick pick menu to select issues to remove
  const quickPick = vscode.window.createQuickPick();
  quickPick.items = createQuickPickItems(context, trackedIssues, true);
  quickPick.canSelectMany = true;

  // Handle the refresh button click
  quickPick.onDidTriggerItemButton(async (e) => {
    if (e.button.tooltip === "Refresh State") {
      const issueUrl = e.item.detail;

      if (e.item.description === "microsoft/vscode" || e.item.description === "microsoft/vscode-copilot-release") {
        // Handle refresh for issues
        const issueIndex = trackedIssues.findIndex(
          (issue) => issue.html_url === issueUrl,
        );

        if (issueIndex !== -1) {
          try {
            const response = await axios.get(
              trackedIssues[issueIndex].api_url,
              {
                headers: {
                  Accept: "application/vnd.github+json",
                },
              },
            );
            trackedIssues[issueIndex].state = response.data.state; // Update the state
            trackedIssues[issueIndex].hasUpdates = false; // Reset the hasUpdates flag

            // Save the updated issues back to global state
            await context.globalState.update(TRACKED_ISSUES_KEY, trackedIssues);

            // Update the quick pick items to remove the refresh button
            quickPick.items = createQuickPickItems(
              context,
              trackedIssues,
              true,
            );

            vscode.window.showInformationMessage(
              `State refreshed for issue: ${trackedIssues[issueIndex].title}`,
            );
          } catch (error) {
            vscode.window.showErrorMessage(
              `Failed to refresh state for issue: ${trackedIssues[issueIndex].title}`,
            );
          }
        }
      } else {
        // Handle refresh for descriptions
        const descriptionIndex = trackedDescriptions.findIndex(
          (desc) =>
            desc.title === e.item.label &&
            desc.description === e.item.description,
        );

        if (descriptionIndex !== -1) {
          try {
            const description = trackedDescriptions[descriptionIndex];
            const issues = await searchGitHubIssues(description.description);

            // Always reset the hasUpdates flag
            trackedDescriptions[descriptionIndex].hasUpdates = false;

            if (issues.length > 0) {
              trackedDescriptions[descriptionIndex].html_url = issues[0].html_url; // Use the first issue's URL
            }

            // Save the updated descriptions back to global state
            await context.globalState.update(
              TRACKED_DESCRIPTIONS_KEY,
              trackedDescriptions,
            );

            // Update the quick pick items to reflect the changes
            quickPick.items = createQuickPickItems(
              context,
              trackedIssues,
              true,
            );

            vscode.window.showInformationMessage(
              `State refreshed for description: ${description.title}`,
            );
          } catch (error) {
            vscode.window.showErrorMessage(
              `Failed to refresh state for description: ${trackedDescriptions[descriptionIndex].title}`,
            );
          }
        }
      }
    } else if (e.button.tooltip === "Open Issue") {
      const issueUrl = e.item.detail;
      if (issueUrl) {
        await vscode.env.openExternal(vscode.Uri.parse(issueUrl));
      }
    }
  });

  quickPick.onDidAccept(async () => {
    const selectedItems = quickPick.selectedItems;

    // Filter out selected issues from tracked issues
    const updatedTrackedIssues = trackedIssues.filter(
      (issue) =>
        !selectedItems.find((selected) => selected.detail === issue.html_url),
    );

    // Filter out selected descriptions from tracked descriptions
    const updatedTrackedDescriptions = trackedDescriptions.filter(
      (descriptionItem) =>
        !selectedItems.find((selected) => selected.description === descriptionItem.description),
    );

    // Save the updated tracked issues and descriptions to global state
    await context.globalState.update(TRACKED_ISSUES_KEY, updatedTrackedIssues);
    await context.globalState.update(
      TRACKED_DESCRIPTIONS_KEY,
      updatedTrackedDescriptions,
    );

    if (selectedItems.length > 0) {
      vscode.window.showInformationMessage(
        "Selected item(s) have been removed from tracking.",
      );
    }
    quickPick.hide();
  });

  quickPick.ignoreFocusOut = true;
  quickPick.show();
}

// Searches GitHub for issues matching the given description
async function searchGitHubIssues(description: string): Promise<any[]> {
  // Refine the issue description before searching GitHub issues
  const refinedDescription = await refineDescription(description);
  const repositories = [
    'microsoft/vscode',
    'microsoft/vscode-copilot-release'
    //"sreelakshmisb/portfolio",
  ];
  const allIssues: any[] = [];
  for (const repo of repositories) {
    try {
      // Query the GitHub API for open issues in the specified repositories
      const response = await axios.get(`https://api.github.com/search/issues`, {
        params: {
          q: `${refinedDescription} repo:${repo} is:issue state:open`,
        },
      });
      const issues = response.data.items.map((issue: any) => ({
        title: issue.title,
        html_url: issue.html_url,
        api_url: issue.url,
        repository: repo,
        state: issue.state,
        hasUpdates: false, // to track updated issues
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

// Checks for updates to tracked issues and notifies the user about the same
export async function checkForUpdates(context: vscode.ExtensionContext) {
  const trackedIssues = context.globalState.get<any[]>(TRACKED_ISSUES_KEY, []);
  let updatedIssues: any[] = [];
  let newDescriptions: boolean = false;

  if (trackedIssues.length > 0) {
    // Check for updates to each tracked issue
    const updates = await Promise.all(
      trackedIssues.map(async (issue) => {
        try {
          const response = await axios.get(issue.api_url, {
            headers: { Accept: "application/vnd.github+json" },
          });
          return { ...issue, state: response.data.state };
        } catch (error) {
          console.error(
            `Error checking updates for issue ${issue.html_url}:`,
            error,
          );
          return null;
        }
      }),
    );

    // Process updates and set the hasUpdates flag for changed issues
    updatedIssues = updates.filter((update, index) => {
      if (update && update.state !== trackedIssues[index].state) {
        trackedIssues[index] = {
          ...trackedIssues[index],
          state: update.state,
          hasUpdates: true,
        };
        return true;
      }
      return false;
    });

    if (updatedIssues.length > 0) {
      // Save the updated issues back to global state
      await context.globalState.update(TRACKED_ISSUES_KEY, trackedIssues);
    }
  }

  // Check for updates to tracked descriptions
  const trackedDescriptions = context.globalState.get<any[]>(
    TRACKED_DESCRIPTIONS_KEY,
    [],
  );
  if (trackedDescriptions.length > 0) {
    newDescriptions = await checkDescriptionUpdates(context);
  }

  if (updatedIssues.length > 0 || newDescriptions) {
    const action = await vscode.window.showInformationMessage(
      "Updates found for tracked issues/descriptions. Check your tracked items.",
      "View updates",
    );
    if (action === "View updates") {
      removeTrackedFeature(context);
    }
  }
}

// Searches tracked descriptions for new issues and returns them
export async function checkDescriptionUpdates(
  context: vscode.ExtensionContext,
): Promise<boolean> {
  const trackedDescriptions = context.globalState.get<
    {
      title: string;
      description: string;
      hasUpdates: boolean;
      html_url: string;
    }[]
  >(TRACKED_DESCRIPTIONS_KEY, []);
  const newIssues: any[] = [];

  for (const trackedDescription of trackedDescriptions) {
    const { title, description } = trackedDescription;
    const issues = await searchGitHubIssues(description);

    if (issues.length > 0) {
      // Update the tracked description with hasUpdates and details
      trackedDescription.hasUpdates = true;
      trackedDescription.html_url = issues[0].html_url; // Use the first issue's URL as the detail
      newIssues.push(...issues);
    }
  }

  // Save the updated tracked descriptions back to global state
  await context.globalState.update(
    TRACKED_DESCRIPTIONS_KEY,
    trackedDescriptions,
  );
  if (newIssues.length > 0) {
    return true;
  } else {
    return false;
  }
}

// Utility function to create QuickPick items for tracked issues and descriptions (if flag is set to true)
function createQuickPickItems(
  context: vscode.ExtensionContext,
  entries: TrackedIssue[],
  showDescriptions: boolean,
): vscode.QuickPickItem[] {
  const items: vscode.QuickPickItem[] = [];

  // Add tracked issues to items
  entries.forEach((entry) => {
    items.push({
      label: entry.title,
      description: entry.repository,
      detail: entry.html_url,
      buttons: [
        {
          iconPath: new vscode.ThemeIcon("link-external"),
          tooltip: "Open Issue",
        },
        ...(entry.hasUpdates
          ? [
              {
                iconPath: new vscode.ThemeIcon("refresh"),
                tooltip: "Refresh State",
              },
            ]
          : []),
      ],
    });
  });

  // Add tracked descriptions only if showDescriptions is true
  if (showDescriptions) {
    const descriptions = context.globalState.get<TrackedDescription[]>(
      TRACKED_DESCRIPTIONS_KEY,
      [],
    );
    descriptions.forEach(({ title, description, hasUpdates, html_url }) => {
      items.push({
        label: title,
        description: description,
        detail: html_url,
        buttons: [
          ...(html_url
            ? [
                {
                  iconPath: new vscode.ThemeIcon("link-external"),
                  tooltip: "Open Issue",
                },
              ]
            : []),
          ...(hasUpdates
            ? [
                {
                  iconPath: new vscode.ThemeIcon("refresh"),
                  tooltip: "Refresh State",
                },
              ]
            : []),
        ],
      });
    });
  }

  return items;
}
