// Defines the format for tracked GitHub descriptions
export interface TrackedDescription {
  title: string;
  description: string;
  hasUpdates: boolean;
  html_url: string;
}

// Defines the format for tracked GitHub issues
export interface TrackedIssue {
  title: string;
  html_url: string;
  api_url: string;
  repository: string;
  state: string;
  milestone: string | null;
  hasUpdates: boolean;
}
