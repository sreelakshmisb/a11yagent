export interface IAccessibilitySource {
  getContext(request: import('vscode').ChatRequest, context: import('vscode').ExtensionContext): Promise<string>;
  fetchContext(): Promise<string>;
}

