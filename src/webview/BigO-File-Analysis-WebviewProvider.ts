import * as vscode from "vscode";
import { MethodAnalysis } from "../models/MethodAnalysis.model";
import {
  navigateToFunction,
  getComplexityIndicator,
  getComplexityClass,
  improveFunctionRating,
  extractFunctionCode,
  COMPLEXITY_BADGE_STYLES,
  TREE_NODE_STYLES,
  COMMON_WEBVIEW_SCRIPTS,
} from "../utils/webViewUtils";

export class BigOWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "bigONotation.analysisView";

  private _view?: vscode.WebviewView;
  private _fileAnalyses: Map<
    string,
    {
      methods: MethodAnalysis[];
      fileName?: string;
      hierarchy?: Map<string, string[]>;
    }
  > = new Map();

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {
    // Load previous analysis from persistent state
    this._loadState();

    // Listen for active editor changes to update the view
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      this._onActiveEditorChanged(editor);
    });
  }

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
        case "navigateToFunction": {
          navigateToFunction(data.fileUri, data.functionName);
          break;
        }
        case "improveFunctionRating": {
          this._handleImproveFunctionRating(data);
          break;
        }
        case "webviewReady": {
          // Webview is ready, check if we should show cached data
          const activeEditor = vscode.window.activeTextEditor;
          const isValidPythonFile =
            activeEditor && activeEditor.document.fileName.endsWith(".py");

          console.log(
            "BigO: Webview ready, active file:",
            activeEditor?.document.fileName || "none"
          );

          if (isValidPythonFile) {
            const currentFileName =
              activeEditor.document.fileName.split("\\").pop() ||
              activeEditor.document.fileName.split("/").pop() ||
              "Unknown file";

            const fileAnalysis = this._fileAnalyses.get(
              activeEditor.document.fileName
            );

            if (fileAnalysis) {
              console.log("BigO: Sending cached analysis for current file");
              this._view?.webview.postMessage({
                type: "updateAnalysis",
                methods: fileAnalysis.methods,
                fileName: fileAnalysis.fileName,
                fileUri: activeEditor.document.uri.toString(),
                hierarchy: fileAnalysis.hierarchy
                  ? Array.from(fileAnalysis.hierarchy.entries())
                  : [],
              });
            } else {
              console.log("BigO: No cached analysis for current file");
              this._view?.webview.postMessage({
                type: "updateAnalysis",
                methods: [],
                fileName: currentFileName,
                fileUri: activeEditor.document.uri.toString(),
                hierarchy: [],
              });
            }
          } else {
            console.log("BigO: No valid Python file open, clearing view");
            this._view?.webview.postMessage({
              type: "updateAnalysis",
              methods: [],
              fileName: undefined,
              fileUri: undefined,
              hierarchy: [],
            });
          }
          break;
        }
      }
    });
  }

  public updateAnalysis(
    methods: MethodAnalysis[],
    fileName?: string,
    hierarchy?: Map<string, string[]>
  ) {
    // Get the current active editor to store analysis with file path
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor || !fileName) {
      return;
    }

    // Store the analysis for the specific file
    this._fileAnalyses.set(activeEditor.document.fileName, {
      methods,
      fileName,
      hierarchy,
    });

    // Persist the analysis to VS Code's global state
    this._saveState();

    if (this._view) {
      this._view.webview.postMessage({
        type: "updateAnalysis",
        methods: methods,
        fileName: fileName,
        fileUri: activeEditor.document.uri.toString(),
        hierarchy: hierarchy ? Array.from(hierarchy.entries()) : [],
      });
    }
  }

  private async _handleImproveFunctionRating(data: any) {
    try {
      // Extract function code from the file
      const functionCode = await extractFunctionCode(
        data.fileUri,
        data.functionName
      );

      // Find the method in our analysis to get current complexity and dependencies
      let currentComplexity = data.currentComplexity;
      let childDependencies: string[] = [];

      // Search through file analyses to find the method and its dependencies
      for (const fileAnalysis of this._fileAnalyses.values()) {
        const method = fileAnalysis.methods.find(
          (m) => m.name === data.functionName
        );
        if (method) {
          currentComplexity = method.complexity;

          // Get child dependencies from hierarchy
          if (fileAnalysis.hierarchy) {
            const dependencies = fileAnalysis.hierarchy.get(data.functionName);
            childDependencies = dependencies || [];
          }
          break;
        }
      }

      // Call the improve function rating utility
      await improveFunctionRating(
        data.fileUri,
        data.functionName,
        functionCode,
        currentComplexity,
        childDependencies
      );
    } catch (error) {
      console.error("Error handling improve function rating:", error);
      vscode.window.showErrorMessage(
        `Failed to improve function rating: ${error}`
      );
    }
  }

  private _loadState() {
    try {
      const savedState = this._context.globalState.get<
        Array<
          [
            string,
            {
              methods: MethodAnalysis[];
              fileName?: string;
              hierarchy?: [string, string[]][];
            }
          ]
        >
      >("bigOAnalysis.fileAnalyses");

      if (savedState) {
        console.log(
          "BigO: Loading saved state with",
          savedState.length,
          "files"
        );
        this._fileAnalyses = new Map(
          savedState.map(([filePath, analysis]) => {
            return [
              filePath,
              {
                methods: analysis.methods,
                fileName: analysis.fileName,
                hierarchy: analysis.hierarchy
                  ? new Map(analysis.hierarchy)
                  : undefined,
              },
            ];
          })
        );
      } else {
        console.log("BigO: No saved state found");
      }
    } catch (error) {
      console.error("Failed to load BigO analysis state:", error);
    }
  }

  private _saveState() {
    try {
      if (this._fileAnalyses.size > 0) {
        console.log(
          "BigO: Saving state with",
          this._fileAnalyses.size,
          "files"
        );
        const stateToSave = Array.from(this._fileAnalyses.entries()).map(
          ([filePath, analysis]) => {
            return [
              filePath,
              {
                methods: analysis.methods,
                fileName: analysis.fileName,
                hierarchy: analysis.hierarchy
                  ? Array.from(analysis.hierarchy.entries())
                  : undefined,
              },
            ];
          }
        );
        this._context.globalState.update(
          "bigOAnalysis.fileAnalyses",
          stateToSave
        );
      }
    } catch (error) {
      console.error("Failed to save BigO analysis state:", error);
    }
  }

  private _onActiveEditorChanged(editor: vscode.TextEditor | undefined) {
    if (!this._view) {
      return;
    }

    const isValidPythonFile =
      editor && editor.document.fileName.endsWith(".py");

    if (!isValidPythonFile) {
      // No valid Python file, clear the view
      this._view.webview.postMessage({
        type: "updateAnalysis",
        methods: [],
        fileName: undefined,
        fileUri: undefined,
        hierarchy: [],
      });
      return;
    }

    // Check if we have cached analysis for this file
    const fileAnalysis = this._fileAnalyses.get(editor.document.fileName);

    if (fileAnalysis) {
      // Show cached analysis for this file
      this._view.webview.postMessage({
        type: "updateAnalysis",
        methods: fileAnalysis.methods,
        fileName: fileAnalysis.fileName,
        fileUri: editor.document.uri.toString(),
        hierarchy: fileAnalysis.hierarchy
          ? Array.from(fileAnalysis.hierarchy.entries())
          : [],
      });
    } else {
      // No cached analysis, show empty state with current file name
      const currentFileName =
        editor.document.fileName.split("\\").pop() ||
        editor.document.fileName.split("/").pop() ||
        "Unknown file";
      this._view.webview.postMessage({
        type: "updateAnalysis",
        methods: [],
        fileName: currentFileName,
        fileUri: editor.document.uri.toString(),
        hierarchy: [],
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Big O - File Analysis</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                margin: 0;
                padding: 20px;
            }
            
            .header {
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid var(--vscode-panel-border);
            }
            
            .header h2 {
                margin: 0 0 10px 0;
                color: var(--vscode-textLink-foreground);
            }
            
            .file-header {
                font-size: 1.1em;
                font-weight: bold;
                margin-bottom: 15px;
                padding: 10px;
                background-color: var(--vscode-list-inactiveSelectionBackground);
                border-radius: 6px;
                border: 1px solid var(--vscode-panel-border);
                color: var(--vscode-textLink-foreground);
            }
            
            .analyze-button {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 15px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9em;
                margin-bottom: 15px;
                transition: background-color 0.2s;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .analyze-button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            
            ${TREE_NODE_STYLES}
            
            ${COMPLEXITY_BADGE_STYLES}
            
            .no-analysis {
                text-align: center;
                color: var(--vscode-descriptionForeground);
                font-style: italic;
                margin-top: 40px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h2>📊 Big O Analysis</h2>
        </div>
        
        <button class="analyze-button" onclick="analyzeCode()">
            🔍 Analyze Current File
        </button>
        
        <div id="fileHeader" style="display: none;"></div>
        <div id="results">
            <div class="no-analysis">
                Open a Python file to see Big O complexity analysis
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();

            // Signal that the webview is ready
            window.addEventListener('load', () => {
                vscode.postMessage({ type: 'webviewReady' });
            });

            function analyzeCode() {
                vscode.postMessage({ type: 'analyzeCode' });
            }

            ${COMMON_WEBVIEW_SCRIPTS}

            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.type) {
                    case 'updateAnalysis':
                        updateAnalysis(message.methods, message.fileName, message.fileUri, message.hierarchy);
                        break;
                }
            });

            function updateAnalysis(methods, fileName, fileUri, hierarchy) {
                const resultsDiv = document.getElementById('results');
                const fileHeaderDiv = document.getElementById('fileHeader');
                
                if (fileName) {
                    fileHeaderDiv.innerHTML = fileName;
                    fileHeaderDiv.style.display = 'block';
                    fileHeaderDiv.className = 'file-header';
                } else {
                    fileHeaderDiv.style.display = 'none';
                }

                if (!methods || methods.length === 0) {
                    resultsDiv.innerHTML = '<div class="no-analysis">No functions found in the current file</div>';
                    return;
                }

                // Build hierarchy tree
                const hierarchyMap = new Map(hierarchy || []);
                const hierarchyTree = buildHierarchyTree(methods, hierarchyMap);
                
                resultsDiv.innerHTML = '<div class="hierarchy-tree">' + 
                    renderHierarchyTree(hierarchyTree, fileUri) + 
                    '</div>';
            }

            function renderHierarchyTree(nodes, fileUri) {
                return nodes.map(node => renderTreeNode(node, fileUri)).join('');
            }

            function renderTreeNode(node, fileUri) {
                const indent = '　'.repeat(node.level * 2); // Use full-width space for indentation
                const connector = node.level > 0 ? '└─ ' : '';
                const method = node.method;
                
                let result = \`
                    <div class="tree-node level-\${node.level}">
                        <div class="method-header">
                            <span class="node-connector">\${indent}\${connector}</span>
                            <span class="method-name" onclick="navigateToFunction('\${escapeHtml(fileUri || '')}\', '\${escapeHtml(method.name)}')">\${escapeHtml(method.name)}</span>
                            <button class="improve-button" onclick="improveFunctionRating('\${escapeHtml(fileUri || '')}\', '\${escapeHtml(method.name)}\', '', { notation: '\${escapeHtml(method.complexity.notation)}', description: '\${escapeHtml(method.complexity.description)}', confidence: \${method.complexity.confidence} }, [])">
                                ✨ improve
                            </button>
                        </div>
                        <div class="method-complexity">
                            <span class="complexity-badge \${getComplexityClass(method.complexity.notation)}">
                                \${getComplexityIndicator(method.complexity.notation)}
                            </span>
                            Time: \${method.complexity.notation}
                            <span class="complexity-badge \${getComplexityClass(method.spaceComplexity.notation)}">
                                \${getComplexityIndicator(method.spaceComplexity.notation)}
                            </span>
                            Space: \${method.spaceComplexity.notation}
                        </div>
                    </div>
                \`;
                
                if (node.children && node.children.length > 0) {
                    result += node.children.map(child => renderTreeNode(child, fileUri)).join('');
                }
                
                return result;
            }

        </script>
    </body>
    </html>`;
  }
}
