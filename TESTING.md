# Testing Guide

This document outlines how to run tests for the BATL project.

## Prerequisites

Ensure you have the dependencies installed:

```bash
npm install
```

## Running Tests

### Backend Tests

To run the backend test suite:

```bash
npm run test
```

To run tests with coverage:

```bash
npm run test:coverage
```

### Linting

To check for code style and potential errors:

```bash
npm run lint
```

To automatically fix linting issues:

```bash
npm run lint:fix
```

## Test Structure

Tests are located in the `tests/` directory (or adjacent to source files in `__tests__` folders).

- **Unit Tests**: Test individual functions and classes in isolation.
- **Integration Tests**: Test API endpoints and database interactions.

## CI/CD Pipeline

Tests are automatically run on every Pull Request via GitHub Actions. The pipeline performs the following checks:
1. Linting
2. Unit & Integration Tests
3. Build Verification
