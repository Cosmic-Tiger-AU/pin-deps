/** A resolved view of the workspace, independent of which package manager produced it. */
export type Workspace = {
  /** Package name -> exact installed version. */
  installedVersions: Map<string, string>;
  /** Absolute paths to every workspace `package.json`. */
  workspacePackages: Set<string>;
};
