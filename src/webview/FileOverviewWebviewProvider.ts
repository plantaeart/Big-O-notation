import * as vscode from "vscode";
import { MethodAnalysis } from "../models/MethodAnalysis.model";
import { analyzeCodeComplexity } from "../analysis/complexityAnalyzer";

interface FileAnalysis {
  fileName: string;
  filePath: string;
  fileUri: string; // Store the original URI for navigation
  methods: MethodAnalysis[];
  worstTimeComplexity: string;
  worstSpaceComplexity: string;
  hierarchy?: Map<string, string[]>;
}

interface OverviewStats {
  totalMethods: number;
  excellentMethods: number;
  goodMethods: number;
  fairMethods: number;
  poorMethods: number;
  badMethods: number;
  terribleMethods: number;
}

export class FileOverviewWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "bigONotation.fileOverviewView";

  private _view?: vscode.WebviewView;
  private _fileAnalyses: Map<string, FileAnalysis> = new Map();
  private _isScanning: boolean = false;

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

    // Start scanning all Python files when the webview loads
    this._scanAllPythonFiles();

    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case "sortFiles": {
          this._refreshView(data.sortBy);
          break;
        }
        case "scanAllFiles": {
          this._scanAllPythonFiles();
          break;
        }
        case "navigateToFile": {
          this._navigateToFile(data.fileUri);
          break;
        }
        case "navigateToFunction": {
          this._navigateToFunction(data.fileUri, data.functionName);
          break;
        }
      }
    });
  }

  private async _navigateToFile(fileUri: string) {
    try {
      console.log("Navigating to file URI:", fileUri);

      // Parse the URI and open the file
      const uri = vscode.Uri.parse(fileUri);
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);
    } catch (error) {
      console.error(`Error opening file ${fileUri}:`, error);
      vscode.window.showErrorMessage(`Failed to open file: ${error}`);
    }
  }

  private async _navigateToFunction(fileUri: string, functionName: string) {
    try {
      console.log(
        "Navigating to function:",
        functionName,
        "in file URI:",
        fileUri
      );

      const uri = vscode.Uri.parse(fileUri);
      const document = await vscode.workspace.openTextDocument(uri);

      // Search for the function definition in the document
      const text = document.getText();
      const lines = text.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Look for function definition patterns
        if (
          line.includes(`def ${functionName}(`) ||
          line.includes(`def ${functionName} (`)
        ) {
          // Open and jump to specific line (using 0-based line number for Range)
          const range = new vscode.Range(i, 0, i, 0);
          await vscode.window.showTextDocument(document, {
            selection: range,
          });
          return;
        }
      }

      // If function not found, just open the file
      await vscode.window.showTextDocument(document);
    } catch (error) {
      console.error(
        `Error navigating to function ${functionName} in ${fileUri}:`,
        error
      );
      vscode.window.showErrorMessage(`Failed to open file: ${error}`);
    }
  }

  public async _scanAllPythonFiles() {
    if (this._isScanning) {
      return;
    }

    this._isScanning = true;

    // Update UI to show scanning state
    if (this._view) {
      this._view.webview.postMessage({
        type: "scanningStarted",
      });
    }

    try {
      // Find all Python files in the workspace
      const pythonFiles = await vscode.workspace.findFiles(
        "**/*.py",
        "**/node_modules/**"
      );

      let processedFiles = 0;

      for (const file of pythonFiles) {
        try {
          const document = await vscode.workspace.openTextDocument(file);
          const fileName =
            file.path.split("/").pop() ||
            file.path.split("\\").pop() ||
            "Unknown";

          // Analyze the file
          const analysisResult = analyzeCodeComplexity(document.getText());

          if (analysisResult.methods.length > 0) {
            // Store both the display path and the original URI
            const displayPath = file.fsPath.replace(/[\x00-\x1F\x7F]/g, "");
            const fileUri = file.toString();
            console.log(
              "Adding file analysis for:",
              displayPath,
              "URI:",
              fileUri
            );
            this.addFileAnalysis(
              fileName,
              displayPath,
              fileUri,
              analysisResult.methods,
              analysisResult.hierarchy
            );
          }

          processedFiles++;

          // Update progress
          if (this._view) {
            this._view.webview.postMessage({
              type: "scanningProgress",
              processed: processedFiles,
              total: pythonFiles.length,
            });
          }
        } catch (error) {
          console.error(`Error analyzing file ${file.fsPath}:`, error);
        }
      }

      vscode.window.showInformationMessage(
        `📊 Scanned ${pythonFiles.length} Python files, analyzed ${this._fileAnalyses.size} files with functions.`
      );
    } catch (error) {
      console.error("Error scanning Python files:", error);
      vscode.window.showErrorMessage("Failed to scan Python files.");
    } finally {
      this._isScanning = false;

      // Update UI to show scanning completed
      if (this._view) {
        this._view.webview.postMessage({
          type: "scanningCompleted",
        });
      }
    }
  }

  public addFileAnalysis(
    fileName: string,
    filePath: string,
    fileUri: string,
    methods: MethodAnalysis[],
    hierarchy?: Map<string, string[]>
  ) {
    if (methods.length === 0) {
      return;
    }

    // Find worst complexities
    const worstTime = this._findWorstComplexity(methods, "time");
    const worstSpace = this._findWorstComplexity(methods, "space");

    this._fileAnalyses.set(filePath, {
      fileName,
      filePath,
      fileUri,
      methods,
      worstTimeComplexity: worstTime,
      worstSpaceComplexity: worstSpace,
      hierarchy,
    });

    this._refreshView();
  }

  private _findWorstComplexity(
    methods: MethodAnalysis[],
    type: "time" | "space"
  ): string {
    const complexityPriority: { [key: string]: number } = {
      "O(1)": 1,
      "O(log n)": 2,
      "O(n)": 3,
      "O(n log n)": 4,
      "O(n²)": 5,
      "O(n³)": 6,
      "O(2^n)": 7,
      "O(k^n)": 8,
      "O(n!)": 9,
    };

    let worstComplexity = "O(1)";
    let worstPriority = 0;

    for (const method of methods) {
      const complexity =
        type === "time"
          ? method.complexity.notation
          : method.spaceComplexity.notation;

      const priority = complexityPriority[complexity] || 0;
      if (priority > worstPriority) {
        worstPriority = priority;
        worstComplexity = complexity;
      }
    }

    return worstComplexity;
  }

  private _calculateStats(): OverviewStats {
    const stats: OverviewStats = {
      totalMethods: 0,
      excellentMethods: 0,
      goodMethods: 0,
      fairMethods: 0,
      poorMethods: 0,
      badMethods: 0,
      terribleMethods: 0,
    };

    for (const fileAnalysis of this._fileAnalyses.values()) {
      stats.totalMethods += fileAnalysis.methods.length;

      for (const method of fileAnalysis.methods) {
        const indicator = this._getComplexityIndicator(
          method.complexity.notation
        );
        switch (indicator) {
          case "EXCELLENT":
            stats.excellentMethods++;
            break;
          case "GOOD":
            stats.goodMethods++;
            break;
          case "FAIR":
            stats.fairMethods++;
            break;
          case "POOR":
            stats.poorMethods++;
            break;
          case "BAD":
            stats.badMethods++;
            break;
          case "TERRIBLE":
            stats.terribleMethods++;
            break;
        }
      }
    }

    return stats;
  }

  private _getComplexityIndicator(complexity: string): string {
    const indicatorMap: { [key: string]: string } = {
      "O(1)": "EXCELLENT",
      "O(log n)": "GOOD",
      "O(n)": "GOOD",
      "O(n log n)": "FAIR",
      "O(n²)": "POOR",
      "O(n³)": "POOR",
      "O(2^n)": "BAD",
      "O(k^n)": "TERRIBLE",
      "O(n!)": "TERRIBLE",
    };
    return indicatorMap[complexity] || "UNKNOWN";
  }

  private _sortFiles(files: FileAnalysis[], sortBy: string): FileAnalysis[] {
    const complexityPriority: { [key: string]: number } = {
      "O(1)": 1,
      "O(log n)": 2,
      "O(n)": 3,
      "O(n log n)": 4,
      "O(n²)": 5,
      "O(n³)": 6,
      "O(2^n)": 7,
      "O(k^n)": 8,
      "O(n!)": 9,
    };

    switch (sortBy) {
      case "alphabetic":
        return files.sort((a, b) => a.fileName.localeCompare(b.fileName));

      case "worstToBest":
        return files.sort((a, b) => {
          const aPriority = complexityPriority[a.worstTimeComplexity] || 0;
          const bPriority = complexityPriority[b.worstTimeComplexity] || 0;
          return bPriority - aPriority; // Descending (worst first)
        });

      case "bestToWorst":
        return files.sort((a, b) => {
          const aPriority = complexityPriority[a.worstTimeComplexity] || 0;
          const bPriority = complexityPriority[b.worstTimeComplexity] || 0;
          return aPriority - bPriority; // Ascending (best first)
        });

      default:
        return files;
    }
  }

  private _refreshView(sortBy: string = "alphabetic") {
    if (!this._view) {
      return;
    }

    const files = Array.from(this._fileAnalyses.values());
    const sortedFiles = this._sortFiles(files, sortBy);
    const stats = this._calculateStats();

    // Convert hierarchy maps to arrays for serialization
    const filesWithHierarchy = sortedFiles.map((file) => ({
      ...file,
      hierarchy: file.hierarchy ? Array.from(file.hierarchy.entries()) : [],
    }));

    this._view.webview.postMessage({
      type: "updateOverview",
      files: filesWithHierarchy,
      stats: stats,
      sortBy: sortBy,
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Files Overview</title>
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
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .stat-box {
                background-color: var(--vscode-list-inactiveSelectionBackground);
                padding: 10px;
                border-radius: 6px;
                text-align: center;
                border: 1px solid var(--vscode-panel-border);
            }
            
            .stat-number {
                font-size: 1.4em;
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .stat-label {
                font-size: 0.85em;
                color: var(--vscode-descriptionForeground);
            }
            
            .excellent .stat-number { color: #22C55E; }
            .good .stat-number { color: #EAB308; }
            .fair .stat-number { color: #F97316; }
            .poor .stat-number { color: #EF4444; }
            .bad .stat-number { color: #DC2626; }
            .terrible .stat-number { color: #7F1D1D; }
            
            .controls {
                margin-bottom: 20px;
            }
            
            .sort-buttons {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .sort-btn {
                background-color: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
                border: 1px solid var(--vscode-panel-border);
                padding: 8px 15px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9em;
                transition: all 0.2s;
            }
            
            .sort-btn:hover {
                background-color: var(--vscode-button-secondaryHoverBackground);
            }
            
            .sort-btn.active {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
            }
            
            .file-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .file-item {
                background-color: var(--vscode-list-inactiveSelectionBackground);
                border-radius: 6px;
                border: 1px solid var(--vscode-panel-border);
                transition: background-color 0.2s;
                margin-bottom: 8px;
            }
            
            .file-header {
                padding: 15px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                transition: background-color 0.2s;
            }
            
            .file-header:hover {
                background-color: var(--vscode-list-hoverBackground);
            }
            
            .file-info {
                flex: 1;
            }
            
            .expand-icon {
                margin-left: 10px;
                transition: transform 0.2s;
                color: var(--vscode-descriptionForeground);
                cursor: pointer;
                padding: 5px;
                border-radius: 3px;
            }
            
            .expand-icon:hover {
                background-color: var(--vscode-list-activeSelectionBackground);
            }
            
            .expand-icon.expanded {
                transform: rotate(90deg);
            }
            
            .methods-container {
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.3s ease-out;
                border-top: 1px solid var(--vscode-panel-border);
            }
            
            .methods-container.expanded {
                max-height: 2000px; /* Large enough to show all methods */
            }
            
            .methods-list {
                padding: 10px 15px;
                background-color: var(--vscode-editor-background);
            }
            
            .method-item {
                padding: 8px 12px;
                margin: 4px 0;
                background-color: var(--vscode-list-inactiveSelectionBackground);
                border-radius: 4px;
                border-left: 3px solid var(--vscode-panel-border);
            }
            
            .method-name {
                font-weight: bold;
                margin-bottom: 4px;
                color: var(--vscode-symbolIcon-functionForeground);
            }
            
            .method-complexity {
                font-size: 0.85em;
                display: flex;
                gap: 15px;
            }
            
            .scan-button {
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
            
            .scan-button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            
            .scan-button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            .scan-progress {
                background-color: var(--vscode-list-inactiveSelectionBackground);
                padding: 10px 15px;
                border-radius: 4px;
                margin-bottom: 15px;
                border: 1px solid var(--vscode-panel-border);
            }
            
            .progress-bar {
                width: 100%;
                height: 6px;
                background-color: var(--vscode-panel-border);
                border-radius: 3px;
                margin-top: 8px;
                overflow: hidden;
            }
            
            .progress-fill {
                height: 100%;
                background-color: var(--vscode-progressBar-background);
                transition: width 0.3s ease;
                border-radius: 3px;
            }
            
            .file-name {
                font-weight: bold;
                font-size: 1.1em;
                margin-bottom: 8px;
                color: var(--vscode-textLink-foreground);
                cursor: pointer;
                transition: color 0.2s;
                display: inline-block;
                max-width: fit-content;
            }
            
            .file-name:hover {
                color: var(--vscode-textLink-activeForeground);
                text-decoration: underline;
            }
            
            .file-stats {
                display: flex;
                flex-direction: column;
                gap: 4px;
                font-size: 0.9em;
            }
            
            .file-stat {
                display: flex;
                align-items: center;
                gap: 5px;
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
                cursor: pointer;
                transition: color 0.2s;
            }
            
            .method-name:hover {
                color: var(--vscode-textLink-activeForeground);
                text-decoration: underline;
            }
            
            .method-complexity {
                display: flex;
                gap: 8px;
                align-items: center;
                font-size: 0.85em;
                flex-shrink: 0;
            }
            
            .no-files {
                text-align: center;
                color: var(--vscode-descriptionForeground);
                font-style: italic;
                margin-top: 40px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h2>📊 Python Files Overview</h2>
        </div>
        
        <button class="scan-button" id="scanButton" onclick="scanAllFiles()">
            🔍 Scan All Python Files
        </button>
        
        <div id="scanProgress" class="scan-progress" style="display: none;">
            <div>Scanning Python files...</div>
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill" style="width: 0%;"></div>
            </div>
            <div id="progressText">0 / 0 files processed</div>
        </div>
        
        <div id="statsContainer"></div>
        <div id="controlsContainer"></div>
        <div id="filesContainer">
            <div class="no-files">
                Click "Scan All Python Files" to analyze all Python files in your workspace.
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            let currentSortBy = 'alphabetic';

            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.type) {
                    case 'updateOverview':
                        updateOverview(message.files, message.stats, message.sortBy);
                        break;
                    case 'scanningStarted':
                        showScanningState();
                        break;
                    case 'scanningProgress':
                        updateScanningProgress(message.processed, message.total);
                        break;
                    case 'scanningCompleted':
                        hideScanningState();
                        break;
                }
            });

            function scanAllFiles() {
                vscode.postMessage({ type: 'scanAllFiles' });
            }

            function showScanningState() {
                document.getElementById('scanButton').disabled = true;
                document.getElementById('scanProgress').style.display = 'block';
            }

            function updateScanningProgress(processed, total) {
                const progressFill = document.getElementById('progressFill');
                const progressText = document.getElementById('progressText');
                
                const percentage = total > 0 ? (processed / total) * 100 : 0;
                progressFill.style.width = percentage + '%';
                progressText.textContent = \`\${processed} / \${total} files processed\`;
            }

            function hideScanningState() {
                document.getElementById('scanButton').disabled = false;
                document.getElementById('scanProgress').style.display = 'none';
            }

            function toggleFileExpansion(filePath) {
                const methodsContainer = document.getElementById(\`methods-\${filePath}\`);
                const expandIcon = document.getElementById(\`icon-\${filePath}\`);
                
                if (methodsContainer.classList.contains('expanded')) {
                    methodsContainer.classList.remove('expanded');
                    expandIcon.classList.remove('expanded');
                } else {
                    methodsContainer.classList.add('expanded');
                    expandIcon.classList.add('expanded');
                }
            }

            function updateOverview(files, stats, sortBy) {
                currentSortBy = sortBy;
                updateStats(stats);
                updateControls();
                updateFiles(files);
            }

            function updateStats(stats) {
                const statsContainer = document.getElementById('statsContainer');
                
                if (stats.totalMethods === 0) {
                    statsContainer.innerHTML = '';
                    return;
                }

                statsContainer.innerHTML = \`
                    <div class="stats-grid">
                        <div class="stat-box">
                            <div class="stat-number">\${stats.totalMethods}</div>
                            <div class="stat-label">Total Methods</div>
                        </div>
                        <div class="stat-box excellent">
                            <div class="stat-number">\${stats.excellentMethods}</div>
                            <div class="stat-label">Excellent</div>
                        </div>
                        <div class="stat-box good">
                            <div class="stat-number">\${stats.goodMethods}</div>
                            <div class="stat-label">Good</div>
                        </div>
                        <div class="stat-box fair">
                            <div class="stat-number">\${stats.fairMethods}</div>
                            <div class="stat-label">Fair</div>
                        </div>
                        <div class="stat-box poor">
                            <div class="stat-number">\${stats.poorMethods}</div>
                            <div class="stat-label">Poor</div>
                        </div>
                        <div class="stat-box bad">
                            <div class="stat-number">\${stats.badMethods}</div>
                            <div class="stat-label">Bad</div>
                        </div>
                        <div class="stat-box terrible">
                            <div class="stat-number">\${stats.terribleMethods}</div>
                            <div class="stat-label">Terrible</div>
                        </div>
                    </div>
                \`;
            }

            function updateControls() {
                const controlsContainer = document.getElementById('controlsContainer');
                controlsContainer.innerHTML = \`
                    <div class="controls">
                        <div class="sort-buttons">
                            <button class="sort-btn \${currentSortBy === 'alphabetic' ? 'active' : ''}" onclick="sortFiles('alphabetic')">
                                📝 Alphabetic
                            </button>
                            <button class="sort-btn \${currentSortBy === 'worstToBest' ? 'active' : ''}" onclick="sortFiles('worstToBest')">
                                ⬇️ Worst to Best
                            </button>
                            <button class="sort-btn \${currentSortBy === 'bestToWorst' ? 'active' : ''}" onclick="sortFiles('bestToWorst')">
                                ⬆️ Best to Worst
                            </button>
                        </div>
                    </div>
                \`;
            }

            function updateFiles(files) {
                const filesContainer = document.getElementById('filesContainer');
                
                if (!files || files.length === 0) {
                    filesContainer.innerHTML = \`
                        <div class="no-files">
                            Click "Scan All Python Files" to analyze all Python files in your workspace.
                        </div>
                    \`;
                    return;
                }

                filesContainer.innerHTML = \`
                    <div class="file-list">
                        \${files.map(file => {
                            const fileId = btoa(encodeURIComponent(file.filePath)).replace(/[^a-zA-Z0-9]/g, ''); // Create safe ID
                            const hierarchyMap = new Map(file.hierarchy || []);
                            // Add file URI to each method for navigation
                            const methodsWithFileUri = file.methods.map(method => ({
                                ...method,
                                fileUri: file.fileUri
                            }));
                            const hierarchyTree = buildHierarchyTree(methodsWithFileUri, hierarchyMap);
                            
                            return \`
                                <div class="file-item">
                                    <div class="file-header">
                                        <div class="file-info">
                                            <div class="file-name" onclick="navigateToFile('\${escapeHtml(file.fileUri)}')">\${escapeHtml(file.fileName)}</div>
                                            <div class="file-stats">
                                                <div class="file-stat">
                                                    <span>📊 \${file.methods.length} methods</span>
                                                </div>
                                                <div class="file-stat">
                                                    <span>⏱️ Worst Time:</span>
                                                    <span class="complexity-badge \${getComplexityClass(file.worstTimeComplexity)}">
                                                        \${getComplexityIndicator(file.worstTimeComplexity)}
                                                    </span>
                                                    <span>\${file.worstTimeComplexity}</span>
                                                </div>
                                                <div class="file-stat">
                                                    <span>💾 Worst Space:</span>
                                                    <span class="complexity-badge \${getComplexityClass(file.worstSpaceComplexity)}">
                                                        \${getComplexityIndicator(file.worstSpaceComplexity)}
                                                    </span>
                                                    <span>\${file.worstSpaceComplexity}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="expand-icon" id="icon-\${fileId}" onclick="toggleFileExpansion('\${fileId}')">▶</div>
                                    </div>
                                    <div class="methods-container" id="methods-\${fileId}">
                                        <div class="methods-list">
                                            <div class="hierarchy-tree">
                                                \${renderHierarchyTree(hierarchyTree)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            \`;
                        }).join('')}
                    </div>
                \`;
            }

            function sortFiles(sortBy) {
                vscode.postMessage({ type: 'sortFiles', sortBy: sortBy });
            }

            function navigateToFile(fileUri) {
                vscode.postMessage({ type: 'navigateToFile', fileUri: fileUri });
            }

            function navigateToFunction(fileUri, functionName) {
                vscode.postMessage({ type: 'navigateToFunction', fileUri: fileUri, functionName: functionName });
            }

            function escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
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
                        <span class="method-name" onclick="navigateToFunction('\${escapeHtml(method.fileUri || '')}\', '\${escapeHtml(method.name)}')">\${escapeHtml(method.name)}</span>
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
        </script>
    </body>
    </html>`;
  }
}
