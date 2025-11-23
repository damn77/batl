---
description: Perform cross-artifact consistency and quality analysis
---

# Specification Analysis Workflow

This workflow performs non-destructive analysis across spec.md, plan.md, and tasks.md to identify inconsistencies, duplications, and quality issues.

## Prerequisites

- `spec.md` must exist
- `plan.md` must exist
- `tasks.md` must exist (run after `/tasks` command)
- `.specify/memory/constitution.md` exists

## Operating Constraints

**STRICTLY READ-ONLY**: Do not modify any files. Output structured analysis report only.

**Constitution Authority**: Constitution is non-negotiable. Conflicts are automatically CRITICAL.

## Steps

1. **Initialize analysis context**:
   ```powershell
   .specify/scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks
   ```
   - Parse JSON for FEATURE_DIR and AVAILABLE_DOCS
   - Derive paths: SPEC, PLAN, TASKS
   - Abort if any required file missing

2. **Load artifacts** (minimal necessary context):
   
   **From spec.md**:
   - Overview/Context
   - Functional Requirements
   - Non-Functional Requirements
   - User Stories
   - Edge Cases
   
   **From plan.md**:
   - Architecture/stack choices
   - Data Model references
   - Phases
   - Technical constraints
   
   **From tasks.md**:
   - Task IDs, descriptions
   - Phase grouping
   - Parallel markers [P]
   - Referenced file paths
   
   **From constitution**:
   - Load `.specify/memory/constitution.md` for principles

3. **Build semantic models**:
   - Requirements inventory with stable keys
   - User story/action inventory
   - Task coverage mapping
   - Constitution rule set

4. **Detection passes** (limit to 50 findings):
   
   **A. Duplication Detection**:
   - Near-duplicate requirements
   - Mark lower-quality phrasing
   
   **B. Ambiguity Detection**:
   - Vague adjectives (fast, scalable, secure) lacking metrics
   - Unresolved placeholders (TODO, ???, <placeholder>)
   
   **C. Underspecification**:
   - Requirements missing measurable outcome
   - User stories missing acceptance criteria
   - Tasks referencing undefined files/components
   
   **D. Constitution Alignment**:
   - Conflicts with MUST principles
   - Missing mandated sections
   
   **E. Coverage Gaps**:
   - Requirements with zero tasks
   - Tasks with no mapped requirement
   - Non-functional requirements not in tasks
   
   **F. Inconsistency**:
   - Terminology drift
   - Data entities in plan but not spec
   - Task ordering contradictions
   - Conflicting requirements

5. **Severity assignment**:
   - **CRITICAL**: Violates constitution MUST, missing core artifact, zero coverage blocking functionality
   - **HIGH**: Duplicate/conflicting requirement, ambiguous security/performance, untestable criterion
   - **MEDIUM**: Terminology drift, missing non-functional coverage, underspecified edge case
   - **LOW**: Style/wording improvements, minor redundancy

6. **Produce analysis report**:
   
   ```markdown
   ## Specification Analysis Report
   
   | ID | Category | Severity | Location(s) | Summary | Recommendation |
   |----|----------|----------|-------------|---------|----------------|
   | A1 | Duplication | HIGH | spec.md:L120-134 | Two similar requirements | Merge phrasing |
   
   **Coverage Summary Table**:
   
   | Requirement Key | Has Task? | Task IDs | Notes |
   |-----------------|-----------|----------|-------|
   
   **Constitution Alignment Issues**: (if any)
   
   **Unmapped Tasks**: (if any)
   
   **Metrics**:
   - Total Requirements
   - Total Tasks
   - Coverage % (requirements with >=1 task)
   - Ambiguity Count
   - Duplication Count
   - Critical Issues Count
   ```

7. **Provide next actions**:
   - If CRITICAL: Recommend resolving before `/implement`
   - If LOW/MEDIUM: May proceed with improvement suggestions
   - Provide explicit command suggestions

8. **Offer remediation**:
   - Ask: "Would you like me to suggest concrete remediation edits for top N issues?"
   - Do NOT apply automatically

## Operating Principles

- **Minimal tokens**: Focus on actionable findings
- **Progressive disclosure**: Load incrementally
- **Token-efficient output**: Limit to 50 rows, summarize overflow
- **Deterministic**: Consistent results on reruns
- **NEVER modify files** (read-only)
- **NEVER hallucinate** missing sections
- **Prioritize constitution violations** (always CRITICAL)
- **Use examples** over generic patterns
- **Report zero issues gracefully**
