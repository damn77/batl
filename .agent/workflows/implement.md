---
description: Execute implementation plan by processing all tasks defined in tasks.md
---

# Implementation Workflow

This workflow executes the implementation plan by processing all tasks in tasks.md.

## Prerequisites

- `tasks.md` must exist and be complete
- `plan.md` must exist with tech stack and architecture
- All checklists should be complete (or user approval to proceed)

## Steps

1. **Check prerequisites**:
   ```powershell
   .specify/scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks
   ```
   - Parse FEATURE_DIR and AVAILABLE_DOCS list
   - All paths must be absolute

2. **Check checklists status** (if FEATURE_DIR/checklists/ exists):
   - Scan all checklist files
   - For each checklist, count:
     - Total items: Lines matching `- [ ]` or `- [X]` or `- [x]`
     - Completed items: Lines matching `- [X]` or `- [x]`
     - Incomplete items: Lines matching `- [ ]`
   
   - Create status table:
     ```
     | Checklist   | Total | Completed | Incomplete | Status |
     |-------------|-------|-----------|------------|--------|
     | ux.md       | 12    | 12        | 0          | ✓ PASS |
     | test.md     | 8     | 5         | 3          | ✗ FAIL |
     ```
   
   - **If any checklist incomplete**:
     - Display table
     - STOP and ask: "Some checklists are incomplete. Proceed anyway? (yes/no)"
     - Wait for user response
   
   - **If all complete**: Automatically proceed

3. **Load implementation context**:
   - **REQUIRED**: Read tasks.md for complete task list
   - **REQUIRED**: Read plan.md for tech stack and architecture
   - **IF EXISTS**: Read data-model.md for entities
   - **IF EXISTS**: Read contracts/ for API specs
   - **IF EXISTS**: Read research.md for technical decisions
   - **IF EXISTS**: Read quickstart.md for integration scenarios

4. **Project setup verification**:
   - Create/verify ignore files based on project setup:
     - Check if git repo → create/verify .gitignore
     - Check if Dockerfile exists → create/verify .dockerignore
     - Check if .eslintrc exists → create/verify .eslintignore
     - Check if .prettierrc exists → create/verify .prettierignore
   
   - **Common patterns by technology** (from plan.md):
     - **Node.js**: `node_modules/`, `dist/`, `build/`, `*.log`, `.env*`
     - **Python**: `__pycache__/`, `*.pyc`, `.venv/`, `dist/`
     - **Java**: `target/`, `*.class`, `*.jar`, `.gradle/`
     - **C#/.NET**: `bin/`, `obj/`, `*.user`, `packages/`
     - **Go**: `*.exe`, `vendor/`, `*.out`
     - **Universal**: `.DS_Store`, `Thumbs.db`, `.vscode/`, `.idea/`

5. **Parse tasks.md structure**:
   - Task phases: Setup, Tests, Core, Integration, Polish
   - Task dependencies: Sequential vs parallel execution
   - Task details: ID, description, file paths, parallel markers [P]
   - Execution flow: Order and dependency requirements

6. **Execute implementation** following task plan:
   - **Phase-by-phase**: Complete each phase before next
   - **Respect dependencies**: Sequential tasks in order, parallel [P] together
   - **Follow TDD**: Execute test tasks before implementation
   - **File coordination**: Tasks on same files run sequentially
   - **Validation checkpoints**: Verify phase completion

7. **Implementation execution rules**:
   - **Setup first**: Project structure, dependencies, config
   - **Tests before code**: Write tests for contracts, entities, integration
   - **Core development**: Models, services, CLI, endpoints
   - **Integration**: Database, middleware, logging, external services
   - **Polish**: Unit tests, performance, documentation

8. **Progress tracking**:
   - Report progress after each completed task
   - Halt if any non-parallel task fails
   - For parallel tasks [P], continue with successful, report failed
   - **IMPORTANT**: Mark completed tasks as [X] in tasks.md

9. **Completion validation**:
   - Verify all required tasks completed
   - Check features match specification
   - Validate tests pass
   - Confirm follows technical plan
   - Report final status with summary

## Notes

- This assumes complete task breakdown in tasks.md
- If tasks incomplete, run `/tasks` first to regenerate
