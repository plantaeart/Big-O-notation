import * as vscode from "vscode";
import { BigOWebviewProvider } from "./webview/BigOWebviewProvider";
import {
  registerAnalyzeComplexityCommand,
  registerShowStatusBarCommand,
  registerAutoAnalyzeCommand,
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

  // Register commands
  const analyzeComplexityCommand = registerAnalyzeComplexityCommand(
    context,
    provider
  );
  const showStatusBarCommand = registerShowStatusBarCommand(context);
  const autoAnalyzeCommand = registerAutoAnalyzeCommand(context, provider);

  context.subscriptions.push(
    analyzeComplexityCommand,
    showStatusBarCommand,
    autoAnalyzeCommand
  );
}

export function deactivate() {}
