# Testing

## Testing Strategy

The PRS project uses a combination of automated testing and manual testing to ensure quality and reliability.

## Backend Testing

### Testing Framework

- **pytest**: Primary testing framework
- **pytest-django**: Django integration for pytest
- **pytest-cov**: Code coverage reporting

### Test Structure

Tests are organized by app in `tests/` directories:

```
Backend/
├── purchase_requests/
│   └── tests/
│       ├── test_models.py
│       ├── test_views.py
│       ├── test_services.py
│       └── test_serializers.py
├── accounts/
│   └── tests.py
└── audit/
    └── tests.py
```

### Running Tests

#### Run All Tests

```bash
cd Backend
pytest
```

#### Run Tests for Specific App

```bash
pytest purchase_requests/tests/
```

#### Run Specific Test File

```bash
pytest purchase_requests/tests/test_models.py
```

#### Run Specific Test

```bash
pytest purchase_requests/tests/test_models.py::test_purchase_request_creation
```

#### Run with Coverage

```bash
pytest --cov=purchase_requests --cov-report=html
```

This generates an HTML coverage report in `htmlcov/`.

### Test Types

#### Model Tests

Test model validation, methods, and relationships:

```python
def test_purchase_request_creation():
    """Test creating a purchase request"""
    team = Team.objects.create(name="Test Team")
    user = User.objects.create_user(username="testuser")
    status = get_draft_status()
    
    request = PurchaseRequest.objects.create(
        requestor=user,
        team=team,
        status=status,
        vendor_name="Test Vendor",
        vendor_account="123456",
        subject="Test Request",
        description="Test Description",
        purchase_type=get_purchase_type_lookup("GOODS")
    )
    
    assert request.status.code == "DRAFT"
    assert request.requestor == user
```

#### View/API Tests

Test API endpoints and responses:

```python
def test_create_purchase_request(client, user, team):
    """Test POST /api/prs/requests/"""
    client.force_authenticate(user=user)
    
    response = client.post('/api/prs/requests/', {
        'team': str(team.id),
        'vendor_name': 'Test Vendor',
        # ... other fields
    })
    
    assert response.status_code == 201
    assert response.data['vendor_name'] == 'Test Vendor'
```

#### Service Tests

Test business logic in services:

```python
def test_workflow_progression(approver, request):
    """Test workflow step progression"""
    # Approve at step 1
    services.approve_request(request, approver)
    
    # Check if moved to next step
    assert request.current_template_step.step_order == 2
```

### Test Fixtures

Use pytest fixtures for common test data:

```python
@pytest.fixture
def user():
    return User.objects.create_user(username="testuser")

@pytest.fixture
def team():
    return Team.objects.create(name="Test Team")
```

### Test Database

- Tests use a separate test database
- Database is created and destroyed for each test run
- Use `@pytest.mark.django_db` decorator for database access

## Frontend Testing

### Testing Framework

- **Vitest**: Test runner (configured in `vite.config.ts`)
- **React Testing Library**: Component testing utilities

### Running Tests

```bash
cd Frontend
npm test
```

### Test Structure

Frontend tests are co-located with components or in `__tests__/` directories.

### Component Tests

```typescript
import { render, screen } from '@testing-library/react';
import { PurchaseRequestForm } from './PurchaseRequestForm';

test('renders purchase request form', () => {
  render(<PurchaseRequestForm />);
  expect(screen.getByText('Create Request')).toBeInTheDocument();
});
```

## End-to-End Testing

### E2E Test Scenarios

See `PRS_E2E_TEST_SCENARIOS.md` for comprehensive E2E test scenarios.

### Manual E2E Testing

1. **Request Creation Flow**:
   - Create a new request
   - Fill all required fields
   - Upload attachments
   - Submit request
   - Verify status change

2. **Approval Flow**:
   - Login as approver
   - View inbox
   - Approve request
   - Verify workflow progression

3. **Finance Completion Flow**:
   - Login as finance reviewer
   - View finance inbox
   - Complete request
   - Verify completion email

### Automated E2E Tests

E2E tests can be run using:

```bash
cd Backend
python manage.py test_prs_e2e
```

## Manual Testing Scenarios

See `Manual Test scenarios/` directory for detailed manual test scenarios:

- **Admin user visibility.md**: Admin access and visibility tests
- **Admin: Team management.md**: Team CRUD operations
- **Create new purchase request.md**: Request creation flow
- **User Authentication & Role-Based Access.md**: Auth and permissions
- **Workflow.md**: Workflow progression tests

## Test Coverage Goals

- **Backend**: Aim for 80%+ code coverage
- **Frontend**: Focus on critical user flows
- **Services**: 100% coverage for business logic
- **Models**: Test all validations and methods

## Continuous Integration

### CI Configuration

See `Backend/ci.yml` for GitHub Actions CI configuration.

CI runs:
- Code formatting checks (Black)
- Linting (flake8)
- Security scanning (bandit, safety)
- Type checking
- Build verification
- Migration checks
- Test execution

## Test Data Management

### Seed Data

Use management commands to create test data:

```bash
python manage.py seed_lookup_types
```

### Test Fixtures

Create fixtures for consistent test data:

```python
# fixtures/test_data.json
{
  "model": "teams.team",
  "pk": "123e4567-e89b-12d3-a456-426614174000",
  "fields": {
    "name": "Test Team",
    "is_active": true
  }
}
```

Load fixtures:

```bash
python manage.py loaddata fixtures/test_data.json
```

## Best Practices

### Backend Testing

1. **Isolate Tests**: Each test should be independent
2. **Use Fixtures**: Reuse common test data
3. **Test Edge Cases**: Test validation errors, boundary conditions
4. **Mock External Services**: Mock email sending, file storage
5. **Test Permissions**: Verify role-based access control

### Frontend Testing

1. **Test User Interactions**: Click, type, submit
2. **Test Error States**: Error messages, validation
3. **Test Loading States**: Loading indicators, async operations
4. **Test Accessibility**: ARIA labels, keyboard navigation
5. **Mock API Calls**: Use MSW or similar for API mocking

## Debugging Tests

### Backend

```bash
# Run with verbose output
pytest -v

# Run with print statements
pytest -s

# Run with debugger
pytest --pdb
```

### Frontend

```bash
# Run in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

## Related Documentation

- [Development Setup](05-Development-Setup.md) - Setting up test environment
- [Backend Overview](07-Backend-Overview.md) - Backend structure
- [Frontend Overview](11-Frontend-Overview.md) - Frontend structure
- [Troubleshooting](22-Troubleshooting.md) - Common test issues



