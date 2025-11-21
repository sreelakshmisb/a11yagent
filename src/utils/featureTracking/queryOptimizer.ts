import * as vscode from "vscode";
import * as chatUtils from '@vscode/chat-extension-utils';


export async function checkQuery(request: vscode.ChatRequest, chatContext: vscode.ChatContext, stream: vscode.ChatResponseStream, token: vscode.CancellationToken,): Promise<void> {

    const issueSearchTool = vscode.lm.tools.find(tool => tool.name === 'mcp_github_github_search_issues');
    if (!issueSearchTool) {
      stream.markdown('Unable to use GitHub tools to complete the query. Please install and enable the GitHub MCP server first.');
      return;
    }

    const instruction = `
    You are an assistant that finds relevant GitHub issues. Your job is to take a user's accessibility-related problem description and return only the most relevant, verified issues.
    You need to perform the following steps
    
    1. Extract core concepts from the user description
      - Identify and explicitly extract:
      - Feature / component names (e.g., Copilot, Copilot agent, chat pane, todo list, tool, panel, web editor).
      - Accessibility terms (e.g., screen reader, keyboard navigation, focus, not accessible, ARIA, audio cues).
      - Behavior / symptoms (e.g., cannot read, not accessible, invisible, focus not moving).
    
    You MUST prioritize the feature name the most.
    
    2. Generate 2 to 3 concise, search-optimized GitHub queries. All queries MUST:
      - Include: label:accessibility
      - Include at least one feature/component term from the user description
      - Include at least one accessibility term
      - Prefer exact strings + synonyms for core terms(e.g., "to-do list", "todo list", checklist, task list; screen reader, keyboard, focus).
      - Include multi-word quoted phrases if present in user text (e.g., "chat pane", "to-do list").
      - Use literal, short keyword combinations.
      - Avoid generic or irrelevant terms.

    3. Call the search_issues tool to run each query
      - Search ONLY in the microsoft/vscode repo.
      - Prioritize open issues 
      - Prioritize more recently created or updated issues.
      - If there are no relevant open issues, look through closed issues. 
      - For closed issues, keep track of what the final resolution was.

    4. Filter the results:
      Keep Issues that meet ALL of the following criteria:
        - Title or body references the specific feature/component (e.g., chat, Copilot, todo list, terminal, editor) or variations of it.
        - Title or body references an accessibility problem or the user described behavior (screen reader, keyboard access, ARIA, focus, navigation).
      (IMPORTANT)Discard issues that are:
          - Meta-issues
          - Unrelated to the mentioned feature
          - About unrelated components

    5. Exclude tool runs from the results.

    6. Return the top 1 to 3 most relevant issues, showing: 
      - Title
      - Issue Number
      - URL 
      - Date Created
      - State (open or closed)
      - For closed issues, provide details of the final resolution or reason for closure.
      - One or two sentence reason for relevance. 

    7. If nothing is a strong match, reply: "No relevant issues found."

    RULES FOR QUERY OPTIMIZATION:
    1. Focus on the core technical elements: features, main symptom or behavior, key error messages, function/class/module names, APIs, file paths,libraries/frameworks, versions.
    2. The optimized query should be suitable for use in a GitHub issue search.
    3. Keep queries short. Avoid filler language, long phrases, or invented terms.
    4. Do not guess or invent issue numbers or details.
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
          responseText: true
        },
        tools: [issueSearchTool],
      },
      token
    );

    // Wait for completion
    const result = await libResult.result;

  } catch (error) {
    stream.markdown(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}