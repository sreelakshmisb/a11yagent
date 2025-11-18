import * as vscode from "vscode";
import { TRACKED_DESCRIPTIONS_KEY } from "../../constants.js";
import { TrackedDescription, TrackedIssue } from "../../types/githubTypes.js";

// Utility function to create QuickPick items for tracked issues and descriptions (if flag is set to true)
export function createQuickPickItems(
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