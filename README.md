# Add Fields to Project

A production-grade GitHub Action for creating and updating GitHub Project items with custom fields. Fully reusable across any GitHub Projects and extensible for any field types.

## Features

✨ **Production-Grade Architecture**
- Centralized field configuration system
- Polymorphic field type handlers (Text, SingleSelect, Date, etc.)
- Comprehensive error handling and validation
- Command injection protection

🔧 **Reusable & Extensible**
- Support for multiple projects with different field configurations
- Easy to add new field types by extending Field classes
- Configuration-driven approach (no hardcoded field IDs)
- Supports batch field updates

📋 **GitHub Projects Integration**
- Create new project items
- Update existing items with multiple field updates
- Support for single-select (status) and text fields
- Automatic field value escaping

## Quick Start

### Basic Usage

```yaml
- uses: your-org/add-fields-to-project@v1
  with:
    project_number: '123'
    project_id: 'PVT_xxxxx'
    repo_name: 'my-repo'
    run_id: ${{ github.run_id }}
    ref_name: ${{ github.ref_name }}
    status: 'waiting-approval'
```

### Create and Update Item

```yaml
# Step 1: Create item
- name: Create Deployment Request
  id: create
  uses: your-org/add-fields-to-project@v1
  with:
    project_number: '123'
    project_id: 'PVT_xxxxx'
    repo_name: 'my-repo'
    run_id: ${{ github.run_id }}
    ref_name: ${{ github.ref_name }}
    title: 'Deployment: my-repo - Build #${{ github.run_number }}'
    status: 'waiting-approval'

# Step 2: Update the same item
- name: Mark as Completed
  uses: your-org/add-fields-to-project@v1
  with:
    project_number: '123'
    project_id: 'PVT_xxxxx'
    repo_name: 'my-repo'
    run_id: ${{ github.run_id }}
    ref_name: ${{ github.ref_name }}
    item_id: ${{ steps.create.outputs.item-id }}
    status: 'completed'
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `project_number` | ✅ | - | Numeric ID of the GitHub Project |
| `project_id` | ✅ | - | GraphQL ID of the GitHub Project |
| `repo_name` | ✅ | - | Repository name (used as service value) |
| `run_id` | ✅ | - | GitHub Actions run ID |
| `ref_name` | ✅ | - | Branch or tag name |
| `title` | | `Deploy {repo_name} - Build #{run_id}` | Item title |
| `service` | | `{repo_name}` | Service name for the deployment |
| `status` | | `waiting-approval` | Item status |
| `approval_url` | | - | URL for approval/deployment link |
| `version` | | `{ref_name}` | Version string |
| `item_id` | | - | Existing item ID to update |

## Outputs

| Output | Description |
|--------|-------------|
| `item-id` | ID of the created or updated project item |

## Default Statuses

The action supports these statuses by default:

- `waiting-approval` - Initial deployment request
- `deploying` - Deployment in progress
- `approved` - Deployment approved
- `completed` - Deployment finished successfully
- `failed` - Deployment failed

## Example Workflows

Complete working examples are available in `.github/workflows/`:

1. **[test-deployment.yml](https://github.com/your-org/add-fields-to-project/blob/main/.github/workflows/test-deployment.yml)** - Basic deployment workflow
2. **[advanced-deployment.yml](https://github.com/your-org/add-fields-to-project/blob/main/.github/workflows/advanced-deployment.yml)** - Multi-stage deployment with approval

See [Workflow Guide](.github/workflows/README.md) for detailed instructions.

## Configuration

### Getting Project IDs

**Project Number** - visible in your project URL:
```
https://github.com/orgs/YOUR_ORG/projects/123
                                             ↑
                                       Project Number
```

**Project GraphQL ID** - use GitHub CLI:
```bash
gh api graphql -f query='
query($owner:String!, $number:Int!) {
  organization(login: $owner) {
    projectV2(number: $number) {
      id
    }
  }
}' -F owner=YOUR_ORG -F number=PROJECT_NUMBER
```

### Extending to New Projects

Edit `src/index.ts` and add your project configuration:

```typescript
const FIELD_CONFIGS: { [projectId: string]: ProjectFieldConfig } = {
  default: { /* existing */ },
  'your-project-id': {
    customField: {
      id: 'PVTF_xxxxx',
      type: 'text',
    },
  },
};
```

### Adding New Field Types

Create a new Field subclass:

```typescript
class DateField extends Field {
  setValue(value: string): void {
    const cmd = `gh project item-edit --id "${this.itemId}" --field-id "${this.fieldId}" --project-id "${this.projectId}" --date "${value}"`;
    run(cmd);
  }
}
```

For complete details, see [CONFIGURATION_GUIDE.md](CONFIGURATION_GUIDE.md).

## Architecture

The action uses a clean, extensible architecture:

```
┌─────────────────────────────────────────┐
│         Action Runner (runAction)       │
└────────────┬────────────────────────────┘
             │
             ├──────────────────────────────┐
             ▼                              ▼
    ┌──────────────────┐         ┌──────────────────┐
    │ ProjectItemMgr   │         │  FieldManager    │
    │  - create       │         │  - updateField   │
    │  - getFieldMgr   │         │  - registerField │
    └──────────────────┘         └────────┬─────────┘
                                          │
                       ┌──────────────────┴──────────────────┐
                       ▼                                      ▼
                  ┌─────────────┐                    ┌──────────────────┐
                  │  TextField  │                    │ SingleSelectField│
                  │  - setValue │                    │  - setValue      │
                  └─────────────┘                    └──────────────────┘
```

### Key Components

- **Field Configuration** (`FIELD_CONFIGS`) - Centralized field mappings
- **Status Options** (`STATUS_OPTIONS`) - Status to option ID mappings
- **Field Classes** - Polymorphic handlers for different field types
- **FieldManager** - Orchestrates field operations
- **ProjectItemManager** - Handles item creation and retrieval
- **Action Runner** - Main entry point with input validation

## Error Handling

The action provides clear error messages for:

- Invalid status values
- Unconfigured fields
- Unknown field types
- Failed item creation
- Failed field updates

Enable debug logging:
```yaml
env:
  ACTIONS_STEP_DEBUG: true
```

## Security

- ✅ Field values are properly escaped to prevent command injection
- ✅ Uses GitHub CLI for secure authentication
- ✅ Sensitive data not logged (use debug mode for verbose output)
- ✅ Validates all inputs before execution

## Development

### Build
```bash
npm install
npm run build
```

### Compile TypeScript
```bash
npm run build
```

The compiled output is generated in `dist/index.js`.

## Contributing

Contributions are welcome! Please ensure:

1. Changes maintain backward compatibility
2. New field types follow the Field class pattern
3. All changes are TypeScript
4. Compiled output is updated

## License

MIT

## Support

For issues, questions, or contributions:

1. Check [CONFIGURATION_GUIDE.md](CONFIGURATION_GUIDE.md) for configuration help
2. Review [Workflow Guide](.github/workflows/README.md) for usage examples
3. Check existing issues on GitHub
4. Create a new issue with detailed information

## See Also

- [GitHub Projects Documentation](https://docs.github.com/en/issues/planning-and-tracking-with-projects)
- [GitHub CLI Reference](https://cli.github.com/manual/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
