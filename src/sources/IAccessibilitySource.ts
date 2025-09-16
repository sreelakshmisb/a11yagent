export interface IAccessibilitySource {
  getContext(request: import('vscode').ChatRequest): Promise<string>;
}

