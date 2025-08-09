# Big-O Notation Analyzer

**Automatically analyze time & space complexity of Python functions with Big O notation.**

**Version:** 0.0.1

## What is this extension?

This VS Code extension automatically detects the **Big O complexity** of your Python functions and provides visual feedback with performance ratings. It helps developers understand algorithm efficiency and optimize their code.

## How it works

### Big O Notation + Performance Ratings

The extension analyzes your Python code and assigns both **complexity notation** and **performance ratings**:

| Big O Notation | Performance Rating | Examples |
|----------------|-------------------|----------|
| **O(1)** | 🟢 **EXCELLENT** | Array access, hash lookup |
| **O(log n)** | 🟢 **GOOD** | Binary search, tree traversal |
| **O(n)** | 🟡 **GOOD** | Linear search, single loops |
| **O(n log n)** | 🟡 **FAIR** | Merge sort, quick sort |
| **O(n²)** | 🟠 **POOR** | Nested loops, bubble sort |
| **O(n³)** | 🟠 **POOR** | Matrix multiplication |
| **O(2^n)** | 🔴 **BAD** | Fibonacci recursion |
| **O(n!)** | 🔴 **TERRIBLE** | Permutations, traveling salesman |

### Usage

#### **Automatic Analysis**
- **`Ctrl+S`** - Save your Python file to automatically evaluate all functions

#### **Manual Commands**  
- **`Ctrl+Shift+P`** - Open Command Palette and search for:
  - `"Big-O: Analyse time and space complexity"` - Analyze current file
  - `"Big-O: Reapply Big-O Color Decorations"` - Refresh visual indicators

#### **Improve Function (Coming Soon)**
- **Improve Button** - Use GitHub Copilot to optimize your function with AI-generated suggestions based on complexity analysis

### Web Views

The extension provides **2 specialized web view panels**:

#### **1. Current File Analysis**
- **Purpose**: Detailed analysis of the currently open Python file
- **Shows**: Function-by-function breakdown with complexity explanations
- **Location**: Explorer sidebar when viewing `.py` files

#### **2. Project Overview** 
- **Purpose**: Comprehensive insights across your entire project
- **Shows**: All functions' complexity summary, performance statistics, and optimization opportunities
- **Location**: Explorer sidebar - "BIG-O Files Overview"

## Getting Started

1. **Install** the extension from VS Code marketplace
2. **Open** any Python file (`.py`)
3. **Save** the file (`Ctrl+S`) to trigger automatic analysis
4. **View** results in:
   - Inline decorations in your code
   - Web view panels in the sidebar
   - Hover tooltips with explanations

---

**Start optimizing your algorithms today! 🚀**
