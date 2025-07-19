import * as vscode from "vscode";
import { MethodAnalysis } from "../models/MethodAnalysis.model";

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
                hierarchy: [],
              });
            }
          } else {
            console.log("BigO: No valid Python file open, clearing view");
            this._view?.webview.postMessage({
              type: "updateAnalysis",
              methods: [],
              fileName: undefined,
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
        hierarchy: hierarchy ? Array.from(hierarchy.entries()) : [],
      });
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
        <title>Big O Analysis</title>
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
            
            .hierarchy-tree {
                font-family: 'Courier New', monospace;
                line-height: 1.5;
            }
            
            .tree-node {
                margin: 3px 0;
                padding: 6px 8px;
                border-radius: 4px;
                background-color: var(--vscode-list-inactiveSelectionBackground);
                border-left: 3px solid var(--vscode-panel-border);
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
            }
            
            .tree-node.level-0 { 
                border-left-color: var(--vscode-textLink-foreground);
                background-color: var(--vscode-list-activeSelectionBackground);
            }
            .tree-node.level-1 { border-left-color: #22C55E; }
            .tree-node.level-2 { border-left-color: #EAB308; }
            .tree-node.level-3 { border-left-color: #F97316; }
            .tree-node.level-4 { border-left-color: #EF4444; }
            
            .node-connector {
                color: var(--vscode-descriptionForeground);
                margin-right: 8px;
                white-space: pre;
            }
            
            .method-name {
                font-weight: bold;
                color: var(--vscode-symbolIcon-functionForeground);
                flex: 1;
                margin-right: 10px;
            }
            
            .method-complexity {
                display: flex;
                gap: 8px;
                align-items: center;
                font-size: 0.85em;
                flex-shrink: 0;
            }
            
            .complexity-badge {
                font-weight: bold;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 0.8em;
            }
            
            .complexity-badge.excellent { background-color: #22C55E; color: white; }
            .complexity-badge.good { background-color: #EAB308; color: white; }
            .complexity-badge.fair { background-color: #F97316; color: white; }
            .complexity-badge.poor { background-color: #EF4444; color: white; }
            .complexity-badge.bad { background-color: #DC2626; color: white; }
            .complexity-badge.terrible { background-color: #7F1D1D; color: white; }
            .complexity-badge.unknown { background-color: #6B7280; color: white; }
            
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

            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.type) {
                    case 'updateAnalysis':
                        updateAnalysis(message.methods, message.fileName, message.hierarchy);
                        break;
                }
            });

            function updateAnalysis(methods, fileName, hierarchy) {
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
                    renderHierarchyTree(hierarchyTree) + 
                    '</div>';
            }

            function buildHierarchyTree(methods, hierarchyMap) {
                const methodMap = new Map(methods.map(m => [m.name, m]));
                const childrenMap = new Map();
                const parentCount = new Map(); // Track how many parents each function has

                // Build children map and count parents for each function
                for (const [parent, children] of hierarchyMap) {
                    const validChildren = children.filter(child => methodMap.has(child));
                    if (validChildren.length > 0) {
                        childrenMap.set(parent, validChildren);
                        
                        // Count parents for each child
                        validChildren.forEach(child => {
                            parentCount.set(child, (parentCount.get(child) || 0) + 1);
                        });
                    }
                }

                // For functions with multiple parents, choose the most appropriate parent
                const finalChildrenMap = new Map();
                const assignedChildren = new Set();

                for (const [parent, children] of childrenMap) {
                    const uniqueChildren = children.filter(child => {
                        if (assignedChildren.has(child)) return false;
                        
                        // If function has only one parent, assign it
                        if (parentCount.get(child) === 1) {
                            assignedChildren.add(child);
                            return true;
                        }
                        
                        // For multiple parents, assign to the first encountered
                        const isFirstEncounter = !assignedChildren.has(child);
                        if (isFirstEncounter) {
                            assignedChildren.add(child);
                            return true;
                        }
                        
                        return false;
                    });

                    if (uniqueChildren.length > 0) {
                        finalChildrenMap.set(parent, uniqueChildren);
                    }
                }

                // Find root nodes (functions that are not children of other functions)
                const rootNodes = methods
                    .filter(method => !assignedChildren.has(method.name))
                    .map(method => createTreeNode(method, finalChildrenMap, methodMap, 0));

                return rootNodes;
            }

            function createTreeNode(method, childrenMap, methodMap, level) {
                const children = (childrenMap.get(method.name) || [])
                    .map(childName => {
                        const childMethod = methodMap.get(childName);
                        return childMethod ? createTreeNode(childMethod, childrenMap, methodMap, level + 1) : null;
                    })
                    .filter(node => node !== null);

                return {
                    method: method,
                    children: children,
                    level: level
                };
            }

            function renderHierarchyTree(nodes) {
                return nodes.map(node => renderTreeNode(node)).join('');
            }

            function renderTreeNode(node) {
                const indent = '　'.repeat(node.level * 2); // Use full-width space for indentation
                const connector = node.level > 0 ? '└─ ' : '';
                const method = node.method;
                
                let result = \`
                    <div class="tree-node level-\${node.level}">
                        <span class="node-connector">\${indent}\${connector}</span>
                        <span class="method-name">\${escapeHtml(method.name)}</span>
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
                    result += node.children.map(child => renderTreeNode(child)).join('');
                }
                
                return result;
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
                    "O(k^n)": "TERRIBLE",
                    "O(n!)": "TERRIBLE"
                };
                return indicatorMap[complexity] || "UNKNOWN";
            }

            function getComplexityClass(complexity) {
                const classMap = {
                    "O(1)": "excellent",
                    "O(log n)": "good",
                    "O(n)": "good",
                    "O(n log n)": "fair",
                    "O(n²)": "poor",
                    "O(n³)": "poor",
                    "O(2^n)": "bad",
                    "O(k^n)": "terrible",
                    "O(n!)": "terrible"
                };
                return classMap[complexity] || "unknown";
            }

            function escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }
        </script>
    </body>
    </html>`;
  }
}
