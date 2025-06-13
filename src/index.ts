import * as core from '@actions/core';
import * as github from '@actions/github';
import { sendSlackMessage } from './slack';

async function run(): Promise<void> {
    try {
        // Get environment variables and context
        const beforeSha = github.context.payload.before;
        const afterSha = github.context.payload.after;
        const actor = github.context.actor;
        const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
        const repository = github.context.repo.owner + '/' + github.context.repo.repo;
        const slackWebhookUrl = core.getInput('slack-webhook-url') || process.env.SLACK_WEBHOOK_URL;
        const githubToken = core.getInput('github-token') || process.env.GITHUB_TOKEN;

        if (!slackWebhookUrl) {
            core.setFailed('SLACK_WEBHOOK_URL is required');
            return;
        }

        if (!githubToken) {
            core.setFailed('GITHUB_TOKEN is required');
            return;
        }

        core.info(`Processing commits from ${beforeSha} to ${afterSha}`);

        // Create GitHub client
        const octokit = github.getOctokit(githubToken);

        // Generate changelog using GitHub API
        const changelog = await generateChangelog(
            octokit,
            beforeSha,
            afterSha,
            serverUrl,
            repository,
            github.context.repo.owner,
            github.context.repo.repo
        );

        // Send Slack notification
        try {
            await sendSlackMessage({
                webhookUrl: slackWebhookUrl,
                blocks: [
                    {
                        type: "header",
                        text: {
                            type: "plain_text",
                            text: "Automatic release changelog 🚀",
                            emoji: true
                        }
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: changelog
                        }
                    },
                    {
                        type: "context",
                        elements: [
                            {
                                type: "mrkdwn",
                                text: `Deployed by: ${actor} | <${serverUrl}/${repository}/tree/main|Github>`
                            }
                        ]
                    }
                ]
            });
        } catch (error) {
            core.setFailed(`Failed to send Slack notification: ${error instanceof Error ? error.message : String(error)}`);
        }

        core.info('Slack notification sent successfully');

    } catch (error) {
        core.setFailed(`Action failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function generateChangelog(
    octokit: ReturnType<typeof github.getOctokit>,
    beforeSha: string,
    afterSha: string,
    serverUrl: string,
    repository: string,
    owner: string,
    repo: string
): Promise<string> {
    try {
        core.info(`Fetching commits between ${beforeSha} and ${afterSha}`);

        // Get the comparison between the two commits
        const comparison = await octokit.rest.repos.compareCommits({
            owner,
            repo,
            base: beforeSha,
            head: afterSha
        });

        const commits = comparison.data.commits;

        if (!commits || commits.length === 0) {
            return "No changes found in this deployment";
        }

        const changelogEntries: string[] = [];

        for (const commit of commits) {
            const commitHash = commit.sha;
            let commitMsg = commit.commit.message.split('\n')[0]; // Get first line only
            const shortHash = commitHash.substring(0, 7);
            const commitLink = `${serverUrl}/${repository}/commit/${commitHash}`;
            if(!commitMsg) {
                core.warning(`Commit message is empty for commit ${commitHash}`);
                commitMsg = `Commit ${shortHash} has no message`;
                continue;
            }

            // Check if commit message starts with a Linear ticket ID
            const linearTicketRegex = /^[A-Z]+-[0-9]+/;
            const ticketMatch = commitMsg.match(linearTicketRegex);

            if (ticketMatch) {
                const ticket = ticketMatch[0];
                const ticketLink = `<https://linear.app/neotaste/issue/${ticket}|${ticket}>`;

                // Replace the ticket ID with the Slack-formatted link
                const colonIndex = commitMsg.indexOf(':');
                if (colonIndex !== -1) {
                    const restOfMsg = commitMsg.substring(colonIndex);
                    const formattedMsg = `${ticketLink}${restOfMsg}`;
                    changelogEntries.push(`- ${formattedMsg} (<${commitLink}|${shortHash}>)`);
                } else {
                    changelogEntries.push(`- ${ticketLink} (<${commitLink}|${shortHash}>)`);
                }
            } else {
                changelogEntries.push(`- ${commitMsg} (<${commitLink}|${shortHash}>)`);
            }
        }

        return changelogEntries.length > 0 ? changelogEntries.join('\n') : "No changes found in this deployment";

    } catch (error) {
        core.warning(`Failed to generate changelog: ${error}`);
        return "Failed to generate changelog";
    }
}

// Run the action
run();

