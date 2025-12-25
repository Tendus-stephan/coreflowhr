# CoreFlow Test Suite

## Overview

This test suite provides comprehensive testing for the CoreFlow application, ensuring security, reliability, and production-readiness.

## Test Structure

```
tests/
├── setup.ts                    # Test configuration and mocks
├── TEST_PLAN.md                # Comprehensive test plan
├── api.security.test.ts        # Security and authorization tests
├── offers.test.ts              # Offer management tests
├── workflow-engine.test.ts     # Workflow engine tests
├── candidate-stages.test.ts    # Candidate stage transition tests
├── job-management.test.ts      # Job closing/deletion tests
├── activity-logging.test.ts    # Activity logging tests
├── race-conditions.test.ts     # Race condition and deadlock tests
└── integration.test.ts         # End-to-end integration tests
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Tests with UI
```bash
npm run test:ui
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npm test tests/offers.test.ts
```

### Run Tests Matching Pattern
```bash
npm test -- -t "offer acceptance"
```

## Test Categories

### 1. Security Tests (`api.security.test.ts`)
- Authentication and authorization
- Row Level Security (RLS) policies
- Token validation
- Input sanitization
- SQL injection prevention
- XSS prevention

### 2. Offer Management Tests (`offers.test.ts`)
- Offer creation and validation
- Offer sending with token generation
- Offer acceptance/decline/counter
- Placeholder replacement
- Token security

### 3. Workflow Engine Tests (`workflow-engine.test.ts`)
- Placeholder replacement (all types)
- Duplicate email prevention
- Workflow conditions
- Delay execution
- Error handling

### 4. Candidate Stage Tests (`candidate-stages.test.ts`)
- Valid stage transitions
- Invalid stage transitions
- Automatic stage updates
- Workflow execution on stage change

### 5. Job Management Tests (`job-management.test.ts`)
- Job closing with confirmation
- Job deletion
- Filtering closed jobs
- Metrics exclusion

### 6. Activity Logging Tests (`activity-logging.test.ts`)
- Job activity logging
- Candidate activity logging
- Offer activity logging
- Activity feed display

### 7. Race Condition Tests (`race-conditions.test.ts`)
- Concurrent offer acceptance
- Concurrent stage updates
- Email sending race conditions
- Database deadlock prevention
- Optimistic locking

### 8. Integration Tests (`integration.test.ts`)
- Complete candidate journey
- Offer acceptance flow
- Job closing flow
- Email workflow automation
- Error handling

## Test Coverage Goals

- **Minimum Coverage**: 80%
- **Critical Paths**: 100%
- **Security Functions**: 100%

## Writing New Tests

### Test Structure
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Specific Functionality', () => {
    it('should do something', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = processInput(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Clear Names**: Use descriptive test names
3. **Arrange-Act-Assert**: Follow AAA pattern
4. **Mock External Dependencies**: Mock Supabase, API calls, etc.
5. **Test Edge Cases**: Include boundary conditions
6. **Test Error Cases**: Verify error handling

## Continuous Testing

Tests should be run:
- Before each commit
- In CI/CD pipeline
- Before deployment
- After major changes

## Troubleshooting

### Tests Not Running
- Ensure dependencies are installed: `npm install`
- Check Node.js version (requires Node 18+)
- Verify Vitest is installed: `npm list vitest`

### Mock Issues
- Check `tests/setup.ts` for mock configuration
- Verify mock paths match actual import paths
- Clear cache: `npm test -- --no-cache`

### Coverage Issues
- Ensure `@vitest/coverage-v8` is installed
- Check `vitest.config.ts` coverage configuration
- Run with `--coverage` flag

## Next Steps

1. Run all tests: `npm test`
2. Review coverage: `npm run test:coverage`
3. Fix any failing tests
4. Add tests for new features
5. Maintain 80%+ coverage


