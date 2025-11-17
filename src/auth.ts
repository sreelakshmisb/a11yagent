import * as vscode from 'vscode';

export async function getGitHubBearer(): Promise<string> {
  const session = await vscode.authentication.getSession(
    'github',
    ['read:public_repo'],
    { createIfNone: true }
  );
  return session.accessToken;
}
