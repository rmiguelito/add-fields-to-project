# Testing the Action with Example Workflows

This directory contains example workflows demonstrating how to use the `add-fields-to-project` action in different scenarios.

## Available Workflows

### 1. Test Deployment Workflow
**File:** `.github/workflows/test-deployment.yml`

A straightforward workflow that demonstrates the basic action flow:
- ✅ Checkout code
- ✅ Run build
- ✅ Create deployment item (status: `waiting-approval`)
- ✅ Simulate approval and tag generation
- ✅ Update item to `completed`

**Use case:** Simple deployments with approval gates

**How to run:**
1. Go to **Actions** tab → **Test Deployment Workflow**
2. Click **Run workflow**
3. Fill in required inputs:
   - **project_number**: The numeric ID of your GitHub Project
   - **project_id**: The GraphQL ID of your project (see below)
   - **environment**: *(optional)* Deployment environment name
4. Click **Run workflow**

### 2. Advanced Deployment Workflow
**File:** `.github/workflows/advanced-deployment.yml`

A comprehensive workflow showing multiple status transitions:
- ✅ Checkout code
- ✅ Build application
- ✅ Create deployment request (status: `waiting-approval`)
- ✅ Simulate approval and tag generation
- ✅ Update to `deploying` status
- ✅ Deploy application
- ✅ Update to `completed` status
- ✅ Automatic failure handling (updates to `failed` if any step fails)

**Use case:** Production deployments with multiple status stages

**How to run:**
1. Go to **Actions** tab → **Advanced Deployment Workflow**
2. Click **Run workflow**
3. Fill in required inputs:
   - **project_number**: The numeric ID of your GitHub Project
   - **project_id**: The GraphQL ID of your project
4. Click **Run workflow**

## Getting Your Project IDs

### Project Number
The numeric ID visible in your project URL:
```
https://github.com/orgs/YOUR_ORG/projects/123
                                         ↑
                                    Project Number (123)
```

### Project GraphQL ID
Use GitHub CLI to get the GraphQL ID:

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

Then copy the `id` value (looks like: `PVT_kwDOBrFjxs4AAPxx`)

## Workflow Outputs

Both workflows create a deployment item with the following information:

| Field | Value |
|-------|-------|
| **Title** | Auto-generated from repo and build number |
| **Service** | Repository name or custom service name |
| **Status** | Progresses through: `waiting-approval` → `deploying` → `completed` (or `failed`) |
| **Version** | Git ref name or custom version string |
| **Approval URL** | Link to the GitHub Actions run |

## Customizing the Workflows

### Change Service Name
Edit the workflow and modify the `service` input:
```yaml
service: 'my-custom-service-name'
```

### Add More Status Transitions
Add additional action calls with different statuses:
```yaml
- name: Update to Approved Status
  uses: ./
  with:
    # ... other inputs
    item_id: ${{ steps.create_item.outputs.item-id }}
    status: 'approved'  # or any configured status
```

### Add Conditions
Update step based on specific conditions:
```yaml
- name: Update to Completed
  if: success()  # Only run if all previous steps succeeded
  uses: ./
  with:
    # ... other inputs
    status: 'completed'
```

### Set Custom Version
Use dynamic version strings:
```yaml
version: 'v${{ github.run_number }}-${{ github.sha }}'
```

## Available Status Values

By default, the action supports these status options (defined in `src/index.ts`):

- `waiting-approval` - Initial deployment request
- `deploying` - Deployment in progress
- `approved` - Deployment approved
- `completed` - Deployment finished successfully
- `failed` - Deployment failed

To add more statuses, edit `STATUS_OPTIONS` in `src/index.ts` and rebuild.

## Troubleshooting

### Workflow doesn't start
- Check that you have the required permissions (projects: write)
- Ensure the action is available in your repository

### Item not created
- Verify the project number and GraphQL ID are correct
- Check that you have write access to the GitHub Project
- Look at the workflow logs for detailed error messages

### Field values not updating
- Make sure the field IDs in `src/index.ts` match your project's fields
- Check that the item ID is being captured correctly from previous steps
- Review the action debug logs (enable with `ACTIONS_STEP_DEBUG: true`)

## Real-World Examples

### Example 1: Slack Notification on Completion
```yaml
- name: Notify Slack
  if: success()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
      -d '{"text": "✅ Deployment completed - Item: ${{ steps.create_item.outputs.item-id }}"}'
```

### Example 2: Manual Approval Step
```yaml
- name: Wait for Approval
  uses: trstringer/manual-approval@v1
  with:
    repo-token: ${{ secrets.GITHUB_TOKEN }}
    approvers: 'lead-dev,devops-team'

- name: Deploy After Approval
  uses: ./
  with:
    item_id: ${{ steps.create_item.outputs.item-id }}
    status: 'approved'
```

### Example 3: Multi-Environment Deployment
```yaml
- name: Deploy to ${{ matrix.environment }}
  strategy:
    matrix:
      environment: [staging, production]
  uses: ./
  with:
    service: 'my-service-${{ matrix.environment }}'
    version: '${{ github.ref_name }}-${{ matrix.environment }}'
```

## Next Steps

1. Copy one of these workflows to your repository
2. Get your project IDs
3. Run the workflow manually from the Actions tab
4. Monitor the project item being created and updated
5. Customize fields in `FIELD_CONFIGS` for your use case
6. Link workflows to real deployment processes

For more information on extending the action, see [CONFIGURATION_GUIDE.md](../CONFIGURATION_GUIDE.md).
