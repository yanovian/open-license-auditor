import * as github from '@actions/github';

type Octokit = ReturnType<typeof github.getOctokit>;
type ActionContext = typeof github.context;

const COMMENT_MARKER = '<!-- open-license-auditor -->';

export interface PrCommenterOptions {
  readonly githubToken: string;
  readonly updateExistingComment: boolean;
}

/** Posts (or updates) the audit comment on the current pull request, if there is one. */
export async function postPrComment(body: string, options: PrCommenterOptions): Promise<void> {
  const context = github.context;
  const pullRequestNumber = context.payload.pull_request?.number;
  if (!pullRequestNumber) {
    return;
  }

  const octokit = github.getOctokit(options.githubToken);
  const bodyWithMarker = `${COMMENT_MARKER}\n${body}`;

  const existingCommentId = options.updateExistingComment
    ? await findExistingCommentId(octokit, context, pullRequestNumber)
    : null;

  if (existingCommentId) {
    await octokit.rest.issues.updateComment({
      ...context.repo,
      comment_id: existingCommentId,
      body: bodyWithMarker,
    });
    return;
  }

  await octokit.rest.issues.createComment({
    ...context.repo,
    issue_number: pullRequestNumber,
    body: bodyWithMarker,
  });
}

async function findExistingCommentId(
  octokit: Octokit,
  context: ActionContext,
  pullRequestNumber: number,
): Promise<number | null> {
  const comments = await octokit.rest.issues.listComments({
    ...context.repo,
    issue_number: pullRequestNumber,
  });

  const existingComment = comments.data.find((comment) => comment.body?.includes(COMMENT_MARKER));
  return existingComment?.id ?? null;
}
