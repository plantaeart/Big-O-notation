import * as vscode from "vscode";
import { analyzeCodeComplexity } from "./analysis/complexityAnalyzer";
import { BigOWebviewProvider } from "./webview/BigOWebviewProvider";
import {
  registerAnalyzeComplexityCommand,
  registerReapplyDecorationsCommand,
  registerShowStatusBarCommand,
  registerAutoRecomputeOnSave,
  registerToggleAutoRecomputeCommand,
} from "./commands/commandRegistry";
import { registerDecorationPersistence } from "./decorations/decorationPersistence";

export function activate(context: vscode.ExtensionContext) {
  console.log("Big-O Notation extension is now active!");

  // Create webview provider
  const provider = new BigOWebviewProvider(context.extensionUri);

  // Register webview provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      BigOWebviewProvider.viewType,
      provider
    )
  );

  context.subscriptions.push(
    registerAnalyzeComplexityCommand(provider),
    registerShowStatusBarCommand(),
    registerReapplyDecorationsCommand(),
    registerToggleAutoRecomputeCommand()
  );

  // Register decoration persistence to maintain colors when switching files
  registerDecorationPersistence(context);

  // Register auto-recompute on save functionality
  registerAutoRecomputeOnSave(context, provider);

  // Auto-analyze when Python file is opened
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document.fileName.endsWith(".py")) {
        const analysisResult = analyzeCodeComplexity(editor.document.getText());
        const methods = analysisResult.methods;
        const hierarchy = analysisResult.hierarchy;
        const fileName =
          editor.document.fileName.split("\\").pop() ||
          editor.document.fileName.split("/").pop() ||
          "Unknown file";
        provider.updateAnalysis(methods, fileName, hierarchy);
      }
    })
  );

  // Also analyze current file immediately if one is already open
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor && activeEditor.document.fileName.endsWith(".py")) {
    const analysisResult = analyzeCodeComplexity(
      activeEditor.document.getText()
    );
    const methods = analysisResult.methods;
    const hierarchy = analysisResult.hierarchy;
    const fileName =
      activeEditor.document.fileName.split("\\").pop() ||
      activeEditor.document.fileName.split("/").pop() ||
      "Unknown file";
    provider.updateAnalysis(methods, fileName, hierarchy);
  }
}

export function deactivate() {}
