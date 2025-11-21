import * as vscode from "vscode";
import { TRACKED_ISSUES_KEY, TRACKED_DESCRIPTIONS_KEY } from "../../constants.js";
import { TrackedDescription } from "../../types/githubTypes.js";
import { searchGitHubIssues, createGitHubIssue } from "./githubHelper.js";
import { createQuickPickItems } from "./quickPickHelper.js";

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
    quickPick.matchOnDescription = false;
    quickPick.matchOnDetail = false;
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