---
description: Execute implementation planning workflow to generate design artifacts
---

# Implementation Planning Workflow

This workflow generates implementation plan and design artifacts from a feature specification.

## Prerequisites

- Feature specification (`spec.md`) must be complete
- `.specify/memory/constitution.md` exists
- `.specify/templates/plan-template.md` exists

## Steps

1. **Setup**:
   ```powershell
   .specify/scripts/powershell/setup-plan.ps1 -Json
   ```
   - Parse JSON output for: FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH

2. **Load context**:
   - Read FEATURE_SPEC (spec.md)
   - Read `.specify/memory/constitution.md`
   - Load IMPL_PLAN template (already copied by script)

3. **Execute plan workflow**:
   - Fill Technical Context (mark unknowns as "NEEDS CLARIFICATION")
   - Fill Constitution Check section from constitution
   - Evaluate gates (ERROR if violations unjustified)
   - **Phase 0**: Generate research.md (resolve all NEEDS CLARIFICATION)
   - **Phase 1**: Generate data-model.md, contracts/, quickstart.md
   - **Phase 1**: Update agent context by running agent script
   - Re-evaluate Constitution Check post-design

4. **Stop and report**:
   - Command ends after Phase 1 planning
   - Report: branch, IMPL_PLAN path, generated artifacts

## Phase 0: Outline & Research

1. **Extract unknowns** from Technical Context:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   - For each unknown: "Research {unknown} for {feature context}"
   - For each technology: "Find best practices for {tech} in {domain}"

3. **Consolidate findings** in `research.md`:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts

**Prerequisites**: research.md complete

1. **Extract entities** from feature spec → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Agent context update**:
   ```powershell
   .specify/scripts/powershell/update-agent-context.ps1 -AgentType claude
   ```
   - Detect which AI agent is in use
   - Update appropriate agent-specific context file
   - Add only new technology from current plan
   - Preserve manual additions between markers

**Output**: data-model.md, /contracts/*, quickstart.md, agent-specific file

## Key Rules

- Use absolute paths
- ERROR on gate failures or unresolved clarifications
