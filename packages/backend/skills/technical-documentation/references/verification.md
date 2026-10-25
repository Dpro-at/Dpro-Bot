# Verification boundaries

Use a clean temporary project or the existing authorized test environment. Record exact input and actual output for any claim that an example ran. Redact secrets from receipts, not from the tested request in a way that changes the behavior being claimed.

| Check | Establishes | Does not establish |
|---|---|---|
| Markdown/site build | Accepted syntax and renderer behavior on this version | Correct commands or accurate API semantics |
| Local link resolution | Target files or generated anchors exist in the checked tree | Public URLs or private permissions work |
| CLI help inspection | A flag is documented by that executable | Its end-to-end operation succeeds |
| Example execution | The observed path succeeded in the recorded environment | Every platform, account or release works |
| Schema validation | Sample conforms to that schema | Server authorization or business behavior |

For a fresh-reader rehearsal, start with only the prerequisites the document states. Record an undeclared prerequisite as a defect even if the author knows how to work around it. Where an example cannot run, identify the missing capability and label it not run; do not fabricate expected output as an observation.

Troubleshooting validation should deliberately exercise one relevant safe failure, such as a missing required field in a local test server. Do not provoke destructive failures in a live system. Review a consequential recovery procedure against source or an available sandbox; if neither exists, mark it unverified and require operational review before use.
