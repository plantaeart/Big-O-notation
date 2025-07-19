import * as vscode from "vscode";
import { analyzeCodeComplexity } from "./analysis/complexityAnalyzer";
import { BigOWebviewProvider } from "./webview/BigOWebviewProvider";
import { FileOverviewWebviewProvider } from "./webview/FileOverviewWebviewProvider";
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

  // Create webview providers
  const provider = new BigOWebviewProvider(context.extensionUri);
  const overviewProvider = new FileOverviewWebviewProvider(
    context.extensionUri
  );

  // Register webview providers
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      BigOWebviewProvider.viewType,
      provider
    ),
    vscode.window.registerWebviewViewProvider(
      FileOverviewWebviewProvider.viewType,
      overviewProvider
    )
  );

  context.subscriptions.push(
    registerAnalyzeComplexityCommand(provider, overviewProvider),
    registerShowStatusBarCommand(),
    registerReapplyDecorationsCommand(),
    registerToggleAutoRecomputeCommand()
  );

  // Register decoration persistence to maintain colors when switching files
  registerDecorationPersistence(context);

  // Register auto-recompute on save functionality
  registerAutoRecomputeOnSave(context, provider, overviewProvider);

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

        // Update both webviews
        provider.updateAnalysis(methods, fileName, hierarchy);
        overviewProvider.addFileAnalysis(
          fileName,
          editor.document.fileName,
          editor.document.uri.toString(),
          methods,
          hierarchy
        );
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

    // Update both webviews
    provider.updateAnalysis(methods, fileName, hierarchy);
    overviewProvider.addFileAnalysis(
      fileName,
      activeEditor.document.fileName,
      activeEditor.document.uri.toString(),
      methods,
      hierarchy
    );
  }
}

export function deactivate() {}
