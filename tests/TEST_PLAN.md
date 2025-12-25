# Comprehensive Test Plan for CoreFlow

## Overview
This document outlines comprehensive testing strategy to ensure the system is secure, reliable, and production-ready.

## Test Categories

### 1. Security Tests
- [ ] Authentication & Authorization
- [ ] Row Level Security (RLS) policies
- [ ] SQL Injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Token validation
- [ ] Offer token expiration
- [ ] User data isolation

### 2. API Function Tests
- [ ] Candidate CRUD operations
- [ ] Job CRUD operations
- [ ] Offer creation and sending
- [ ] Offer acceptance/decline/counter
- [ ] Interview scheduling
- [ ] Email sending
- [ ] Workflow execution
- [ ] Activity logging
- [ ] Dashboard stats calculation

### 3. Workflow Engine Tests
- [ ] Placeholder replacement (all types)
- [ ] Email sending logic
- [ ] Duplicate email prevention
- [ ] Workflow conditions
- [ ] Delay execution
- [ ] Error handling

### 4. Edge Cases & Race Conditions
- [ ] Concurrent offer acceptance
- [ ] Multiple stage transitions
- [ ] Duplicate candidate creation
- [ ] Job closing with active candidates
- [ ] Offer expiration handling
- [ ] Token reuse prevention

### 5. Integration Tests
- [ ] Complete candidate journey (New → Hired)
- [ ] Offer acceptance flow
- [ ] Job closing flow
- [ ] Email workflow automation
- [ ] Activity logging flow

### 6. Data Integrity Tests
- [ ] Foreign key constraints
- [ ] Cascade deletions
- [ ] Data validation
- [ ] Required field enforcement

## Test Execution

### Run All Tests
```bash
npm test
```

### Run with UI
```bash
npm run test:ui
```

### Run with Coverage
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npm test tests/api.security.test.ts
```

## Test Coverage Goals
- **Minimum**: 80% code coverage
- **Critical Paths**: 100% coverage
- **Security Functions**: 100% coverage

## Continuous Testing
- Run tests before each commit
- Run tests in CI/CD pipeline
- Monitor test coverage trends


