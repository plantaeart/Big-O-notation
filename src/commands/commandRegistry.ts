import * as vscode from "vscode";
import { analyzeCodeComplexity } from "../analysis/complexityAnalyzer";
import { BigOWebviewProvider } from "../webview/BigOWebviewProvider";
import { getComplexityIndicator } from "../utils/complexityHelperUtils";
import { addBigOComments } from "../comments/commentManager";
import { applyComplexityDecorations } from "../decorations/decorationManager";
import { compareComplexityPriority } from "../utils/timeComplexityComparatorUtils";
import { applyAndPersistDecorations } from "../decorations/decorationPersistence";
import { MethodAnalysis } from "../models/MethodAnalysis.model";

// Shared function to analyze and update Big-O comments for a Python file
export async function analyzeAndUpdateFile(
  editor: vscode.TextEditor,
  provider: BigOWebviewProvider,
  showSuccessMessage: boolean = true
): Promise<void> {
  const document = editor.document;
  if (!document.fileName.endsWith(".py")) {
    return;
  }

  const fileContent = document.getText();
  const analysisResult = analyzeCodeComplexity(fileContent);
  const methods = analysisResult.methods;
  const hierarchy = analysisResult.hierarchy;

  // Get just the filename from the full path
  const fileName =
    document.fileName.split("\\").pop() ||
    document.fileName.split("/").pop() ||
    "Unknown file";

  // Update the webview with analysis results
  provider.updateAnalysis(methods, fileName, hierarchy);

  if (methods.length === 0) {
    if (showSuccessMessage) {
      vscode.window.showInformationMessage(
        "No Python functions found in the current file."
      );
    }
    return;
  }

  // Add comments to the code
  await addBigOComments(editor, methods);

  // Apply decorations to color the complexity indicators
  applyComplexityDecorations(editor);

  if (showSuccessMessage) {
    vscode.window.showInformationMessage(
      `✅ Updated Big-O comments for ${methods.length} function(s)! Comments replaced with latest analysis. Check the Big-O Analysis panel for detailed results.`
    );
  }
}

// Register the main command to analyze Python file and add Big-O comments
export function registerAnalyzeComplexityCommand(
  provider: BigOWebviewProvider
): vscode.Disposable {
  return vscode.commands.registerCommand(
    "bigONotation.analyzeComplexity",
    async () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showErrorMessage(
          "No active editor found. Please open a Python file."
        );
        return;
      }

      const document = activeEditor.document;
      if (!document.fileName.endsWith(".py")) {
        vscode.window.showErrorMessage(
          "Please open a Python file (.py) to analyze."
        );
        return;
      }

      await analyzeAndUpdateFile(activeEditor, provider, true);
    }
  );
}

// Register command to show analysis in status bar
export function registerShowStatusBarCommand(): vscode.Disposable {
  return vscode.commands.registerCommand("bigONotation.showInStatusBar", () => {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor || !activeEditor.document.fileName.endsWith(".py")) {
      return;
    }

    const fileContent = activeEditor.document.getText();
    const analysisResult = analyzeCodeComplexity(fileContent);
    const methods = analysisResult.methods;

    if (methods.length > 0) {
      const worstComplexity = methods.reduce(
        (worst: MethodAnalysis, method: MethodAnalysis) => {
          const currentComplexity = method.complexity.notation;
          return compareComplexityPriority(
            currentComplexity,
            worst.complexity.notation
          ) > 0
            ? method
            : worst;
        }
      );

      const indicator = getComplexityIndicator(
        worstComplexity.complexity.notation
      );
      vscode.window.showInformationMessage(
        `${indicator} Worst case complexity: ${worstComplexity.complexity.notation}`
      );
    }
  });
}

export function registerReapplyDecorationsCommand(): vscode.Disposable {
  return vscode.commands.registerCommand(
    "bigONotation.reapplyDecorations",
    () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showErrorMessage(
          "No active editor found. Please open a Python file."
        );
        return;
      }

      if (!activeEditor.document.fileName.endsWith(".py")) {
        vscode.window.showErrorMessage(
          "Please open a Python file (.py) to apply decorations."
        );
        return;
      }

      applyAndPersistDecorations(activeEditor);
      vscode.window.showInformationMessage(
        "✨ Big-O complexity decorations reapplied!"
      );
    }
  );
}

// Register auto-recompute on save functionality
export function registerAutoRecomputeOnSave(
  context: vscode.ExtensionContext,
  provider: BigOWebviewProvider
): void {
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      // Check if auto-recompute is enabled
      const config = vscode.workspace.getConfiguration("bigONotation");
      const autoRecompute = config.get<boolean>("autoRecomputeOnSave", true);

      if (!autoRecompute) {
        return;
      }

      // Only process Python files
      if (!document.fileName.endsWith(".py")) {
        return;
      }

      // Get the editor for this document
      const editor = vscode.window.visibleTextEditors.find(
        (e) => e.document === document
      );

      if (!editor) {
        return;
      }

      console.log(
        `Recomputing Big-O complexity for saved file: ${document.fileName}`
      );

      // Reanalyze and update the file silently (no success message)
      await analyzeAndUpdateFile(editor, provider, false);

      // Show a subtle notification
      vscode.window.setStatusBarMessage(
        "🔄 Big-O complexity updated",
        2000 // Show for 2 seconds
      );
    })
  );
}

// Register command to toggle auto-recompute on save
export function registerToggleAutoRecomputeCommand(): vscode.Disposable {
  return vscode.commands.registerCommand(
    "bigONotation.toggleAutoRecompute",
    async () => {
      const config = vscode.workspace.getConfiguration("bigONotation");
      const currentValue = config.get<boolean>("autoRecomputeOnSave", true);
      const newValue = !currentValue;

      await config.update(
        "autoRecomputeOnSave",
        newValue,
        vscode.ConfigurationTarget.Global
      );

      const status = newValue ? "enabled" : "disabled";
      vscode.window.showInformationMessage(
        `🔄 Auto-recompute on save ${status}`
      );
    }
  );
}
