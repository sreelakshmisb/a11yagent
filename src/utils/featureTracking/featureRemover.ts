import * as vscode from "vscode";
import axios from "axios";
import {
  TRACKED_ISSUES_KEY,
  TRACKED_DESCRIPTIONS_KEY,
  REPOSITORIES,
} from "../../constants.js";
import { createQuickPickItems } from "./quickPickHelper.js";
import { searchGitHubIssues} from "./githubHelper.js";

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
  quickPick.title = "Manage Tracked Issues";
  quickPick.placeholder = "Select items to remove from tracking";
  quickPick.items = createQuickPickItems(context, trackedIssues, true);
  quickPick.canSelectMany = true;
  quickPick.matchOnDescription = false;
  quickPick.matchOnDetail = false;
  // Hide the search box since we're just selecting from a list
  quickPick.value = '';

  // Handle the refresh button click
  quickPick.onDidTriggerItemButton(async (e) => {
    if (e.button.tooltip === "Refresh State") {
      const issueUrl = e.item.detail;

      if (e.item.description && REPOSITORIES.includes(e.item.description)) {
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
              trackedDescriptions[descriptionIndex].html_url =
                issues[0].html_url; // Use the first issue's URL
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
        !selectedItems.find(
          (selected) => selected.description === descriptionItem.description,
        ),
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
