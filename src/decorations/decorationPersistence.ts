import * as vscode from "vscode";
import { applyComplexityDecorations } from "./decorationManager";

// Store applied decorations per file URI
const appliedDecorations = new Map<string, boolean>();

// Apply decorations to a Python file and mark it as decorated
export function applyAndPersistDecorations(editor: vscode.TextEditor): void {
  if (!editor.document.fileName.endsWith(".py")) {
    return;
  }

  // Apply decorations by scanning existing comments in the file
  applyDecorationsFromComments(editor);

  // Mark this file as having decorations applied
  appliedDecorations.set(editor.document.uri.toString(), true);
}

// Scan the file for existing Big-O comments and apply decorations
function applyDecorationsFromComments(editor: vscode.TextEditor): void {
  // This will scan the document for existing comments and apply decorations
  applyComplexityDecorations(editor);
}

// Check if a file has decorations applied
export function hasDecorationsApplied(uri: vscode.Uri): boolean {
  return appliedDecorations.has(uri.toString());
}

// Clear decoration tracking for a file (useful when file is closed)
export function clearDecorationTracking(uri: vscode.Uri): void {
  appliedDecorations.delete(uri.toString());
}

// Register event listeners for decoration persistence
export function registerDecorationPersistence(
  context: vscode.ExtensionContext
): void {
  // Apply decorations when switching to a Python file
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document.fileName.endsWith(".py")) {
        // Small delay to ensure the editor is fully loaded
        setTimeout(() => {
          applyAndPersistDecorations(editor);
        }, 100);
      }
    })
  );

  // Apply decorations when a Python file is opened
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (document.fileName.endsWith(".py")) {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document === document) {
          setTimeout(() => {
            applyAndPersistDecorations(editor);
          }, 100);
        }
      }
    })
  );

  // Reapply decorations when document content changes (to handle new comments)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.fileName.endsWith(".py")) {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document === event.document) {
          // Only reapply if the change involves comment lines
          const changeContainsComments = event.contentChanges.some(
            (change) =>
              change.text.includes("#") ||
              event.document.getText(change.range).includes("#")
          );

          if (changeContainsComments) {
            setTimeout(() => {
              applyAndPersistDecorations(editor);
            }, 200); // Slightly longer delay for text changes
          }
        }
      }
    })
  );

  // Clean up tracking when documents are closed
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      clearDecorationTracking(document.uri);
    })
  );

  // Apply decorations to currently active Python file on activation
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor && activeEditor.document.fileName.endsWith(".py")) {
    setTimeout(() => {
      applyAndPersistDecorations(activeEditor);
    }, 100);
  }
}
