# List of Accessibility Audio Cues (accessibility.signals)

There are 35 audio signals in total.

## Editor Features

1. **accessibility.signals.lineHasBreakpoint**: Plays a signal - sound (audio cue) and/or announcement (alert) - when the active line has a breakpoint.
2. **accessibility.signals.lineHasError**: Plays a signal - sound (audio cue) and/or announcement (alert) - when the active line has an error.
3. **accessibility.signals.lineHasWarning**: Plays a signal - sound (audio cue) and/or announcement (alert) - when the active line has a warning.
4. **accessibility.signals.lineHasFoldedArea**: Plays a signal - sound (audio cue) and/or announcement (alert) - the active line has a folded area that can be unfolded.
5. **accessibility.signals.lineHasInlineSuggestion**: Plays a sound / audio cue when the active line has an inline suggestion.
6. **accessibility.signals.positionHasError**: Plays a signal - sound (audio cue) and/or announcement (alert) - when the active line has a warning.
7. **accessibility.signals.positionHasWarning**: Plays a signal - sound (audio cue) and/or announcement (alert) - when the active line has a warning.

## Editing Actions

8. **accessibility.signals.editsUndone**: Plays a signal - sound (audio cue) and/or announcement (alert) - when edits have been undone.
9. **accessibility.signals.editsKept**: Plays a signal - sound (audio cue) and/or announcement (alert) - when edits are kept.
10. **accessibility.signals.save**: Plays a signal - sound (audio cue) and/or announcement (alert) - when a file is saved.
11. **accessibility.signals.format**: Plays a signal - sound (audio cue) and/or announcement (alert) - when a file or notebook is formatted.
12. **accessibility.signals.nextEditSuggestion**: Plays a signal - sound / audio cue and/or announcement (alert) when there is a next edit suggestion.
13. **accessibility.signals.codeActionApplied**: Plays a sound / audio cue when the code action has been applied.
14. **accessibility.signals.codeActionTriggered**: Plays a sound / audio cue - when a code action has been triggered.
15. **accessibility.signals.clear**: Plays a signal - sound (audio cue) and/or announcement (alert) - when a feature is cleared (for example, the terminal, Debug Console, or Output channel).

## Diff Viewer

16. **accessibility.signals.diffLineInserted**: Plays a sound / audio cue when the focus moves to an inserted line in Accessible Diff Viewer mode or to the next/previous change.
17. **accessibility.signals.diffLineDeleted**: Plays a sound / audio cue when the focus moves to an deleted line in Accessible Diff Viewer mode or to the next/previous change.
18. **accessibility.signals.diffLineModified**: Plays a sound / audio cue when the focus moves to an modified line in Accessible Diff Viewer mode or to the next/previous change.

## Debugging

19. **accessibility.signals.onDebugBreak**: Plays a signal - sound (audio cue) and/or announcement (alert) - when the debugger stopped on a breakpoint.

## Terminal

20. **accessibility.signals.terminalBell**: Plays a signal - sound (audio cue) and/or announcement (alert) - when the terminal bell is ringing.
21. **accessibility.signals.terminalCommandFailed**: Plays a signal - sound (audio cue) and/or announcement (alert) - when a terminal command fails (non-zero exit code) or when a command with such an exit code is navigated to in the accessible view.
22. **accessibility.signals.terminalCommandSucceeded**: Plays a signal - sound (audio cue) and/or announcement (alert) - when a terminal command succeeds (zero exit code) or when a command with such an exit code is navigated to in the accessible view.
23. **accessibility.signals.terminalQuickFix**: Plays a signal - sound (audio cue) and/or announcement (alert) - when terminal Quick Fixes are available.

## Tasks

24. **accessibility.signals.taskCompleted**: Plays a signal - sound (audio cue) and/or announcement (alert) - when a task is completed.
25. **accessibility.signals.taskFailed**: Plays a signal - sound (audio cue) and/or announcement (alert) - when a task fails (non-zero exit code).

## Notebooks

26. **accessibility.signals.notebookCellCompleted**: Plays a signal - sound (audio cue) and/or announcement (alert) - when a notebook cell execution is successfully completed.
27. **accessibility.signals.notebookCellFailed**: Plays a signal - sound (audio cue) and/or announcement (alert) - when a notebook cell execution fails.
28. **accessibility.signals.noInlayHints**: Plays a signal - sound (audio cue) and/or announcement (alert) - when trying to read a line with inlay hints that has no inlay hints.

## Chat and Voice

29. **accessibility.signals.chatRequestSent**: Plays a signal - sound (audio cue) and/or announcement (alert) - when a chat request is made.
30. **accessibility.signals.chatResponseReceived**: Plays a sound / audio cue when the response has been received.
31. **accessibility.signals.chatUserActionRequired**: Plays a signal - sound (audio cue) and/or announcement (alert) - when user action is required in the chat.
32. **accessibility.signals.chatEditModifiedFile**: Plays a sound / audio cue when revealing a file with changes from chat edits.
33. **accessibility.signals.progress**: Plays a signal - sound (audio cue) and/or announcement (alert) - on loop while progress is occurring.
34. **accessibility.signals.voiceRecordingStarted**: Plays a sound / audio cue when the voice recording has started.
35. **accessibility.signals.voiceRecordingStopped**: Plays a sound / audio cue when the voice recording has stopped.

## Configuration Options

- **accessibility.signalOptions.volume**: Controls the volume of the sounds in percent (0-100).
- **accessibility.signalOptions.debouncePositionChanges**: Controls the debounce time in milliseconds for position changes that trigger accessibility signals.

Each signal can be configured with `sound` and/or `announcement` properties to control whether they play an audio cue or make an announcement via screen readers. Most signals support three states:

- `on`: Always enabled
- `off`: Always disabled
- `auto`: Enabled when a screen reader is detected
