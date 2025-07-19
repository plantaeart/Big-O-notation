---
applyTo: "**"
---

# Big O Detection Rules and Examples

## O(1) - Constant Time

### **Rules to Detect:**

1. **No loops** that depend on input size
2. **Direct access** operations (array[index], dict[key])
3. **Fixed number of operations** regardless of input size
4. **Mathematical operations** (+, -, \*, /, %)
5. **Variable assignments** and comparisons

### **Simple Example:**

```python
def get_first_element(arr):
    return arr[0]  # Always 1 operation
```

### **Detection Methods:**

- **Static Analysis:** Look for absence of loops, direct indexing
- **Code Pattern:** `arr[0]`, `dict[key]`, `a + b`
- **Runtime Test:** Time stays constant as input size increases
- **Profiling:** Function calls remain constant

---

## O(log n) - Logarithmic Time

### **Rules to Detect:**

1. **Input size halved** in each iteration
2. **Binary search** patterns
3. **Tree traversal** going down one path
4. **Loop variable** divided/multiplied by constant: `i = i // 2`
5. **Recursive calls** on half the data
6. **Heap operations** (push/pop)

### **Simple Example:**

```python
def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2  # Halving search space
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
```

### **Detection Methods:**

- **Static Analysis:** Look for `// 2`, `* 2`, binary search patterns
- **Code Pattern:** `while left <= right:`, `heapq.heappush()`
- **Runtime Test:** Doubling input increases time by constant factor
- **Profiling:** Operations grow logarithmically with input size

---

## O(n) - Linear Time

### **Rules to Detect:**

1. **Single loop** through input
2. **One pass** through data structure
3. **Each element visited once**
4. **No nested loops** of input size
5. **Built-in functions** like `sum()`, `max()`, `len()`

### **Simple Example:**

```python
def find_sum(arr):
    total = 0
    for num in arr:  # One loop through n elements
        total += num
    return total
```

### **Detection Methods:**

- **Static Analysis:** Count loops - single loop = O(n)
- **Code Pattern:** `for item in collection:`, `sum(arr)`
- **Runtime Test:** Time doubles when input size doubles
- **Profiling:** Operations proportional to input size

---

## O(n log n) - Linearithmic Time

### **Rules to Detect:**

1. **Sorting algorithms** (merge sort, quick sort, heap sort)
2. **Divide and conquer** with merge step
3. **Loop containing log n operation**
4. **n elements each processed in log n time**
5. **Built-in sorting** functions

### **Simple Example:**

```python
def merge_sort(arr):
    if len(arr) <= 1:
        return arr

    mid = len(arr) // 2
    left = merge_sort(arr[:mid])    # T(n/2)
    right = merge_sort(arr[mid:])   # T(n/2)

    return merge(left, right)       # O(n) merge
```

### **Detection Methods:**

- **Static Analysis:** Recursive calls + linear merge, sorting operations
- **Code Pattern:** `sorted()`, divide-and-conquer with merge
- **Runtime Test:** Time grows as n \* log(n)
- **Profiling:** More than linear but less than quadratic growth

---

## O(n²) - Quadratic Time

### **Rules to Detect:**

1. **Nested loops** both dependent on input size
2. **Two loops** where inner loop depends on outer loop
3. **All pairs** operations
4. **Simple sorting** algorithms (bubble, selection, insertion)
5. **Matrix operations** (for square matrices)

### **Simple Example:**

```python
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):              # Outer loop: n iterations
        for j in range(n - 1):      # Inner loop: n iterations
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr
```

### **Detection Methods:**

- **Static Analysis:** Count nested loops - two nested = O(n²)
- **Code Pattern:** `for i in range(n): for j in range(n):`
- **Runtime Test:** Time quadruples when input size doubles
- **Profiling:** Operations grow as n²

---

## O(n³) - Cubic Time

### **Rules to Detect:**

1. **Three nested loops** all dependent on input size
2. **Matrix multiplication** (standard algorithm)
3. **All triplets** operations
4. **Triple nested structure**

### **Simple Example:**

```python
def matrix_multiply(A, B):
    n = len(A)
    result = [[0] * n for _ in range(n)]
    for i in range(n):              # First loop: n
        for j in range(n):          # Second loop: n
            for k in range(n):      # Third loop: n
                result[i][j] += A[i][k] * B[k][j]
    return result
```

