import * as vscode from "vscode";
import axios from "axios";
import { REPOSITORIES, TRACKED_ISSUES_KEY } from "../../constants.js";
import { TrackedIssue } from "../../types/githubTypes.js";

// Searches GitHub for issues matching the given description
export async function searchGitHubIssues(description: string): Promise<any[]> {
  // Refine the issue description before searching GitHub issues
  const repositories = REPOSITORIES;
  const allIssues: any[] = [];
  for (const repo of repositories) {
    try {
      // Query the GitHub API for open issues in the specified repositories
      const response = await axios.get(`https://api.github.com/search/issues`, {
        params: {
          q: `${description} repo:${repo} is:issue label:accessibility`,
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
export async function createGitHubIssue(description: string) {
  const body = encodeURIComponent(description);
  const url = `https://github.com/microsoft/vscode/issues/new?body=${body}`;
  await vscode.env.openExternal(vscode.Uri.parse(url));
}

// Function to fetch a specific GitHub issue by issue number and add to tracked issues
export async function fetchAndTrackIssue(
  context: vscode.ExtensionContext,
  issueNumber: string,
  repo = "microsoft/vscode"
): Promise<{ success: boolean; message: string }> {
  try {
    // Parse and validate issue number
    const issueNum = parseInt(issueNumber.trim(), 10);
    if (isNaN(issueNum) || issueNum <= 0) {
      return {
        success: false,
        message: `Invalid issue number: "${issueNumber}". Please enter a valid positive number.`
      };
    }

    // Fetch issue from GitHub API
    const response = await axios.get(`https://api.github.com/repos/${repo}/issues/${issueNum}`, {
      headers: {
        Accept: "application/vnd.github+json",
      },
    });

    const issue = response.data;
    
    // Check if it's actually an issue (not a PR) and exists
    if (issue.pull_request) {
      return {
        success: false,
        message: `#${issueNum} is a pull request, not an issue. Only issues can be tracked.`
      };
    }

    // Create issue object for tracking
    const trackedIssue: TrackedIssue = {
      title: issue.title,
      html_url: issue.html_url,
      api_url: issue.url,
      repository: repo,
      state: issue.state,
      hasUpdates: false,
    };

    // Get existing tracked issues
    const trackedIssues = context.globalState.get<TrackedIssue[]>(TRACKED_ISSUES_KEY, []);

    // Check if issue is already being tracked
    const existingIssue = trackedIssues.find(
      (tracked) => tracked.html_url === trackedIssue.html_url
    );

    if (existingIssue) {
      return {
        success: false,
        message: `Issue #${issueNum} "${issue.title}" is already being tracked.`
      };
    }

    // Add to tracked issues
    trackedIssues.push(trackedIssue);
    await context.globalState.update(TRACKED_ISSUES_KEY, trackedIssues);
    
    return {
      success: true,
      message: `Successfully added issue #${issueNum} "${issue.title}" to tracking.`
    };

  } catch (error: any) {
    if (error.response?.status === 404) {
      return {
        success: false,
        message: `Issue #${issueNumber} not found in repository ${repo}.`
      };
    } else {
      console.error("Error fetching issue:", error);
      return {
        success: false,
        message: `Failed to fetch issue #${issueNumber}. Please try again.`
      };
    }
  }
}