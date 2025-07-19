import * as vscode from "vscode";
import { analyzeCodeComplexity } from "./analysis/complexityAnalyzer";
import { BigOWebviewProvider } from "./webview/BigOWebviewProvider";
import {
  registerAnalyzeComplexityCommand,
  registerShowStatusBarCommand,
} from "./commands/commandRegistry";

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
    registerShowStatusBarCommand()
  );

  // Auto-analyze when Python file is opened
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document.fileName.endsWith(".py")) {
        const methods = analyzeCodeComplexity(editor.document.getText());
        provider.updateAnalysis(methods);
      }
    })
  );
}

export function deactivate() {}