### **Detection Methods:**

- **Static Analysis:** Count nested loops - three nested = O(n³)
- **Code Pattern:** Triple nested loops
- **Runtime Test:** Time increases 8x when input size doubles
- **Profiling:** Operations grow as n³

---

## O(2^n) - Exponential Time

### **Rules to Detect:**

1. **Recursive calls** making 2+ calls per level
2. **All subsets** generation
3. **Exhaustive search** of all possibilities
4. **Fibonacci-like** recursive patterns
5. **Backtracking** without memoization

### **Simple Example:**

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)  # 2 recursive calls
```

### **Detection Methods:**

- **Static Analysis:** Multiple recursive calls per function call
- **Code Pattern:** `func(n-1) + func(n-2)`, power set generation
- **Runtime Test:** Time doubles with each +1 in input size
- **Profiling:** Exponential growth, becomes unusable around n=30

---

## O(n!) - Factorial Time

### **Rules to Detect:**

1. **All permutations** generation
2. **Traveling salesman** brute force
3. **All arrangements** of n items
4. **Recursive calls** with n branches at each level
5. **Brute force optimization** problems

### **Simple Example:**

```python
def all_permutations(arr):
    if len(arr) <= 1:
        return [arr]

    result = []
    for i in range(len(arr)):       # n choices
        rest = arr[:i] + arr[i+1:]
        for perm in all_permutations(rest):  # (n-1)! recursive calls
            result.append([arr[i]] + perm)
    return result
```

### **Detection Methods:**

- **Static Analysis:** n recursive calls each making (n-1) calls
- **Code Pattern:** `permutations()`, nested recursion with n branches
- **Runtime Test:** Time multiplies by n with each +1 in input size
- **Profiling:** Factorial growth, unusable beyond n=10

---

## Master Detection Strategy

### **1. Static Code Analysis**

```python
# Step 1: Count loops
def analyze_loops(code):
    """
    - No loops = O(1)
    - 1 loop = O(n)
    - 2 nested loops = O(n²)
    - 3 nested loops = O(n³)
    """
    pass

# Step 2: Look for patterns
def identify_patterns(code):
    """
    - Binary search = O(log n)
    - Sorting = O(n log n)
    - Recursive calls = Check branching factor
    """
    pass
```

### **2. Dynamic Testing**

```python
import time

def test_complexity(func, sizes=[100, 200, 400, 800]):
    """Test function with increasing input sizes"""
    times = []
    for size in sizes:
        data = list(range(size))

        start = time.perf_counter()
        func(data)
        end = time.perf_counter()

        times.append(end - start)

    # Analyze growth pattern
    for i in range(1, len(times)):
        ratio = times[i] / times[i-1]
        print(f"Size {sizes[i]}: {ratio:.2f}x slower")
```

### **3. Growth Pattern Recognition**

| Complexity | Input 2x Larger | Growth Pattern |
| ---------- | --------------- | -------------- |
| O(1)       | Same time       | Constant       |
| O(log n)   | +constant       | Logarithmic    |
| O(n)       | 2x time         | Linear         |
| O(n log n) | ~2.1x time      | Linearithmic   |
| O(n²)      | 4x time         | Quadratic      |
| O(n³)      | 8x time         | Cubic          |
| O(2^n)     | Square time     | Exponential    |
| O(n!)      | Huge increase   | Factorial      |

### **4. Quick Recognition Checklist**

1. **No loops + direct access** → O(1)
2. **Loop with halving** → O(log n)
3. **Single loop** → O(n)
4. **Sorting involved** → O(n log n)
5. **Two nested loops** → O(n²)
6. **Three nested loops** → O(n³)
7. **Multiple recursive calls** → O(2^n)
8. **All permutations** → O(n!)

### **5. Common Function Complexities**

```python
# O(1) operations
arr[0], dict[key], len(arr), arr.append()

# O(log n) operations
bisect.bisect_left(), heapq.heappush(), heapq.heappop()

# O(n) operations
sum(arr), max(arr), list(arr), arr.count(), arr.index()

# O(n log n) operations
sorted(arr), arr.sort(), heapq.nlargest()

# O(n²) operations
list.remove() in loop, nested list comprehensions
```

This guide provides a systematic approach to identifying Big O complexity through multiple detection methods: static analysis, dynamic testing, pattern recognition, and empirical measurement.
