---
title: DVT Monaco Theme Notes
status: Draft
owner: Product / UX / Frontend
last_reviewed: 2026-04-17
planning_type: proposal
---

# DVT Monaco Theme Notes

## Objective

Make Monaco feel like a native DVT workbench surface instead of an embedded
third-party widget.

## Recommendation

Define one stable product theme, for example:

- `dvt-workbench-dark`

## Minimum Tokens To Map

- `editor.background`
- `editor.foreground`
- `editorCursor.foreground`
- `editorLineNumber.foreground`
- `editorLineHighlightBackground`
- `editor.selectionBackground`
- `editor.inactiveSelectionBackground`
- `editorWhitespace.foreground`
- `editorIndentGuide.background1`
- `minimap.background`
- `minimap.selectionHighlight`
- `diffEditor.insertedTextBackground`
- `diffEditor.removedTextBackground`

## Typography Recommendation

- UI: Inter
- Code: JetBrains Mono

## Visual Rule

Monaco should share:

- background,
- contrast,
- border tone,
- and vertical rhythm with Canvas and the surrounding panels.
