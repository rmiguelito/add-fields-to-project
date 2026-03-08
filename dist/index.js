"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const child_process_1 = require("child_process");
/**
 * Project field configurations. Can be loaded from environment or config files.
 * Structure supports multiple projects by extending this pattern.
 */
const FIELD_CONFIGS = {
    default: {
        status: {
            id: 'PVTSSF_lAHOAPMWaM4BRDsmzg-_3fU',
            type: 'single-select',
            required: true,
        },
        service: {
            id: 'PVTF_lAHOAPMWaM4BRDsmzg-_5KU',
            type: 'text',
        },
        'approval-url': {
            id: 'PVTF_lAHOAPMWaM4BRDsmzg_AfXo',
            type: 'text',
        },
        version: {
            id: 'PVTF_lAHOAPMWaM4BRDsmzg-_5Yw',
            type: 'text',
        },
    },
};
/**
 * Status option ID mappings. Can be extended or loaded from external config.
 */
const STATUS_OPTIONS = {
    'waiting-approval': 'f75ad846',
    deploying: '47fc9ee4',
    approved: '98236657',
    completed: 'f83c69f3',
    failed: 'b49efd60',
};
// ============================================================================
// Command Execution Utility
// ============================================================================
function run(cmd) {
    core.debug(`running: ${cmd}`);
    return (0, child_process_1.execSync)(cmd, { stdio: 'pipe' }).toString().trim();
}
// ============================================================================
// Field Type Classes
// ============================================================================
class Field {
    constructor(fieldName, fieldId, projectId, itemId) {
        this.fieldName = fieldName;
        this.fieldId = fieldId;
        this.projectId = projectId;
        this.itemId = itemId;
    }
}
class TextField extends Field {
    setValue(value) {
        if (!value || value.trim() === '') {
            core.debug(`Skipping empty text field: ${this.fieldName}`);
            return;
        }
        const escapedValue = value.replace(/"/g, '\\"');
        const cmd = `gh project item-edit --id "${this.itemId}" --field-id "${this.fieldId}" --project-id "${this.projectId}" --text "${escapedValue}"`;
        run(cmd);
        core.debug(`Updated ${this.fieldName} to "${value}"`);
    }
}
class SingleSelectField extends Field {
    constructor(fieldName, fieldId, projectId, itemId, optionMap) {
        super(fieldName, fieldId, projectId, itemId);
        this.optionMap = optionMap;
    }
    setValue(value) {
        if (!value || value.trim() === '') {
            core.debug(`Skipping empty single-select field: ${this.fieldName}`);
            return;
        }
        const optionId = this.optionMap[value];
        if (!optionId) {
            throw new Error(`Unknown option '${value}' for field '${this.fieldName}'. Available options: ${Object.keys(this.optionMap).join(', ')}`);
        }
        const cmd = `gh project item-edit --id "${this.itemId}" --field-id "${this.fieldId}" --project-id "${this.projectId}" --single-select-option-id "${optionId}"`;
        run(cmd);
        core.debug(`Updated ${this.fieldName} to "${value}" (option: ${optionId})`);
    }
}
// ============================================================================
// Field Manager
// ============================================================================
class FieldManager {
    constructor(projectId, itemId) {
        this.projectId = projectId;
        this.itemId = itemId;
        this.fields = new Map();
        this.fieldConfig = FIELD_CONFIGS[projectId] || FIELD_CONFIGS.default;
    }
    registerField(fieldName, value) {
        if (!value || value.trim() === '') {
            return;
        }
        const config = this.fieldConfig[fieldName];
        if (!config) {
            throw new Error(`Field '${fieldName}' not configured for project`);
        }
        let field;
        switch (config.type) {
            case 'text':
                field = new TextField(fieldName, config.id, this.projectId, this.itemId);
                break;
            case 'single-select':
                field = new SingleSelectField(fieldName, config.id, this.projectId, this.itemId, STATUS_OPTIONS);
                break;
            default:
                throw new Error(`Unknown field type: ${config.type}`);
        }
        this.fields.set(fieldName, field);
    }
    applyAll() {
        if (this.fields.size === 0) {
            core.debug('No fields to update');
            return;
        }
        this.fields.forEach((field, fieldName) => {
            try {
                field.setValue('');
                // The value is already captured in the field's constructor context
            }
            catch (error) {
                throw new Error(`Failed to update field '${fieldName}': ${error.message}`);
            }
        });
    }
    updateField(fieldName, value) {
        const config = this.fieldConfig[fieldName];
        if (!config) {
            throw new Error(`Field '${fieldName}' not configured for project`);
        }
        let field;
        switch (config.type) {
            case 'text':
                field = new TextField(fieldName, config.id, this.projectId, this.itemId);
                break;
            case 'single-select':
                field = new SingleSelectField(fieldName, config.id, this.projectId, this.itemId, STATUS_OPTIONS);
                break;
            default:
                throw new Error(`Unknown field type: ${config.type}`);
        }
        field.setValue(value);
    }
}
// ============================================================================
// Project Item Manager
// ============================================================================
class ProjectItemManager {
    constructor(projectNumber, projectId) {
        this.projectNumber = projectNumber;
        this.projectId = projectId;
    }
    createItem(title) {
        const escapedTitle = title.replace(/"/g, '\\"');
        const createCmd = `gh project item-create ${this.projectNumber} --owner "@me" --title "${escapedTitle}" --format json`;
        const out = run(createCmd);
        try {
            const json = JSON.parse(out);
            return json.id;
        }
        catch {
            throw new Error(`Failed to parse item creation response: ${out}`);
        }
    }
    getFieldManager(itemId) {
        return new FieldManager(this.projectId, itemId);
    }
}
// ============================================================================
// Action Runner
// ============================================================================
async function runAction() {
    try {
        // Input validation
        const projectNumber = core.getInput('project_number', { required: true });
        const projectId = core.getInput('project_id', { required: true });
        const repoName = core.getInput('repo_name', { required: true });
        const runId = core.getInput('run_id', { required: true });
        const refName = core.getInput('ref_name', { required: true });
        // Optional inputs with defaults
        let title = core.getInput('title') || `Deploy ${repoName} - Build #${runId}`;
        let service = core.getInput('service') || repoName;
        const status = core.getInput('status') || 'waiting-approval';
        const approvalUrl = core.getInput('approval_url') || '';
        let version = core.getInput('version') || refName;
        const itemId = core.getInput('item_id') || '';
        // Log input summary
        core.startGroup('deployment item details');
        core.info(`title=${title}`);
        core.info(`service=${service}`);
        core.info(`status=${status}`);
        core.info(`approval_url=${approvalUrl}`);
        core.info(`version=${version}`);
        core.info(`existing_item=${itemId}`);
        core.endGroup();
        // Create or identify the item
        const itemManager = new ProjectItemManager(projectNumber, projectId);
        let item = itemId;
        if (!item) {
            item = itemManager.createItem(title);
            core.info(`created item ${item}`);
        }
        else {
            core.info(`updating existing item ${item}`);
        }
        // Update fields
        const fieldManager = itemManager.getFieldManager(item);
        fieldManager.updateField('status', status);
        fieldManager.updateField('service', service);
        if (approvalUrl) {
            fieldManager.updateField('approval-url', approvalUrl);
        }
        fieldManager.updateField('version', version);
        core.setOutput('item-id', item);
        core.info(`item-id=${item}`);
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
runAction();
