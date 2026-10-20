# Orbit Atlas operations

## Publish

Run the manual `Publish dataset artifact` workflow when a fresh provider recording is intentionally requested. The workflow validates the staged dataset before uploading it; it never mutates the known-good manifest on validation failure. The Pages workflow validates the checked-in dataset, builds the application with the repository subpath, and uploads the application and selected dataset as one Pages artifact.

## Roll back

To roll back a release, identify the last successful Pages workflow run in Actions, restore the corresponding commit or prior release ref, and use **Run workflow** on `Deploy Orbit Atlas to Pages`. Confirm the deployed manifest version and run the browser smoke suite against the Pages URL. Do not manually replace only catalog or motion files: the manifest and its checksums must be deployed atomically.

There is currently no configured Git remote or Pages environment in this workspace, so remote workflow execution and release approval remain open until the repository owner configures them.
