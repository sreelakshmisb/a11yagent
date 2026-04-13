import * as vscode from "vscode";
import * as chatUtils from "@vscode/chat-extension-utils";

export async function checkQuery(
  request: vscode.ChatRequest,
  chatContext: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken,
): Promise<void> {
  const issueSearchTool = vscode.lm.tools.find(
    (tool) => tool.name === "mcp_io_github_git_search_issues",
  );
  const issueReadTool = vscode.lm.tools.find(
    (tool) => tool.name === "mcp_io_github_git_issue_read",
  );
  if (!issueSearchTool) {
    stream.markdown(
      "Unable to use GitHub tools to complete the query. Please install and enable the GitHub MCP server first.",
    );
    return;
  }
  if (!issueReadTool) {
    stream.markdown(
      "Note: GitHub issue comment lookup is unavailable because the MCP tool 'mcp_io_github_git_issue_read' is not installed/enabled. I will still search issues, but I cannot include comment-based workarounds.\n\n",
    );
  }

  const instruction = `
    You are an assistant that finds relevant GitHub issues. Your job is to take a user's accessibility-related problem description and return only the most relevant, verified issues.
    You need to perform the following steps
    
    1. Extract core concepts from the user description
      - Identify and explicitly extract:
      - Feature / component names (e.g., Copilot, sound, chat pane, todo list, tool).
      - Accessibility terms (e.g., screen reader, keyboard navigation, focus, not accessible, ARIA).
      - Behavior / symptoms (e.g., cannot read, not accessible, invisible, focus not moving).
    
    You MUST prioritize the feature name the most.
    
    2. Generate **only** 2 to 3 concise, search-optimized GitHub queries. All queries MUST:
      - Include at least one feature/component term from the user description
      - Prefer exact strings + synonyms for core terms(e.g., to-do list, todo list, audio cue, sound, keyboard, focus).
      - Include multi-word quoted phrases if present in user text (e.g., "chat pane", "to-do list").
      - Use literal, short keyword combinations.
      - Avoid generic or irrelevant terms.

    3. Call the search_issues tool to run each query
      - Search ONLY in the microsoft/vscode repo.
      - Look for open issues
      - **All** searches should have label:accessibility
      - Prioritize more recently created or updated issues.

    3b. For each issue you decide to return in the final answer (top 1 to 3), call the issue_read tool to fetch comments.
      - Use method: get_comments
      - Use owner: microsoft
      - Use repo: vscode
      - Use issue_number from the issue you picked
      - Limit to a small number of comments (e.g. perPage: 10) to avoid long output.

    4. Filter the results:
      Keep Issues that meet ALL of the following criteria:
        - Title or body references the specific feature/component or variations of it.
        - Title or body references an accessibility problem or the user described behavior.
      (IMPORTANT)Discard issues that are:
          - Meta-issues
          - About unrelated components

    5. Return the top 1 to 3 most relevant issues, showing: 
      - Title
      - Issue Number
      - URL 
      - Date Created
      - State (open)
      - Milestone 
      - Explain what the status of the issue is and when it'll be fixed, if this is known.
      - Mention any workarounds in the comments, if available.
      - One or two sentence reason for relevance. 

    6. If no open issues are a match, search for closed issues that match the same criteria. Return the same details, along with the closure date, any workarounds mentioned in the comments, and the reason for closure (if available).

    7. If no relevant issues are found, return a message saying "No relevant GitHub issues found that match the description you have provided."

    RULES FOR QUERY OPTIMIZATION:
    1. Focus on the core technical elements: features, main symptom or behavior, key error messages, function/class/module names, APIs, file paths,libraries/frameworks, versions.
    2. The optimized query should be suitable for use in a GitHub issue search.
    3. Keep queries short. Avoid filler language, long phrases, or invented terms.
    4. Do not guess or invent issue numbers or details.
    6. Use at most 4 logical operators total (AND, OR, NOT combined) in the generated queryPre. If more terms exist, prioritize the most important ones
    7. Only retrun the top 1 to 3 most relevant issues.
  `;

  try {
    // Using the chat-extension-utils library to handle tool calling
    const libResult = chatUtils.sendChatParticipantRequest(
      request,
      chatContext,
      {
        prompt: instruction,
        responseStreamOptions: {
          stream,
          references: true,
          responseText: true,
        },
        tools: issueReadTool ? [issueSearchTool, issueReadTool] : [issueSearchTool],
      },
      token,
    );

    // Wait for completion
    await libResult.result;
  } catch (error) {
    stream.markdown(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function optimizeDescription(
  description: string,
): Promise<string> {
  // description optimization logic

  const systemMessage = [
    vscode.LanguageModelChatMessage.User(
      `Condense this description to use as a GitHub search query. Description: ${description}. 
        Follow these steps
        1. Extract core concepts present in the user description
          - Identify and explicitly extract:
          - Feature / component names (e.g., Copilot, Copilot agent, chat pane, todo list, tool, panel, web editor).
          - Accessibility terms (e.g., screen reader, keyboard navigation, focus, not accessible, ARIA, audio cues).
          - Behavior / symptoms (e.g., cannot read, not accessible, invisible, focus not moving).
    
        You MUST prioritize the feature name the most.
    
        2. Generate a concise, search-optimized GitHub query. The query must:
          - Include at least one feature/component term from the user description
          - Prefer exact strings + synonyms for core terms(e.g., to-do list, todo list, checklist, task list, keyboard, focus).
          - Use literal, short keyword combinations.
          - Avoid generic or irrelevant terms.
          - Don't add terms or concepts that are not in the original description.

        Example:
        - Input description: "When using the chat pane, I cannot access the to-do list items. The focus does not move correctly and ARIA labels seem to be missing."
        - Condensed query: chat pane to-do list screen reader focus ARIA
      `,
    ),
  ];

  const [model] = await vscode.lm.selectChatModels({ id: "gpt-4.1" });

  const response = await model.sendRequest(
    systemMessage,
    {},
    new vscode.CancellationTokenSource().token,
  );

  // extract the string from the response
  let result = "";
  for await (const chunk of response.text) {
    result += chunk;
  }

  return result.trim();
}
