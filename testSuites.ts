import { SampleTestCase } from '../types';

export const SAMPLE_TEST_CASES: SampleTestCase[] = [
  // ================= Python Test Cases =================
  {
    id: 'py-syntax',
    title: 'Python: Syntax & Indentation Errors',
    language: 'python',
    category: 'Syntax',
    description: 'Demonstrates missing colons after control statements and mixed indentation errors.',
    expectedBugsCount: 2,
    tags: ['SyntaxError', 'Indentation', 'Colons'],
    code: `def calculate_discount(price, is_member)
    if is_member
        return price * 0.8
    else
        return price
`
  },
  {
    id: 'py-logic',
    title: 'Python: Mutable Default Argument & is Comparison',
    language: 'python',
    category: 'Logical',
    description: 'Demonstrates mutable default parameter sharing state and identity comparison on literals.',
    expectedBugsCount: 2,
    tags: ['Mutable Default', 'Identity vs Equality', 'Logic'],
    code: `def append_to_user_history(item, history=[]):
    history.append(item)
    return history

def check_status(code):
    if code is 200:
        return "OK"
    return "Error"
`
  },
  {
    id: 'py-runtime',
    title: 'Python: Division by Zero & Bare Except',
    language: 'python',
    category: 'Runtime',
    description: 'Demonstrates zero division and dangerous broad exception trapping.',
    expectedBugsCount: 2,
    tags: ['ZeroDivisionError', 'Bare Except', 'Crash Risk'],
    code: `def compute_average(total, count):
    try:
        avg = total / 0
        return avg
    except:
        print("An error occurred")
        return None
`
  },
  {
    id: 'py-security',
    title: 'Python: SQL Injection & Command Execution',
    language: 'python',
    category: 'Security',
    description: 'Demonstrates f-string SQL query injection and dangerous os.system execution.',
    expectedBugsCount: 2,
    tags: ['SQL Injection', 'Command Injection', 'CWE-89', 'CWE-78'],
    code: `import os

def find_user_records(cursor, username):
    query = f"SELECT * FROM users WHERE username = '{username}'"
    cursor.execute(query)
    return cursor.fetchall()

def run_backup(target_path):
    os.system("tar -czf backup.tar.gz " + target_path)
`
  },
  {
    id: 'py-clean',
    title: 'Python: Clean & Valid Code',
    language: 'python',
    category: 'Clean',
    description: 'A completely clean Python utility function with zero bugs.',
    expectedBugsCount: 0,
    tags: ['Clean', 'High Health Score', 'Robust'],
    code: `from typing import List, Optional

def compute_median(numbers: List[float]) -> Optional[float]:
    """Calculate the median of a list of floating-point numbers."""
    if not numbers:
        return None
    sorted_nums = sorted(numbers)
    n = len(sorted_nums)
    mid = n // 2
    if n % 2 == 1:
        return sorted_nums[mid]
    return (sorted_nums[mid - 1] + sorted_nums[mid]) / 2.0
`
  },

  // ================= JavaScript Test Cases =================
  {
    id: 'js-syntax',
    title: 'JavaScript: Unmatched Delimiters & Missing Braces',
    language: 'javascript',
    category: 'Syntax',
    description: 'Demonstrates unmatched parentheses and broken object literals.',
    expectedBugsCount: 2,
    tags: ['SyntaxError', 'Delimiters', 'Parsing'],
    code: `function fetchUserData(userId {
  const config = { headers: { 'Authorization': 'Bearer ' + token };
  return fetch('/api/user/' + userId, config);
}
`
  },
  {
    id: 'js-logic',
    title: 'JavaScript: NaN Equality & Assignment in if',
    language: 'javascript',
    category: 'Logical',
    description: 'Demonstrates assignment in conditional and broken NaN === comparison.',
    expectedBugsCount: 2,
    tags: ['Conditional Assignment', 'NaN Comparison', 'Coercion'],
    code: `function validateThreshold(value) {
  let isExceeded = false;
  if (value = 100) {
    console.log("Threshold reached");
  }
  if (value === NaN) {
    console.log("Invalid number");
  }
  return isExceeded;
}
`
  },
  {
    id: 'js-runtime',
    title: 'JavaScript: Loop Off-by-One & Unhandled Rejection',
    language: 'javascript',
    category: 'Runtime',
    description: 'Demonstrates array index out-of-bounds in loop and unhandled promise rejection.',
    expectedBugsCount: 2,
    tags: ['Off-by-One', 'Undefined Index', 'Promise Rejection'],
    code: `function printAllScores(scores) {
  for (let i = 0; i <= scores.length; i++) {
    console.log("Score " + i + ": " + scores[i].toFixed(2));
  }
  
  fetch('/api/analytics').then(res => res.json());
}
`
  },
  {
    id: 'js-security',
    title: 'JavaScript: eval() & DOM XSS via innerHTML',
    language: 'javascript',
    category: 'Security',
    description: 'Demonstrates unsafe code execution and direct innerHTML DOM injection.',
    expectedBugsCount: 2,
    tags: ['XSS', 'eval', 'DOM Manipulation', 'CWE-79', 'CWE-95'],
    code: `function renderUserBio(userInput) {
  const container = document.getElementById('bio');
  container.innerHTML = "<div>" + userInput + "</div>";
  
  const parsedData = eval("(" + userInput + ")");
  return parsedData;
}
`
  },
  {
    id: 'js-clean',
    title: 'JavaScript: Clean & Valid Code',
    language: 'javascript',
    category: 'Clean',
    description: 'A clean, modern ES6+ utility with full error handling and strict checks.',
    expectedBugsCount: 0,
    tags: ['Clean', 'ES6', 'Zero Bugs'],
    code: `function formatCurrency(amount, currencyCode = 'USD') {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    throw new TypeError('Amount must be a valid number');
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
}
`
  },

  // ================= Java Test Cases =================
  {
    id: 'java-syntax',
    title: 'Java: Missing Semicolons & Syntax Errors',
    language: 'java',
    category: 'Syntax',
    description: 'Demonstrates missing statement terminators in standard Java methods.',
    expectedBugsCount: 2,
    tags: ['Semicolon', 'Compilation Error', 'Syntax'],
    code: `public class PaymentService {
    public double calculateFee(double amount) {
        double feePercentage = 0.029
        double fixedFee = 0.30;
        return amount * feePercentage + fixedFee
    }
}
`
  },
  {
    id: 'java-logic',
    title: 'Java: String == Equality & Switch Fallthrough',
    language: 'java',
    category: 'Logical',
    description: 'Demonstrates reference comparison on strings and loop off-by-one errors.',
    expectedBugsCount: 2,
    tags: ['String Equality', 'Off-by-One', 'Logic Error'],
    code: `import java.util.List;

public class OrderValidator {
    public boolean checkRole(String roleName) {
        if (roleName == "ADMIN") {
            return true;
        }
        return false;
    }

    public void processAll(List<String> items) {
        for (int i = 0; i <= items.size(); i++) {
            System.out.println(items.get(i));
        }
    }
}
`
  },
  {
    id: 'java-security',
    title: 'Java: SQL Injection & Command Execution',
    language: 'java',
    category: 'Security',
    description: 'Demonstrates unparameterized JDBC Statement queries and Runtime.exec execution.',
    expectedBugsCount: 2,
    tags: ['JDBC SQLi', 'Runtime.exec', 'CWE-89', 'CWE-78'],
    code: `import java.sql.*;

public class AccountManager {
    public ResultSet queryAccount(Connection conn, String accountId) throws SQLException {
        Statement stmt = conn.createStatement();
        return stmt.executeQuery("SELECT * FROM accounts WHERE id = '" + accountId + "'");
    }

    public void launchProcess(String scriptPath) throws Exception {
        Runtime.getRuntime().exec("sh " + scriptPath);
    }
}
`
  },
  {
    id: 'java-clean',
    title: 'Java: Clean & Production-Ready Code',
    language: 'java',
    category: 'Clean',
    description: 'A clean, well-structured Java class using modern Java idioms.',
    expectedBugsCount: 0,
    tags: ['Clean', 'OOP', 'Null Safe'],
    code: `import java.util.Objects;
import java.util.Optional;

public final class UserSession {
    private final String sessionId;
    private final long createdAt;

    public UserSession(String sessionId) {
        this.sessionId = Objects.requireNonNull(sessionId, "sessionId must not be null");
        this.createdAt = System.currentTimeMillis();
    }

    public String getSessionId() {
        return sessionId;
    }

    public boolean isExpired(long ttlMillis) {
        return (System.currentTimeMillis() - createdAt) > ttlMillis;
    }
}
`
  },

  // ================= C Test Cases =================
  {
    id: 'c-semicolons',
    title: 'C: Missing & Accidental Semicolons Test',
    language: 'c',
    category: 'Syntax',
    description: 'Demonstrates missing semicolons on declarations, return statements, and accidental semicolon after if() condition.',
    expectedBugsCount: 3,
    tags: ['Semicolons', 'Accidental If Semicolon', 'Syntax', 'Logic'],
    code: `#include <stdio.h>

int compute_tax(int income) {
    int rate = 15
    int totalTax = income * rate / 100;
    
    // Bug: Accidental semicolon executes body unconditionally
    if (income < 0); {
        printf("Invalid negative income!\\n");
    }
    
    return totalTax
}
`
  },
  {
    id: 'c-security',
    title: 'C: Dangerous gets() & Format String Vulnerability',
    language: 'c',
    category: 'Security',
    description: 'Demonstrates banned gets() function and variable format string vulnerability.',
    expectedBugsCount: 2,
    tags: ['gets()', 'Format String', 'CWE-242', 'CWE-134'],
    code: `#include <stdio.h>

void read_user_input() {
    char buffer[64];
    printf("Enter name: ");
    gets(buffer);
    printf(buffer);
}
`
  },
  {
    id: 'c-runtime',
    title: 'C: NULL Pointer Dereference & Use-After-Free',
    language: 'c',
    category: 'Runtime',
    description: 'Demonstrates dereferencing a NULL pointer and accessing freed heap memory.',
    expectedBugsCount: 2,
    tags: ['SIGSEGV', 'NULL Dereference', 'Use After Free', 'CWE-416'],
    code: `#include <stdio.h>
#include <stdlib.h>

void process_data() {
    int *data = (int*)malloc(sizeof(int) * 10);
    free(data);
    data[0] = 42;

    int *null_ptr = NULL;
    *null_ptr = 100;
}
`
  },
  {
    id: 'c-clean',
    title: 'C: Clean & Memory-Safe Implementation',
    language: 'c',
    category: 'Clean',
    description: 'Safe C code using bounds-checked fgets and clean pointer handling.',
    expectedBugsCount: 0,
    tags: ['Safe C', 'Bounds Checked', 'Clean'],
    code: `#include <stdio.h>
#include <string.h>

int safe_string_copy(char *dest, size_t dest_size, const char *src) {
    if (!dest || !src || dest_size == 0) {
        return -1;
    }
    size_t src_len = strlen(src);
    if (src_len >= dest_size) {
        return -1;
    }
    memcpy(dest, src, src_len + 1);
    return 0;
}
`
  },

  // ================= C++ Test Cases =================
  {
    id: 'cpp-semicolons',
    title: 'C++: Missing Semicolons & Struct Delimiter',
    language: 'cpp',
    category: 'Syntax',
    description: 'Demonstrates missing semicolon after struct definition and missing statement terminators.',
    expectedBugsCount: 2,
    tags: ['Struct Semicolon', 'C++ Syntax', 'Delimiter'],
    code: `#include <iostream>
#include <string>

struct UserProfile {
    std::string username;
    int accessLevel;
}

void printProfile(const UserProfile& profile) {
    std::cout << profile.username << std::endl
}
`
  },
  {
    id: 'cpp-runtime',
    title: 'C++: Array delete Mismatch & Catch by Value',
    language: 'cpp',
    category: 'Runtime',
    description: 'Demonstrates scalar delete on dynamic array and object slicing in catch block.',
    expectedBugsCount: 2,
    tags: ['delete[] Mismatch', 'Object Slicing', 'Exception Slicing'],
    code: `#include <iostream>
#include <stdexcept>

void allocate_buffer() {
    int* numbers = new int[50];
    delete numbers;
}

void risky_operation() {
    try {
        throw std::runtime_error("Database connection lost");
    } catch (std::runtime_error err) {
        std::cout << err.what() << std::endl;
    }
}
`
  },
  {
    id: 'cpp-clean',
    title: 'C++: Clean Modern C++20 with RAII',
    language: 'cpp',
    category: 'Clean',
    description: 'Clean C++ code using std::unique_ptr, std::string_view, and const references.',
    expectedBugsCount: 0,
    tags: ['Modern C++', 'RAII', 'Clean'],
    code: `#include <memory>
#include <string>
#include <string_view>
#include <vector>

class DataProcessor {
public:
    explicit DataProcessor(std::string_view name) : name_(name) {}

    [[nodiscard]] std::string_view getName() const noexcept {
        return name_;
    }

    void addMetric(double value) {
        metrics_.push_back(value);
    }

private:
    std::string name_;
    std::vector<double> metrics_;
};
`
  },

  // ================= HTML Test Cases =================
  {
    id: 'html-syntax',
    title: 'HTML: Unclosed Tags & Deprecated Elements',
    language: 'html',
    category: 'Syntax',
    description: 'Demonstrates unclosed div tag, deprecated center tag, and missing image alt attribute.',
    expectedBugsCount: 3,
    tags: ['Unclosed Tag', 'Deprecated', 'Accessibility'],
    code: `<!DOCTYPE html>
<html>
  <head>
    <title>Application Portal</title>
  </head>
  <body>
    <center>
      <h1>Welcome to Security Dashboard</h1>
    </center>
    <img src="logo.png">
    <div class="card-container">
      <p>System status is nominal.</p>
  </body>
</html>`
  },
  {
    id: 'html-clean',
    title: 'HTML: Clean Accessible HTML5 Document',
    language: 'html',
    category: 'Clean',
    description: 'Valid, accessible HTML5 document with complete semantic markup.',
    expectedBugsCount: 0,
    tags: ['Clean', 'HTML5', 'Accessible'],
    code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Overview</title>
  </head>
  <body>
    <header>
      <h1>Security Control Center</h1>
    </header>
    <main>
      <section aria-labelledby="status-heading">
        <h2 id="status-heading">Service Health</h2>
        <p>All microservices operating normally.</p>
      </section>
    </main>
  </body>
</html>`
  }
];
