import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Tail } from 'tail';

let telemetryTail: Tail | undefined;
const NONE = "_NONE";

// File path for logging signals
const logFilePath = path.join('/Users/sreelakshmisb/Desktop/accessibilityAgent/myVSExtension/a11yagent', 'tracked_signals.log');

function parseTelemetry(telemetryLine: string) {
  if (!telemetryLine.includes('telemetry/signal.played')) {
    return;
  }

  try {
    const logData = JSON.parse(telemetryLine.substring(telemetryLine.indexOf('{')));
    const signal = logData.properties?.signal;

    if (signal) {
      // Append the signal to the log file
      fs.appendFileSync(logFilePath, `Signal played: ${signal}\n`, 'utf8');
    }
  } catch (error) {
    console.error('Error parsing telemetry line:', error);
  }
}

function findMostRecentLogFolder(vscodeLogsFolderPath: string): string {
  let files: fs.Dirent[];
  try {
    files = fs.readdirSync(vscodeLogsFolderPath, { withFileTypes: true });
  } catch (e) {
    console.error("Error opening log folder: " + e);
    vscode.window.showErrorMessage("Log Folder Path is not correctly set: error opening folder. \nPlease, update configuration and reload the extension");
    return NONE;
  }

  let mostRecentLogFolder = NONE;
  let fileStat;
  let latestCreationTime = -1;
  files.forEach((file) => {
    if (file.isDirectory()) {
      fileStat = fs.statSync(path.join(vscodeLogsFolderPath, file.name));
      if (fileStat.ctimeMs > latestCreationTime) {
        mostRecentLogFolder = file.name;
        latestCreationTime = fileStat.ctimeMs;
      }
    }
  });

  return mostRecentLogFolder;
}

export function startTelemetryTracking(context: vscode.ExtensionContext) {
  const vscodeLogsFolderPath = '/Users/sreelakshmisb/Library/Application Support/Code/logs';

  const mostRecentLogFolder = findMostRecentLogFolder(vscodeLogsFolderPath);

  if (mostRecentLogFolder === NONE) {
    vscode.window.showErrorMessage("Log Folder Path is not correctly set: no folders present inside. \nPlease, update configuration and reload the extension");
    return;
  }

  const telemetryLogPath = path.join(vscodeLogsFolderPath, mostRecentLogFolder, 'telemetry.log');

  let options;
  try {
    options = {
      separator: /\r?\n/,
      fromBeginning: false,
      follow: true,
      useWatchFile: true,
    };

    telemetryTail = new Tail(telemetryLogPath, options);

    telemetryTail.on('line', parseTelemetry);
    telemetryTail.on('error', (error: Error) => console.error('Telemetry tail error:', error));

    vscode.window.showInformationMessage('Started telemetry tracking.');
  } catch (error) {
    console.error('Failed to start telemetry tracking:', error);
  }
}

export function stopTelemetryTracking() {
  telemetryTail?.unwatch();
  telemetryTail = undefined;
  vscode.window.showInformationMessage('Stopped telemetry tracking.');
}