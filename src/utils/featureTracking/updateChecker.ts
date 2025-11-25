import * as vscode from "vscode";
import axios from "axios";
import { TRACKED_ISSUES_KEY, TRACKED_DESCRIPTIONS_KEY } from "../../constants.js";
import { searchGitHubIssues } from "./githubHelper.js";
import { removeTrackedFeature } from "./featureRemover.js";

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

    // Debugging logs to verify updates
    console.log("Updates:", updates);
    console.log("Tracked Issues:", trackedIssues);

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

    console.log("Updated Issues:", updatedIssues);

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
      // Assuming removeTrackedFeature is imported where needed
      removeTrackedFeature(context);
    }
  }
}

export async function checkForUpdatesChat(context: vscode.ExtensionContext, stream: vscode.ChatResponseStream) {
  const trackedIssues = context.globalState.get<any[]>(TRACKED_ISSUES_KEY, []);
  let updatedIssues: any[] = [];

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

    // Debugging logs to verify updates
    console.log("Updates:", updates);
    console.log("Tracked Issues:", trackedIssues);

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

    console.log("Updated Issues:", updatedIssues);

    if (updatedIssues.length > 0) {
    }

    if (updatedIssues.length > 0) {

      // Save the updated issues back to global state
      await context.globalState.update(TRACKED_ISSUES_KEY, trackedIssues);

      // Send details about updated issues to the chat response stream
      const updatedIssuesDetails = updatedIssues.map(
        (issue) => `- [${issue.title}](${issue.html_url}) (State: ${issue.state})`
      ).join("\n");

      stream.markdown(
        `### Updated Issues:\n${updatedIssuesDetails}`
      );

      // Add a button to view updates
      stream.button({
        command: "a11yagent.removeTrackedFeature",
        title: "View Updated Issues",
      });
    } else {
      stream.markdown("No updates found for tracked issues.");
    }
  } else {
    stream.markdown("No tracked issues to check.");
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

