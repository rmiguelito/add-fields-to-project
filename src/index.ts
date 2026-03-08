import * as core from '@actions/core';
import { execSync } from 'child_process';

function run(cmd: string) {
  core.debug(`running: ${cmd}`);
  return execSync(cmd, { stdio: 'pipe' }).toString().trim();
}

function getStatusOptionId(status: string): string {
  switch (status) {
    case 'waiting-approval':
      return 'f75ad846';
    case 'deploying':
      return '47fc9ee4';
    case 'approved':
      return '98236657';
    case 'completed':
      return 'f83c69f3';
    case 'failed':
      return 'b49efd60';
    default:
      return '';
  }
}

async function runAction() {
  try {
    const projectNumber = core.getInput('project_number', { required: true });
    const projectId = core.getInput('project_id', { required: true });
    const repoName = core.getInput('repo_name', { required: true });
    const runId = core.getInput('run_id', { required: true });
    const refName = core.getInput('ref_name', { required: true });
    let title = core.getInput('title');
    let service = core.getInput('service');
    const status = core.getInput('status') || 'waiting-approval';
    const approvalUrl = core.getInput('approval_url');
    let version = core.getInput('version');
    const itemId = core.getInput('item_id');

    if (!service) {
      service = repoName;
    }
    if (!title) {
      title = `Deploy ${repoName} - Build #${runId}`;
    }
    if (!version) {
      version = refName;
    }

    const statusId = getStatusOptionId(status);
    if (!statusId) {
      throw new Error(`Invalid status '${status}'`);
    }

    core.startGroup('deployment item details');
    core.info(`title=${title}`);
    core.info(`service=${service}`);
    core.info(`status=${status}`);
    core.info(`approvalUrl=${approvalUrl}`);
    core.info(`version=${version}`);
    core.info(`existing item=${itemId}`);
    core.endGroup();

    let item = itemId;

    if (!item) {
      const createCmd = `gh project item-create ${projectNumber} --owner "@me" --title "${title}" --format json`;
      const out = run(createCmd);
      const json = JSON.parse(out);
      item = json.id;
      core.info(`created item ${item}`);
    }

    // always set status
    run(`gh project item-edit --id "${item}" --field-id "PVTSSF_lAHOAPMWaM4BRDsmzg-_3fU" --project-id "${projectId}" --single-select-option-id "${statusId}"`);

    if (service) {
      run(`gh project item-edit --id "${item}" --field-id "PVTF_lAHOAPMWaM4BRDsmzg-_5KU" --project-id "${projectId}" --text "${service}"`);
    }
    if (approvalUrl) {
      run(`gh project item-edit --id "${item}" --field-id "PVTF_lAHOAPMWaM4BRDsmzg_AfXo" --project-id "${projectId}" --text "${approvalUrl}"`);
    }
    if (version) {
      run(`gh project item-edit --id "${item}" --field-id "PVTF_lAHOAPMWaM4BRDsmzg-_5Yw" --project-id "${projectId}" --text "${version}"`);
    }

    core.setOutput('item-id', item);
    core.info(`item-id=${item}`);
  } catch (error) {
    core.setFailed((error as Error).message);
  }
}

runAction();