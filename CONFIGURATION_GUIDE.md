# Production Configuration Guide

This action is now production-grade and fully reusable for any GitHub Project field scenarios.

## Architecture Overview

The refactored code consists of four main components:

1. **Field Configuration System** - Centralized configuration for all field mappings
2. **Field Type Classes** - Polymorphic field handlers (TextField, SingleSelectField)
3. **FieldManager** - Orchestrates field operations
4. **ProjectItemManager** - Manages project item creation and updates

## Adding Support for New Projects

### Step 1: Add Project Configuration

Edit `src/index.ts` and add your project to the `FIELD_CONFIGS` object:

```typescript
const FIELD_CONFIGS: { [projectId: string]: ProjectFieldConfig } = {
  default: {
    // existing config
  },
  'your-project-id': {
    customField: {
      id: 'PVTF_xxxxx',
      type: 'text',
    },
    customStatus: {
      id: 'PVTSSF_xxxxx',
      type: 'single-select',
    },
  },
};
```

### Step 2: Add Status Options (if needed)

If your project uses different status options, add them to `STATUS_OPTIONS`:

```typescript
const STATUS_OPTIONS: StatusOptionConfig = {
  'option-name': 'option-id-uuid',
  // ...
};
```

## Supporting New Field Types

To add support for a new field type (e.g., dates, numbers, checkboxes):

1. Create a new Field subclass:

```typescript
class DateField extends Field {
  setValue(value: string): void {
    // Validate date format
    const cmd = `gh project item-edit --id "${this.itemId}" --field-id "${this.fieldId}" --project-id "${this.projectId}" --date "${value}"`;
    run(cmd);
  }
}
```

2. Update the switch statement in `FieldManager`:

```typescript
case 'date':
  field = new DateField(fieldName, config.id, this.projectId, this.itemId);
  break;
```

3. Update the `FieldConfig` interface:

```typescript
interface FieldConfig {
  id: string;
  type: 'single-select' | 'text' | 'date'; // Add your type
  required?: boolean;
}
```

## Usage Examples

### Basic Usage (Deployment Item)

```yaml
- uses: your-org/add-fields-to-project@v1
  with:
    project_number: '123'
    project_id: 'PVT_xxxxx'
    repo_name: 'my-repo'
    run_id: ${{ github.run_id }}
    ref_name: ${{ github.ref_name }}
    status: 'deploying'
    approval_url: 'https://github.com/org/repo/actions/runs/${{ github.run_id }}'
```

### Creating Custom Items

```yaml
- uses: your-org/add-fields-to-project@v1
  with:
    project_number: '456'
    project_id: 'PVT_yyyyy'
    repo_name: 'my-repo'
    run_id: ${{ github.run_id }}
    ref_name: ${{ github.ref_name }}
    title: 'Custom Item Title'
    service: 'custom-service'
    version: 'v1.0.0'
```

### Updating Existing Items

```yaml
- uses: your-org/add-fields-to-project@v1
  with:
    project_number: '123'
    project_id: 'PVT_xxxxx'
    repo_name: 'my-repo'
    run_id: ${{ github.run_id }}
    ref_name: ${{ github.ref_name }}
    item_id: 'PVTI_xxxxx'  # Update existing item
    status: 'completed'
```

## Error Handling

The action provides clear error messages for:

- Invalid status values
- Unconfigured fields
- Unknown field types
- Failed item creation
- Failed field updates

All errors are caught and reported through `core.setFailed()`.

## Debugging

Enable debug logging in your GitHub Actions workflow:

```yaml
env:
  ACTIONS_STEP_DEBUG: true
```

This will output detailed information about:
- Commands being executed
- Field values being set
- Configuration lookups
- Any validation errors

## Security Considerations

- Field values are properly escaped to prevent command injection
- The action uses GitHub CLI which handles authentication securely
- No sensitive data is logged (use `core.debug()` for verbose output)

## Extending for Batch Operations

The architecture supports extending for batch operations:

```typescript
const fieldManager = itemManager.getFieldManager(itemId);
fieldManager.updateField('field1', value1);
fieldManager.updateField('field2', value2);
fieldManager.updateField('field3', value3);
// All updates applied independently
```

## Testing Configuration Changes

1. Create a test GitHub Project
2. Add a test item to get field IDs
3. Update `FIELD_CONFIGS` with test values
4. Run the action and verify output

To find field IDs, use the GitHub CLI:

```bash
gh api graphql -f query='query($owner:String!, $number:Int!) {
  organization(login: $owner) {
    projectV2(number: $number) {
      fields(first: 20) {
        nodes {
          ... on ProjectV2Field { name id }
          ... on ProjectV2SingleSelectField { name id options { name id } }
        }
      }
    }
  }
}' -F owner=your-org -F number=123
```
