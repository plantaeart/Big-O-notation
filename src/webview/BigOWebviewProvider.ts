import * as vscode from "vscode";
import { MethodAnalysis } from "../models/MethodAnalysis.model";

export class BigOWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "bigONotation.analysisView";

  private _view?: vscode.WebviewView;
  private _lastAnalysis?: {
    methods: MethodAnalysis[];
    fileName?: string;
    hierarchy?: Map<string, string[]>;
  };

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

    // If we have a previous analysis, show it immediately
    if (this._lastAnalysis) {
      this.updateAnalysis(
        this._lastAnalysis.methods,
        this._lastAnalysis.fileName,
        this._lastAnalysis.hierarchy
      );
    }

    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case "analyzeCode": {
          vscode.commands.executeCommand("bigONotation.analyzeComplexity");
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
    // Store the analysis for when the webview is ready
    this._lastAnalysis = { methods, fileName, hierarchy };

    if (this._view) {
      this._view.webview.postMessage({
        type: "updateAnalysis",
        methods: methods,
        fileName: fileName,
        hierarchy: hierarchy ? Array.from(hierarchy.entries()) : [],
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
            
            .file-header {
                font-size: 1.1em;
                font-weight: bold;
                margin-bottom: 15px;
                padding-bottom: 8px;
                border-bottom: 1px solid var(--vscode-panel-border);
                color: var(--vscode-textLink-foreground);
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
                transition: background-color 0.2s;
            }
            
            .tree-node:hover {
                background-color: var(--vscode-list-hoverBackground);
            }
            
            .function-name {
                font-weight: bold;
                color: var(--vscode-symbolIcon-functionForeground);
                margin-bottom: 4px;
            }
            
            .complexity-text {
                font-size: 0.9em;
                margin-left: 8px;
                color: var(--vscode-descriptionForeground);
            }
            
            .complexity-indicator {
                font-weight: bold;
                margin-right: 6px;
            }
            
            .excellent { color: #22C55E; }
            .good { color: #EAB308; }
            .fair { color: #F97316; }
            .poor { color: #EF4444; }
            .bad { color: #DC2626; }
            .terrible { color: #7F1D1D; }
            .unknown { color: #6B7280; }
            
            .child-node {
                margin-left: 24px;
                position: relative;
            }
            
            .child-node:before {
                content: "├─ ";
                color: var(--vscode-tree-indentGuidesStroke);
                position: absolute;
                left: -24px;
                font-weight: normal;
            }
            
            .child-node:last-child:before {
                content: "└─ ";
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
                transition: background-color 0.2s;
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
        </style>
    </head>
    <body>
        <div class="analysis-container">
            <button class="analyze-button" onclick="analyzeCode()">
                🔍 Analyze Current File
            </button>
            
            <div id="fileHeader" style="display: none;"></div>
            <div id="results">
                <div class="no-analysis">
                    Open a Python file to see Big O complexity analysis
                </div>
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();

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
                    hierarchyTree.map(node => renderTreeNode(node, 0)).join('') + 
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
                // Priority: lexically nested functions stay with lexical parent, 
                // otherwise choose the parent with higher complexity
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
                        
                        // For multiple parents, assign to the one with higher complexity
                        // or first encountered for now (could be improved with more logic)
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

            function renderTreeNode(node, level) {
                const method = node.method;
                const timeIndicator = getComplexityIndicator(method.complexity.notation);
                const spaceIndicator = getComplexityIndicator(method.spaceComplexity.notation);
                const timeClass = getComplexityClass(timeIndicator);
                const spaceClass = getComplexityClass(spaceIndicator);
                
                let html = \`
                    <div class="tree-node \${level > 0 ? 'child-node' : ''}">
                        <div class="function-name">\${method.name}</div>
                        <div class="complexity-text">
                            <span class="complexity-indicator \${timeClass}">\${timeIndicator}</span>
                            Time: \${method.complexity.notation}
                        </div>
                        <div class="complexity-text">
                            <span class="complexity-indicator \${spaceClass}">\${spaceIndicator}</span>
                            Space: \${method.spaceComplexity.notation}
                        </div>
                    </div>
                \`;

                // Add children
                if (node.children && node.children.length > 0) {
                    html += node.children.map(child => renderTreeNode(child, level + 1)).join('');
                }

                return html;
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

            function getComplexityClass(indicator) {
                return indicator.toLowerCase();
            }
        </script>
    </body>
    </html>`;
  }
}
