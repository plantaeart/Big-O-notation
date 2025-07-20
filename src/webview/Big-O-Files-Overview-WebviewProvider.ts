import * as vscode from "vscode";
import { MethodAnalysis } from "../models/MethodAnalysis.model";
import { analyzeCodeComplexity } from "../analysis/complexityAnalyzer";
import {
  navigateToFunction,
  navigateToFile,
  getComplexityIndicator,
  getComplexityClass,
  findWorstComplexity,
  sortFilesByComplexity,
  improveFunctionRating,
  extractFunctionCode,
  COMPLEXITY_BADGE_STYLES,
  TREE_NODE_STYLES,
  COMMON_WEBVIEW_SCRIPTS,
  WEBVIEW_STYLES,
} from "../utils/webViewUtils";

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

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context?: vscode.ExtensionContext
  ) {
    // Load previous file analyses from persistent state
    this._loadState();
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
        case "scanAllFiles": {
          this._scanAllPythonFiles();
          break;
        }
        case "navigateToFile": {
          navigateToFile(data.fileUri);
          // Mark this file as should be expanded for the next refresh
          this._markFileForExpansion(data.fileUri);
          break;
        }
        case "navigateToFunction": {
          navigateToFunction(data.fileUri, data.functionName);
          // Mark this file as should be expanded for the next refresh
          this._markFileForExpansion(data.fileUri);
          break;
        }
        case "improveFunctionRating": {
          this._handleImproveFunctionRating(data);
          break;
        }
        case "webviewReady": {
          // Check if we have cached data, if so use it, otherwise scan
          if (this._fileAnalyses.size > 0) {
            // We have cached data, just refresh the view
            this._refreshView();
          } else {
            // No cached data, perform a fresh scan (don't clear cache since it's already empty)
            this._scanAllPythonFiles(false);
          }
          break;
        }
      }
    });
  }

  public async _scanAllPythonFiles(clearCache: boolean = true) {
    if (this._isScanning) {
      return;
    }

    this._isScanning = true;

    // Clear existing cache for fresh scan (only if requested)
    if (clearCache) {
      this._fileAnalyses.clear();
    }

    // Update UI to show scanning state
    if (this._view) {
      this._view.webview.postMessage({
        type: "scanningStarted",
      });
    }

    try {
      // Find all Python files in the workspace, excluding common non-project directories
      const pythonFiles = await vscode.workspace.findFiles(
        "**/*.py",
        "**/{node_modules,__pycache__,.git,.vscode,venv,env,.env,dist,build,target,.pytest_cache,.coverage,htmlcov,docs/_build,site-packages}/**"
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
    const worstTime = findWorstComplexity(methods, "time");
    const worstSpace = findWorstComplexity(methods, "space");

    this._fileAnalyses.set(filePath, {
      fileName,
      filePath,
      fileUri,
      methods,
      worstTimeComplexity: worstTime,
      worstSpaceComplexity: worstSpace,
      hierarchy,
    });

    // Save state to persistence
    this._saveState();

    this._refreshView();
  }

  public clearCache() {
    this._fileAnalyses.clear();
    if (this._context) {
      this._context.globalState.update("fileOverview.analyses", undefined);
    }
    this._refreshView();
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
        const indicator = getComplexityIndicator(method.complexity.notation);
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

  private _markFileForExpansion(fileUri: string) {
    // Send message to webview to mark this file for expansion
    if (this._view) {
      this._view.webview.postMessage({
        type: "markFileForExpansion",
        fileUri: fileUri,
      });
    }
  }

  private _refreshView(sortBy: string = "alphabetic") {
    if (!this._view) {
      return;
    }

    const files = Array.from(this._fileAnalyses.values());
    const stats = this._calculateStats();

    // Convert hierarchy maps to arrays for serialization
    const filesWithHierarchy = files.map((file) => ({
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
${WEBVIEW_STYLES}
            
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
            
            .stat-box.clickable {
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .stat-box.clickable:hover {
                opacity: 0.8;
                transform: translateY(-1px);
            }
            
            .stat-box.selected {
                border: 2px solid var(--vscode-focusBorder);
                box-shadow: 0 0 0 1px var(--vscode-focusBorder);
            }
            
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
            
            .tree-node-highlight {
                background-color: var(--vscode-list-activeSelectionBackground);
                border-radius: 4px;
                margin: 2px 0;
            }
            
            .filter-match-indicator {
                margin-left: 8px;
                font-size: 0.9em;
                opacity: 0.8;
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
        </style>
    </head>
    <body>
        <div class="header">
            <h2>📊 Big O - Files Overview</h2>
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
            let allFiles = []; // Store all files for filtering
            let selectedFilters = new Set(); // Store selected complexity filters
            let expandedFiles = new Set(); // Store which files are expanded

            // Signal that the webview is ready
            window.addEventListener('load', () => {
                vscode.postMessage({ type: 'webviewReady' });
            });

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
                    case 'markFileForExpansion':
                        markFileForExpansion(message.fileUri);
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
                    expandedFiles.delete(filePath); // Remove from expanded set
                } else {
                    methodsContainer.classList.add('expanded');
                    expandIcon.classList.add('expanded');
                    expandedFiles.add(filePath); // Add to expanded set
                }
            }

            function updateOverview(files, stats, sortBy) {
                allFiles = files; // Store all files for filtering
                currentSortBy = sortBy;
                updateStats(stats);
                updateControls();
                applyFiltersAndSort();
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
                        <div class="stat-box excellent clickable \${selectedFilters.has('excellent') ? 'selected' : ''}" onclick="toggleFilter('excellent')">
                            <div class="stat-number">\${stats.excellentMethods}</div>
                            <div class="stat-label">Excellent</div>
                        </div>
                        <div class="stat-box good clickable \${selectedFilters.has('good') ? 'selected' : ''}" onclick="toggleFilter('good')">
                            <div class="stat-number">\${stats.goodMethods}</div>
                            <div class="stat-label">Good</div>
                        </div>
                        <div class="stat-box fair clickable \${selectedFilters.has('fair') ? 'selected' : ''}" onclick="toggleFilter('fair')">
                            <div class="stat-number">\${stats.fairMethods}</div>
                            <div class="stat-label">Fair</div>
                        </div>
                        <div class="stat-box poor clickable \${selectedFilters.has('poor') ? 'selected' : ''}" onclick="toggleFilter('poor')">
                            <div class="stat-number">\${stats.poorMethods}</div>
                            <div class="stat-label">Poor</div>
                        </div>
                        <div class="stat-box bad clickable \${selectedFilters.has('bad') ? 'selected' : ''}" onclick="toggleFilter('bad')">
                            <div class="stat-number">\${stats.badMethods}</div>
                            <div class="stat-label">Bad</div>
                        </div>
                        <div class="stat-box terrible clickable \${selectedFilters.has('terrible') ? 'selected' : ''}" onclick="toggleFilter('terrible')">
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
                            // Build hierarchy tree with only the filtered methods
                            const hierarchyTree = buildHierarchyTree(methodsWithFileUri, hierarchyMap);
                            console.log('File:', file.fileName, 'Methods:', methodsWithFileUri.length, 'HierarchyTree:', hierarchyTree);
                            console.log('File methods details:', methodsWithFileUri.map(m => m.name));
                            console.log('HierarchyMap entries:', Array.from(hierarchyMap.entries()));
                            
                            return \`
                                <div class="file-item">
                                    <div class="file-header">
                                        <div class="file-info">
                                            <div class="file-name" onclick="navigateToFile('\${escapeHtml(file.fileUri)}')">\${escapeHtml(file.fileName)}</div>
                                            <div class="file-stats">
                                                <div class="file-stat">
                                                    <span>📊 \${file.methods.length} methods</span>
                                                    \${selectedFilters.size > 0 ? '<span style="color: var(--vscode-descriptionForeground); font-size: 0.8em;"> (filtered)</span>' : ''}
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
                
                // Restore accordion states after updating HTML
                restoreAccordionStates(files);
            }

            function restoreAccordionStates(files) {
                // Wait for DOM to be updated, then restore states
                setTimeout(() => {
                    files.forEach(file => {
                        const fileId = btoa(encodeURIComponent(file.filePath)).replace(/[^a-zA-Z0-9]/g, '');
                        
                        // Check if this file was previously expanded
                        if (expandedFiles.has(fileId)) {
                            const methodsContainer = document.getElementById(\`methods-\${fileId}\`);
                            const expandIcon = document.getElementById(\`icon-\${fileId}\`);
                            
                            if (methodsContainer && expandIcon) {
                                methodsContainer.classList.add('expanded');
                                expandIcon.classList.add('expanded');
                            }
                        }
                    });
                }, 0);
            }

            function markFileForExpansion(fileUri) {
                // Find the file in allFiles array and mark it for expansion
                const file = allFiles.find(f => f.fileUri === fileUri);
                if (file) {
                    const fileId = btoa(encodeURIComponent(file.filePath)).replace(/[^a-zA-Z0-9]/g, '');
                    expandedFiles.add(fileId);
                    
                    // If the file is currently visible, expand it immediately
                    const methodsContainer = document.getElementById(\`methods-\${fileId}\`);
                    const expandIcon = document.getElementById(\`icon-\${fileId}\`);
                    
                    if (methodsContainer && expandIcon) {
                        methodsContainer.classList.add('expanded');
                        expandIcon.classList.add('expanded');
                    }
                }
            }

            function sortFiles(sortBy) {
                currentSortBy = sortBy;
                applyFiltersAndSort();
            }

            function toggleFilter(complexityLevel) {
                if (selectedFilters.has(complexityLevel)) {
                    selectedFilters.delete(complexityLevel);
                } else {
                    selectedFilters.add(complexityLevel);
                }

                // Update the visual state of the stat boxes
                updateStats(getStatsFromAllFiles());
                
                // Apply filters and sorting
                applyFiltersAndSort();
            }

            function applyFiltersAndSort() {
                console.log('applyFiltersAndSort called, selectedFilters:', selectedFilters, 'allFiles:', allFiles);
                let filteredFiles = allFiles;

                // Apply complexity filters if any are selected
                if (selectedFilters.size > 0) {
                    filteredFiles = allFiles.filter(file => {
                        // Check if file has methods matching any selected complexity level
                        return file.methods.some(method => {
                            const indicator = getComplexityIndicator(method.complexity.notation).toLowerCase();
                            return selectedFilters.has(indicator);
                        });
                    }).map(file => {
                        // Get methods that match the filter
                        const directMatches = file.methods.filter(method => {
                            const indicator = getComplexityIndicator(method.complexity.notation).toLowerCase();
                            return selectedFilters.has(indicator);
                        });

                        // Include parents and children of matching methods to maintain hierarchy
                        const hierarchyMap = new Map(file.hierarchy || []);
                        const methodsToInclude = new Set();
                        
                        // Add direct matches
                        directMatches.forEach(method => {
                            methodsToInclude.add(method.name);
                        });

                        // Add parents and children for each direct match
                        directMatches.forEach(method => {
                            // Add children
                            const children = hierarchyMap.get(method.name) || [];
                            children.forEach(child => methodsToInclude.add(child));
                            
                            // Add parents (search through hierarchy to find who calls this method)
                            for (const [parent, childrenList] of hierarchyMap.entries()) {
                                if (childrenList.includes(method.name)) {
                                    methodsToInclude.add(parent);
                                }
                            }
                        });

                        // Filter methods to include matches and their hierarchy
                        const filteredMethods = file.methods.filter(method => 
                            methodsToInclude.has(method.name)
                        );

                        // Return a new file object with filtered methods
                        return {
                            ...file,
                            methods: filteredMethods,
                            // Recalculate worst complexities based on direct matches only (not parents/children)
                            worstTimeComplexity: findWorstComplexity(directMatches, "time"),
                            worstSpaceComplexity: findWorstComplexity(directMatches, "space")
                        };
                    });

                    // When filtering is active, default to "worstToBest" sorting if currently on alphabetic
                    if (currentSortBy === 'alphabetic') {
                        currentSortBy = 'worstToBest';
                    }
                } else if (selectedFilters.size === 0 && currentSortBy !== 'alphabetic') {
                    // When no filters are active, default back to alphabetic
                    currentSortBy = 'alphabetic';
                }

                // Sort the filtered files
                const sortedFiles = sortFilesByComplexity(filteredFiles, currentSortBy);
                
                // Update controls to reflect current sort
                updateControls();
                
                // Update the file display
                updateFiles(sortedFiles);
            }

            function getStatsFromAllFiles() {
                const stats = {
                    totalMethods: 0,
                    excellentMethods: 0,
                    goodMethods: 0,
                    fairMethods: 0,
                    poorMethods: 0,
                    badMethods: 0,
                    terribleMethods: 0,
                };

                for (const file of allFiles) {
                    stats.totalMethods += file.methods.length;

                    for (const method of file.methods) {
                        const indicator = getComplexityIndicator(method.complexity.notation);
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

            ${COMMON_WEBVIEW_SCRIPTS}

            function renderHierarchyTree(nodes) {
                console.log('renderHierarchyTree called with nodes:', nodes);
                return nodes.map(node => renderTreeNode(node)).join('');
            }

            function renderTreeNode(node) {
                const indent = '　'.repeat(node.level * 2); // Use full-width space for indentation
                const connector = node.level > 0 ? '└─ ' : '';
                const method = node.method;
                
                // Check if this method matches the current filter
                const isDirectMatch = selectedFilters.size > 0 && selectedFilters.has(getComplexityIndicator(method.complexity.notation).toLowerCase());
                const nodeClass = isDirectMatch ? 'tree-node-highlight' : '';
                
                let result = \`
                    <div class="tree-node level-\${node.level} \${nodeClass}">
                        <div class="method-header">
                            <span class="node-connector">\${indent}\${connector}</span>
                            <span class="method-name" onclick="navigateToFunction('\${escapeHtml(method.fileUri || '')}\', '\${escapeHtml(method.name)}')">\${escapeHtml(method.name)}</span>
                            \${isDirectMatch ? '<span class="filter-match-indicator">🎯</span>' : ''}
                            <button class="improve-button" onclick="improveFunctionRating('\${escapeHtml(method.fileUri || '')}\', '\${escapeHtml(method.name)}\', '', { notation: '\${escapeHtml(method.complexity.notation)}', description: '\${escapeHtml(method.complexity.description)}', confidence: \${method.complexity.confidence} }, [])">
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
                    result += node.children.map(child => renderTreeNode(child)).join('');
                }
                
                return result;
            }
        </script>
    </body>
    </html>`;
  }

  private _loadState() {
    try {
      if (!this._context) {
        return;
      }

      const savedAnalyses = this._context.globalState.get<
        Array<[string, FileAnalysis]>
      >("fileOverview.analyses");

      if (savedAnalyses) {
        console.log(
          "FileOverview: Loading saved state with",
          savedAnalyses.length,
          "files"
        );
        this._fileAnalyses = new Map(
          savedAnalyses.map(([key, analysis]) => {
            // Restore hierarchy Map if it exists
            if (analysis.hierarchy && Array.isArray(analysis.hierarchy)) {
              analysis.hierarchy = new Map(
                analysis.hierarchy as [string, string[]][]
              );
            }
            return [key, analysis];
          })
        );
      } else {
        console.log("FileOverview: No saved state found");
      }
    } catch (error) {
      console.error("Failed to load file overview state:", error);
    }
  }

  private _saveState() {
    try {
      if (!this._context) {
        return;
      }

      // Convert Map to array for serialization
      const analysesToSave = Array.from(this._fileAnalyses.entries()).map(
        ([key, analysis]) => {
          // Convert hierarchy Map to array for serialization
          const serializedAnalysis = {
            ...analysis,
            hierarchy: analysis.hierarchy
              ? Array.from(analysis.hierarchy.entries())
              : undefined,
          };
          return [key, serializedAnalysis];
        }
      );

      console.log(
        "FileOverview: Saving state with",
        analysesToSave.length,
        "files"
      );
      this._context.globalState.update("fileOverview.analyses", analysesToSave);
    } catch (error) {
      console.error("Failed to save file overview state:", error);
    }
  }
}
