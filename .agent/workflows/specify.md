---
description: Create or update feature specification from natural language description
---

# Feature Specification Workflow

This workflow creates a new feature specification from a natural language description.

## Prerequisites

- Feature description provided by user
- `.specify/scripts/powershell/` directory exists
- `.specify/templates/spec-template.md` exists

## Steps

1. **Generate short name** (2-4 words) for the feature branch:
   - Analyze feature description and extract meaningful keywords
   - Use action-noun format (e.g., "add-user-auth", "fix-payment-bug")
   - Keep concise but descriptive

2. **Check for existing branches**:
   ```powershell
   git fetch --all --prune
   ```

3. **Find highest feature number** for this short-name:
   - Check remote branches: `git ls-remote --heads origin | grep -E 'refs/heads/[0-9]+-<short-name>$'`
   - Check local branches: `git branch | grep -E '^[* ]*[0-9]+-<short-name>$'`
   - Check specs directories: Look for `specs/[0-9]+-<short-name>`
   - Use next available number (highest + 1)

4. **Run feature creation script**:
   ```powershell
   .specify/scripts/powershell/create-new-feature.ps1 -Json -Number <N> -ShortName "<short-name>" "<feature description>"
   ```
   - Parse JSON output for BRANCH_NAME and SPEC_FILE paths

5. **Load spec template**:
   - Read `.specify/templates/spec-template.md`

6. **Generate specification** following this flow:
   - Parse user description
   - Extract key concepts: actors, actions, data, constraints
   - For unclear aspects, make informed guesses (document in Assumptions)
   - Limit [NEEDS CLARIFICATION] markers to maximum 3 critical items
   - Fill User Scenarios & Testing section
   - Generate Functional Requirements (must be testable)
   - Define Success Criteria (measurable, technology-agnostic)
   - Identify Key Entities (if data involved)

7. **Write specification** to SPEC_FILE using template structure

8. **Validate specification quality**:
   - Create checklist at `FEATURE_DIR/checklists/requirements.md`
   - Check for:
     - No implementation details (languages, frameworks, APIs)
     - Focused on user value and business needs
     - All requirements testable and unambiguous
     - Success criteria measurable and technology-agnostic
     - No [NEEDS CLARIFICATION] markers remain (or max 3)

9. **Handle clarifications** (if needed):
   - Present each clarification with 3 suggested options
   - Wait for user responses
   - Update spec with chosen answers
   - Re-validate

10. **Report completion**:
    - Branch name
    - Spec file path
    - Checklist results
    - Readiness for next phase (`/plan` or `/clarify`)

## Guidelines

- Focus on **WHAT** users need and **WHY**
- Avoid HOW to implement (no tech stack, APIs, code structure)
- Written for business stakeholders, not developers
- Make informed guesses, document assumptions
- Maximum 3 [NEEDS CLARIFICATION] markers for critical decisions only

## Success Criteria Guidelines

Success criteria must be:
- **Measurable**: Include specific metrics (time, percentage, count)
- **Technology-agnostic**: No frameworks, languages, databases
- **User-focused**: Outcomes from user/business perspective
- **Verifiable**: Can be tested without knowing implementation

**Good examples**:
- "Users can complete checkout in under 3 minutes"
- "System supports 10,000 concurrent users"
- "95% of searches return results in under 1 second"

**Bad examples**:
- "API response time is under 200ms" (too technical)
- "Database can handle 1000 TPS" (implementation detail)
- "React components render efficiently" (framework-specific)
