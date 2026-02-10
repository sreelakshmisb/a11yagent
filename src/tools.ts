/**
 * Language model tools for the a11yagent extension
 */

/**
 * Input parameters for the search_accessibility_issues tool
 */
export interface SearchAccessibilityIssuesInput {
  description: string;
}

/**
 * Tool for searching GitHub accessibility issues
 * Queries the GitHub API to find issues related to web accessibility, WCAG compliance, and accessibility standards
 */
export const searchAccessibilityIssuesTool = {
  name: "search_accessibility_issues",
  description:
    "Searches for and retrieves relevant GitHub accessibility issues based on user-provided descriptions. This tool queries the GitHub API to find issues related to web accessibility, WCAG compliance, and accessibility standards. Use this tool when the user describes an accessibility problem or requests information about existing accessibility issues.",
  inputSchema: {
    type: "object",
    properties: {
      description: {
        type: "string",
        description:
          "A detailed description of the accessibility issue to search for. Should include relevant keywords about the accessibility problem, such as WCAG compliance, screen reader support, keyboard navigation, color contrast, or other accessibility concerns.",
      },
    },
    required: ["description"],
  },
};
