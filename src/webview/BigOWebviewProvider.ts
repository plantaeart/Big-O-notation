import * as vscode from "vscode";
import { MethodAnalysis } from "../types";
import {
  getComplexityIndicator,
  getSpaceComplexityIndicator,
} from "../utils/complexityHelperUtils";

export class BigOWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "bigONotation.analysisView";

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case "analyzeCode": {
          vscode.commands.executeCommand("bigONotation.analyzeComplexity");
          break;
        }
      }
    });
  }

  public updateAnalysis(methods: MethodAnalysis[]) {
    if (this._view) {
      this._view.webview.postMessage({
        type: "updateAnalysis",
        methods: methods,
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Big O Analysis</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                font-weight: var(--vscode-font-weight);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                padding: 20px;
                margin: 0;
            }
            
            .analysis-container {
                max-width: 100%;
            }
            
            .method-card {
                border: 1px solid var(--vscode-panel-border);
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 16px;
                background-color: var(--vscode-editor-background);
            }
            
            .method-name {
                font-weight: bold;
                font-size: 1.1em;
                margin-bottom: 8px;
                color: var(--vscode-symbolIcon-functionForeground);
            }
            
            .complexity-info {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .complexity-row {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .complexity-indicator {
                font-size: 1.2em;
                font-weight: bold;
            }
            
            .complexity-text {
                font-family: 'Courier New', monospace;
                font-weight: bold;
            }
            
            .complexity-description {
                color: var(--vscode-descriptionForeground);
                font-size: 0.9em;
                margin-top: 4px;
            }
            
            .confidence {
                color: var(--vscode-descriptionForeground);
                font-size: 0.8em;
                margin-left: auto;
            }
            
            .line-info {
                color: var(--vscode-descriptionForeground);
                font-size: 0.8em;
                margin-top: 8px;
            }
            
            .analyze-button {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 1em;
                margin-bottom: 20px;
                width: 100%;
            }
            
            .analyze-button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            
            .no-analysis {
                text-align: center;
                color: var(--vscode-descriptionForeground);
                font-style: italic;
                margin-top: 40px;
            }
            
            .space-structures {
                margin-top: 4px;
                font-size: 0.8em;
                color: var(--vscode-descriptionForeground);
            }
            
            .data-structure {
                display: inline-block;
                background-color: var(--vscode-badge-background);
                color: var(--vscode-badge-foreground);
                padding: 2px 6px;
                border-radius: 12px;
                margin-right: 4px;
                font-size: 0.7em;
            }
        </style>
    </head>
    <body>
        <div class="analysis-container">
            <button class="analyze-button" onclick="analyzeCode()">
                🔍 Analyze Current File
            </button>
            
            <div id="results">
                <div class="no-analysis">
                    Select a Python file and click "Analyze Current File" to see Big O complexity analysis
                </div>
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            
            function analyzeCode() {
                vscode.postMessage({
                    type: 'analyzeCode'
                });
            }

            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.type) {
                    case 'updateAnalysis':
                        updateAnalysisDisplay(message.methods);
                        break;
                }
            });

            function updateAnalysisDisplay(methods) {
                const resultsDiv = document.getElementById('results');
                
                if (!methods || methods.length === 0) {
                    resultsDiv.innerHTML = '<div class="no-analysis">No functions found in the current file</div>';
                    return;
                }

                let html = '';
                for (const method of methods) {
                    html += createMethodCard(method);
                }
                
                resultsDiv.innerHTML = html;
            }

            function createMethodCard(method) {
                const timeIndicator = getComplexityIndicator(method.complexity.notation);
                const spaceIndicator = getSpaceComplexityIndicator(method.spaceComplexity.notation);
                
                let dataStructuresHtml = '';
                if (method.spaceComplexity.dataStructures && method.spaceComplexity.dataStructures.length > 0) {
                    dataStructuresHtml = '<div class="space-structures">' +
                        method.spaceComplexity.dataStructures.map(ds => 
                            '<span class="data-structure">' + ds + '</span>'
                        ).join('') +
                        '</div>';
                }

                return \`
                    <div class="method-card">
                        <div class="method-name">\${method.name}()</div>
                        <div class="complexity-info">
                            <div class="complexity-row">
                                <span class="complexity-indicator">\${timeIndicator}</span>
                                <span class="complexity-text">Time: \${method.complexity.notation}</span>
                                <span class="confidence">(\${method.complexity.confidence}% confidence)</span>
                            </div>
                            <div class="complexity-description">\${method.complexity.description}</div>
                            
                            <div class="complexity-row">
                                <span class="complexity-indicator">\${spaceIndicator}</span>
                                <span class="complexity-text">Space: \${method.spaceComplexity.notation}</span>
                                <span class="confidence">(\${method.spaceComplexity.confidence}% confidence)</span>
                            </div>
                            <div class="complexity-description">\${method.spaceComplexity.description}</div>
                            \${dataStructuresHtml}
                        </div>
                        <div class="line-info">Lines \${method.lineStart + 1} - \${method.lineEnd + 1}</div>
                    </div>
                \`;
            }

            function getComplexityIndicator(complexity) {
                const indicatorMap = {
                    "O(1)": "EXCELLENT",
                    "O(log n)": "GOOD", 
                    "O(n)": "GOOD",
                    "O(n log n)": "FAIR",
                    "O(n²)": "POOR",
                    "O(n³)": "POOR",
                    "O(2^n)": "BAD",
                    "O(n!)": "TERRIBLE"
                };
                return indicatorMap[complexity] || "UNKNOWN";
            }

            function getSpaceComplexityIndicator(spaceComplexity) {
                const indicatorMap = {
                    "O(1)": "EXCELLENT",
                    "O(log n)": "GOOD",
                    "O(n)": "GOOD",
                    "O(n²)": "POOR",
                    "O(n³)": "POOR",
                    "O(2^n)": "BAD",
                    "O(n!)": "TERRIBLE"
                };
                return indicatorMap[spaceComplexity] || "UNKNOWN";
            }
        </script>
    </body>
    </html>`;
  }
}
