import type { Commit } from "./github";
import type { CreateListOption } from "./slack";

import * as core from '@actions/core';

export function createList(
    commits: Commit[],
    opts: { serverUrl: string, repository: string }
): CreateListOption[] {
    core.info(`Creating list from ${commits.length} commits`);
    core.info(JSON.stringify(commits, null, 2));

    return commits.map((commit) => ({
        text: `${commit.message.split('\n')[0]!.trim()} (<${createCommitLink(commit, opts)}|${commit.shortSha}>)`,
        indent: 0
    }));
}

function createCommitLink(commit: Commit, { serverUrl, repository }: { serverUrl: string, repository: string }) {
    return `${serverUrl}/${repository}/commit/${commit.sha}`;
}
