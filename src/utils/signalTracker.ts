import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Tail } from 'tail';
import { fileURLToPath } from 'url';

let telemetryTail: Tail | undefined;
const NONE = "_NONE";

function parseTelemetry(telemetryLine: string, logFilePath: string) {
  if (!telemetryLine.includes('telemetry/signal.played')) {
    return;
  }

  try {
    const logData = JSON.parse(telemetryLine.substring(telemetryLine.indexOf('{')));
    const signal = logData.properties?.signal;

    if (signal) {
      // Append the signal to the log file
      fs.appendFileSync(logFilePath, `${signal}\n`, 'utf8');
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
    console.error("Log Folder Path is not correctly set: error opening folder. \nPlease, update configuration and reload the extension");
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
  // Ensure the cache folder exists
  const cacheFolderPath = path.join(context.extensionPath, 'cache');
  if (!fs.existsSync(cacheFolderPath)) {
    fs.mkdirSync(cacheFolderPath, { recursive: true });
  }

  // File path for logging signals
  const logFilePath = path.join(cacheFolderPath, 'tracked_signals.log');

  // Clear the file if it already exists
  if (fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, '', 'utf8');
  }

  // Initialize the tracked signals log file with a header
  fs.writeFileSync(logFilePath, '# Sound cues played so far in this session\n', 'utf8');

  const vscodeLogsFolderPath = path.join(context.globalStorageUri.fsPath, '..', '..', '..', 'logs');

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

    telemetryTail.on('line', (telemetryLine) => parseTelemetry(telemetryLine, logFilePath));
    telemetryTail.on('error', (error: Error) => console.error('Telemetry tail error:', error));

    vscode.window.showInformationMessage('Started telemetry tracking.');
  } catch (error) {
    console.error('Failed to start telemetry tracking:', error);
  }
}

export function stopTelemetryTracking() {
  if (telemetryTail) {
    // First unwatch to stop file monitoring
    telemetryTail.unwatch();
  
    // Force cleanup by destroying the reference
    telemetryTail = undefined;
    vscode.window.showInformationMessage('Stopped telemetry tracking.');
  }
}

export function fetchTrackedSignals(): string {

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  const logFilePath = path.join(__dirname, '../../cache/tracked_signals.log');

  if (!fs.existsSync(logFilePath)) {
    return '';
  }

  return fs.readFileSync(logFilePath, 'utf8');
}