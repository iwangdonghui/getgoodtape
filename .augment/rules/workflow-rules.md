---
type: 'manual'
---

# My Augment Code Global Guidelines

## 1. General Rules

- **Primary Language:** All responses, comments, and documentation should be in English.
- **Response Format:**
  1.  Provide the complete, final code block first.
  2.  Below the code, add a `### Explanation` section.
  3.  Use a bulleted list to explain the most important implementation details or decisions.
- **Tone:** Professional, direct, and concise.

## 2. Technical Stack & Conventions

- **Frontend:** React (v18+) with TypeScript. Use Function Components and Hooks exclusively. Style with Tailwind CSS.
- **Backend:** Node.js with Express.js and TypeScript.
- **Database:** PostgreSQL with `node-postgres` (pg) library. Always use parameterized queries.
- **Package Manager:** The project uses `pnpm`. All installation or script commands must use `pnpm`.

## 3. Code Quality & Best Practices

- **Immutability:** State should be treated as immutable. Avoid direct mutations of state variables, props, or objects.
- **Error Handling:** All async operations must use `async/await` within a `try...catch` block.
- **Modularity:** Keep functions small and focused on a single task. Separate concerns (e.g., UI, business logic, API calls).
- **Documentation:** All created functions must have a complete JSDoc block explaining their purpose, parameters (`@param`), and return value (`@returns`).
- **Security:** Never hard-code secrets or credentials. Assume they come from environment variables (`process.env.VARIABLE_NAME`).
