export interface IAccessibilitySource {
  getResponse(query: string): Promise<string>;
}
