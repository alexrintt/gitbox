import filenamify from "filenamify";
import validFilename from "valid-filename";
import { GitRepository } from "../providers";

export const createGithubUsernameRegex = () =>
  /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export function isValidGitHubUsername(username: string): boolean {
  return createGithubUsernameRegex().test(username);
}

export function sanitizeGitHubUsername(username: string): string {
  return username
    .replace(/[^a-z\d]|-(?=[a-z\d])/gi, "")
    .substring(0, 38)
    .padStart(1, "f");
}

export function isValidGitRepositoryName(repoName: string): boolean {
  return /^[a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]+)*$/g.test(repoName);
}

export function isValidFilename(filename: string): boolean {
  return validFilename(filename);
}

export function sanitizeFilename(filename: string): string {
  return filenamify(filename, { replacement: "-" }).substring(0, 1024);
}

export function sanitizeGitBranchName(branchName: string): string {
  return branchName;
}

export function sanitizeRepoName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_.]/g, "-").toLowerCase();
}

export function sanitizeGitRepository(
  repository: GitRepository
): GitRepository {
  return {
    branch: sanitizeGitBranchName(repository.branch),
    name: sanitizeRepoName(repository.name),
    owner: sanitizeGitHubUsername(repository.owner),
  };
}
