import * as vscode from "vscode";
import axios from "axios";
import { REPOSITORIES } from "../../constants.js";
import { optimizeQuery } from "./queryOptimizer.js";

// Searches GitHub for issues matching the given description
export async function searchGitHubIssues(description: string): Promise<any[]> {
  // Refine the issue description before searching GitHub issues
  const refinedDescription = await optimizeQuery(description);
  console.log(refinedDescription);
  const repositories = REPOSITORIES;
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
export async function createGitHubIssue(description: string) {
  const body = encodeURIComponent(description);
  const url = `https://github.com/microsoft/vscode/issues/new?body=${body}`;
  await vscode.env.openExternal(vscode.Uri.parse(url));
}