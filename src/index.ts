import * as core from '@actions/core';
import * as github from '@actions/github';
import { sendChangelog } from './slack';
import { createList } from './parser';
import { getCommits } from './github';

async function run(): Promise<void> {
    try {
        // Get environment variables and context
        const beforeSha = github.context.payload.before;
        const afterSha = github.context.payload.after;
        const actor = github.context.actor;
        const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
        const repository = github.context.repo.owner + '/' + github.context.repo.repo;
        const webhookUrl = core.getInput('slack-webhook-url');
        const githubToken = core.getInput('github-token');

        if (!webhookUrl || !githubToken) {
            core.setFailed('Both "slack-webhook-url" and "github-token" inputs are required.');
            return;
        }

        core.info(`Processing commits from ${beforeSha} to ${afterSha}`);

        const octokit = github.getOctokit(githubToken);

        const commits = await getCommits(octokit, beforeSha, afterSha, github.context.repo.owner, github.context.repo.repo);
        const list = createList(commits, {
            serverUrl,
            repository,
            linearOrg: 'neotaste'
        })

        // Send Slack notification
        try {
            await sendChangelog({ webhookUrl, list, githubInfo: { serverUrl, repository, actor } });
        } catch (error) {
            core.setFailed(`Failed to send Slack notification: ${error instanceof Error ? error.message : String(error)}`);
        }

        core.info('Slack notification sent successfully');

    } catch (error) {
        core.setFailed(`Action failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// Run the action
run();
