import * as core from '@actions/core';
import * as github from '@actions/github';

export interface Commit {
    sha: string;
    shortSha: string;
    message: string;
}

export async function getCommits(
    octokit: ReturnType<typeof github.getOctokit>,
    beforeSha: string,
    afterSha: string,
    owner: string,
    repo: string
): Promise<Commit[]> {
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
            core.info('No commits found in the specified range.');
            return []
        }
        return commits.map(commit => ({
            sha: commit.sha,
            shortSha: commit.sha.substring(0, 7),
            message: commit.commit.message,
        }));
    } catch (error) {
        core.info(`Failed to fetch commits: ${error instanceof Error ? error.message : String(error)}`);
        return []
    }
}
