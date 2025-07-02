import * as core from '@actions/core';
import * as github from '@actions/github';
import { sendChangelog } from './slack';
import { createList } from './parser';
import { getCommits } from './github';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';
const GITHUB_OWNER = process.env.GITHUB_OWNER || '';
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || '';


async function run() {
    const octokit = github.getOctokit(GITHUB_TOKEN);
    const commits = await getCommits(octokit, '', '', GITHUB_OWNER, GITHUB_REPOSITORY);
    if (!commits || commits.length === 0) {
        console.log('No commits found between the specified range.');
        return;
    }


    const list = createList(commits, {
        serverUrl: 'https://github.com',
        repository: `${GITHUB_OWNER}/${GITHUB_REPOSITORY}`,
        linearOrg: 'neotaste'
    })

    // Send Slack notification
    try {
        await sendChangelog({ webhookUrl: WEBHOOK_URL, list, githubInfo: { serverUrl: 'https://github.com', repository: `${GITHUB_OWNER}/${GITHUB_REPOSITORY}`, actor: 'test actor' } });
    } catch (error) {
        core.setFailed(`Failed to send Slack notification: ${error instanceof Error ? error.message : String(error)}`);
    }
}

await run()
