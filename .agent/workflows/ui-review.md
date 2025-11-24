---
description: Review UI for localization completeness and UX clarity
---

# UI Localization and UX Review Workflow

This workflow performs a comprehensive review of the frontend application for localization completeness and user experience clarity.

## Prerequisites

- Frontend application uses react-i18next for localization
- Translation files located at `frontend/src/i18n/locales/{en,sk}.json`
- UI Framework: React Bootstrap

## Steps

### 1. Load Review Tracking

Read the tracking file at `frontend/src/i18n/.ui-review-status.json` to determine which files have been reviewed and when.

**Tracking file format:**
```json
{
  "lastFullReview": "2025-01-15T10:30:00Z",
  "files": {
    "src/components/NavBar.jsx": {
      "lastReviewed": "2025-01-15T10:30:00Z",
      "status": "complete"
    }
  }
}
```

### 2. Identify Files to Review

Find all frontend component files:
- `frontend/src/components/**/*.jsx` - UI components
- `frontend/src/pages/**/*.jsx` - Page components

Compare file modification times (`mtime`) with `lastReviewed` timestamps to skip unmodified files.

### 3. Quick Scan for Hardcoded Strings

Use grep to search for hardcoded strings in remaining files:
- Search for quoted strings in `.jsx` files
- Identify files with hardcoded text
- Skip obvious cases:
  - Console.log/error strings
  - CSS class names
  - Import paths
  - Already using `t()` function

### 4. Perform Localization Audit

For each file with hardcoded strings, identify:
- **Hardcoded strings** that should be moved to translation files
- **Missing translations** in locale files
- **Inconsistent key naming** in translation files
- **Untranslated dynamic content** (error messages, validation messages, toast notifications)

### 5. Review Text Clarity

For each user-facing text, evaluate:
- **Clarity**: Is the message immediately understandable?
- **Consistency**: Are similar actions described the same way?
- **Tone**: Is the language professional and appropriate?
- **Actionability**: Do error messages tell users what to do next?
- **Brevity**: Can the message be shorter without losing meaning?

### 6. Identify In-App Guidance Opportunities

Look for UI areas where users would benefit from contextual help:
- **Tooltips** - Hover hints for icons, buttons, or complex fields
- **Help icons (?)** - Clickable icons that reveal explanations
- **Expandable sections** - "Learn more" or "How does this work?" collapsible content
- **Inline hints** - Small helper text below form fields
- **Info banners** - Contextual guidance for complex workflows
- **First-time user hints** - Onboarding popovers for new features

Focus on places with:
- Forms with non-obvious validation rules
- Business logic constraints (eligibility, limits, restrictions)
- Multi-step processes where users need orientation
- Actions with significant consequences
- Features that differ based on user role

### 7. Extract and Replace Hardcoded Strings

For each file with hardcoded strings:

**a. Add import (if missing):**
```jsx
import { useTranslation } from 'react-i18next';
```

**b. Add hook (if missing):**
```jsx
const { t } = useTranslation();
```

**c. Replace strings - Common patterns:**
```jsx
// Before → After
<h1>Page Title</h1> → <h1>{t('pages.section.title')}</h1>
<Button>Save</Button> → <Button>{t('common.save')}</Button>
placeholder="Search..." → placeholder={t('placeholders.search')}
title="Help" → title={t('common.help')}
<Alert>Message</Alert> → <Alert>{t('alerts.message')}</Alert>
```

**d. Update locale files:**
Add new keys to both `frontend/src/i18n/locales/en.json` and `frontend/src/i18n/locales/sk.json`

### 8. Generate Report

Create a structured report with the following sections:

#### Localization Report
```markdown
## Files Requiring Localization

### [filename.jsx]
- Line X: "Hardcoded text here" → Suggested key: `section.keyName`
- Line Y: "Another string" → Suggested key: `section.anotherKey`

## Missing Translations
Keys present in en.json but missing from sk.json:
- `key.name`

## Proposed New Translation Keys
```json
{
  "section": {
    "keyName": "English text",
    "anotherKey": "More text"
  }
}
```
```

#### Text Clarity Improvements
```markdown
## Suggested Improvements

### [filename.jsx]
| Current Text | Issue | Suggested Improvement |
|-------------|-------|----------------------|
| "Error" | Too vague | "Unable to save changes. Please try again." |
| "Submit" | Generic | "Register for Tournament" (context-specific) |
```

#### In-App Guidance Recommendations
```markdown
## UI Hints and Guides to Add

### [Feature/Component]
**Location**: filename.jsx:lineNumber
**User Need**: [What users might not understand]
**Recommended UI Element**:
- Type: [Tooltip / Help icon / Expandable section / Inline hint / Info banner]
- Placement: [Where in the UI]
- Content: "[Suggested help text]"
- Trigger: [Hover / Click / Always visible]

**Example Implementation**:
```jsx
<OverlayTrigger
  placement="top"
  overlay={<Tooltip>{t('help.fieldExplanation')}</Tooltip>}
>
  <span className="ms-1 text-muted" style={{cursor: 'help'}}>
    <i className="bi bi-question-circle"></i>
  </span>
</OverlayTrigger>
```
```

### 9. Update Review Tracking

Update `frontend/src/i18n/.ui-review-status.json` with current timestamps for reviewed files.

## Priority Indicators

Mark findings with priority:
- 🔴 **HIGH**: User-facing errors, critical flows, accessibility issues
- 🟡 **MEDIUM**: Common user interactions, form labels, navigation
- 🟢 **LOW**: Admin-only features, tooltips, secondary text

## Token Efficiency Tips

1. **Use Grep first** - Search for patterns instead of reading entire files
2. **Batch output** - Use concise format: `File:Line | "text" | suggested.key`
3. **Skip obvious cases** - Console logs, CSS classes, imports, existing `t()` calls
4. **Incremental review** - Only process modified files
5. **Batch edits** - Process multiple strings per file in single edit when possible
