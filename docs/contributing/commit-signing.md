# Commit identity and signing

## Why this exists

Git does not check the name and email on a commit. They are plain text. Anyone can type any name and email into their git config. In this repository, a contributor once copied a maintainer's name and email from a config example. Their commits then landed under the maintainer's name. A signature fixes this problem. A signature ties a commit to a signing key. Only the signer holds the private half of that key. GitHub shows "Verified" on a commit in one case only. The signature must check out against a key registered on the account that owns the email on the commit.

## The three rules

1. Commit as yourself. Use your own name and your own GitHub noreply address. A noreply address has the form `<id>+<login>@users.noreply.github.com`. Never use a personal email address. Never use another person's name. You find your noreply address on GitHub under Settings, then Emails. GitHub shows it there when "Keep my email addresses private" is on.

2. Sign every commit and every tag.

3. The main branch accepts only pull requests. No one pushes to main directly. This includes maintainers. Every commit in a pull request must show "Verified" on GitHub. A CI check named "Commit identity" runs on each pull request. It checks the author and the committer of every commit. The check fails if either one is not the account that opened the pull request. GitHub's own "web-flow" committer is allowed. GitHub signs the commits it creates in its web interface, so those commits pass.

These rules apply to everyone. They apply to maintainers. They apply to any automation or AI agent that commits on a person's behalf.

## Before you start

You need git version 2.34 or newer. You also need OpenSSH version 8.8 or newer. Check both versions with these commands:

```bash
git --version
ssh -V
```

On macOS and on Linux, both tools are normally already present. On Windows, install Git for Windows. It includes OpenSSH. Run every command in this guide inside Git Bash.

Set your identity once, for all repositories on the machine:

```bash
git config --global user.name "Your Name"
git config --global user.email "<id>+<login>@users.noreply.github.com"
```

Your global git config may need to keep a different email for other work. In that case, run the same two commands again, without `--global`, inside your clone of this repository. The setting inside the repository wins over the global setting.

## Step 1: generate a signing key

Generate one key per machine. Name the key after the machine when you upload it in Step 3. Never copy a private key from one machine to another machine. Generate the key with this command:

```bash
ssh-keygen -t ed25519 -C "<id>+<login>@users.noreply.github.com" -f ~/.ssh/github_signing
```

ssh-keygen asks you for a passphrase. Both choices below are valid.

- One valid choice is no passphrase. Signing then works in every session without a prompt. This includes unattended tools and AI agents that commit on your behalf. The private key file becomes the only protection. Anyone who can read that file can then sign commits as you.
- The other valid choice is a passphrase. The file is then protected at rest, for example inside a backup. You must load the key into the SSH agent once per login. Otherwise, signing prompts you for the passphrase every time.

Depending on your platform, load the key into the agent with one of these commands:

```bash
ssh-add --apple-use-keychain ~/.ssh/github_signing
ssh-add ~/.ssh/github_signing
```

Use the first command on macOS. Use the second command on Linux and in Git Bash.

The private key is the file `~/.ssh/github_signing`. The public key is the file `~/.ssh/github_signing.pub`. Only the public key ever leaves the machine.

## Step 2: tell git to sign with it

Run these four commands. They apply to every repository on the machine.

```bash
git config --global gpg.format ssh
git config --global user.signingkey "$HOME/.ssh/github_signing.pub"
git config --global commit.gpgsign true
git config --global tag.gpgsign true
```

Use the full path, as shown with `$HOME`. Do not use a tilde in this setting. On Windows in Git Bash, `$HOME` expands correctly.

From now on, every commit and every tag on this machine is signed. Nothing changes in how you run `git commit`.

## Step 3: register the public key on GitHub

Print the public key and copy the whole line:

```bash
cat ~/.ssh/github_signing.pub
```

Then, on github.com, follow these steps.

1. Click your avatar at the top right, then click Settings.
2. In the left menu, click "SSH and GPG keys".
3. Click "New SSH key". On some accounts the button reads "Add SSH key".
4. In the Title field, enter the name of the machine. For example, enter "work laptop".
5. For Key type, choose "Signing Key". The default choice is "Authentication Key". That default is the wrong choice for this purpose. A key uploaded as an authentication key does not verify signatures.
6. Paste the copied line into the Key box. Click "Add SSH key". GitHub may ask you to confirm your password.

GitHub's own reference for this page is: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account

## Step 4: turn on vigilant mode

Stay on the same "SSH and GPG keys" page. Scroll to the section named "Vigilant mode". Tick the box "Flag unsigned commits as unverified". If a save button appears, click it.

With vigilant mode on, GitHub marks some commits as "Unverified". This happens to any commit that carries your email but not your signature. This includes your own older commits, from before you set up signing. That result is expected, and it is the point. A commit under your name that you did not sign is now visibly marked.

GitHub's reference for this feature is: https://docs.github.com/en/authentication/managing-commit-signature-verification/displaying-verification-statuses-for-all-of-your-commits

## Step 5: check that it works

Git can verify your own signatures locally. First, it needs to know which key belongs to which email. Create an allowed signers file once:

```bash
echo "<id>+<login>@users.noreply.github.com $(cut -d' ' -f1,2 ~/.ssh/github_signing.pub)" >> ~/.ssh/allowed_signers
git config --global gpg.ssh.allowedSignersFile "$HOME/.ssh/allowed_signers"
```

Make a commit on a branch. Then run:

```bash
git log --show-signature -1
```

The output contains a line that starts with: `Good "git" signature for <your email> with ED25519 key SHA256:...`

For a short form covering several commits, run:

```bash
git log --format='%h %G? %s' -5
```

In the second column, `G` means a good signature. `N` means no signature. `B` means a bad signature. `E` means git could not check the signature.

On GitHub, open the commit page inside your pull request. A green "Verified" badge appears next to the commit. Without a browser, check the same fact with:

```bash
gh api repos/pinaka-cognitive-systems/pinaka-abhyas/commits/<sha> -q .commit.verification
```

The field "verified" must be true. The field "reason" must be "valid".

## What the badges mean

| Badge | What it means |
|---|---|
| Verified | The commit is signed. The signature checks against a key on the committer's account. The email on the commit belongs to that account. |
| Partially verified | The signature is valid, but the author of the commit is a different account. That account has vigilant mode on. This means the signer committed work under someone else's name. This repository does not accept this case. Each person raises their own pull request for their own commits. |
| Unverified | The commit is not signed, or the signature does not check out. The API field "reason" says which case applies. |

The GitHub API reports a "reason" field for every commit. These are the common values.

| Reason | Meaning |
|---|---|
| valid | Everything checks. |
| unsigned | No signature is on the commit. Either signing is not configured, or the commit was made before setup. |
| unknown_key | The signature is valid, but the key is not on your GitHub account. It may also have been registered as an authentication key instead of a signing key. |
| bad_email | The email on the commit is not an email on the account that owns the key. Fix `user.email`, or add the email to your account. |
| unverified_email | The email is on the account, but it is not confirmed. |
| no_user | The email on the commit belongs to no GitHub account. |
| expired_key | The key has expired. |
| invalid | The signature does not match the commit. |

## When a push is rejected

The main branch has a ruleset. The ruleset requires pull requests and verified signatures. A push that contains an unsigned commit is refused. The refusal message includes the text "Commits must have verified signatures". It also includes the text "push declined due to repository rule violations". This check applies to pushes to main. Feature branches accept unsigned commits. The pull request checks catch unsigned commits later, before the branch can merge.

To sign the commits on your branch after the fact, run this command. It uses `origin/main` as the base.

```bash
git rebase --exec 'git commit --amend --no-edit -S' origin/main
```

This command rewrites only the commits on your branch. It signs each commit, one by one. Then push your branch again:

```bash
git push --force-with-lease
```

Never force-push the main branch. The ruleset "main history is immutable" refuses it. A force-push to main would also break every other clone of the repository.

## When a commit carries the wrong name

Some commits on your branch may carry another person's name. Some may carry a personal email address. Fix `user.name` and `user.email` first. Then rewrite the branch. Give each commit the current identity and a signature:

```bash
git rebase --exec 'git commit --amend --no-edit --reset-author -S' origin/main
git push --force-with-lease
```

The "Commit identity" check fails a pull request in one case. This happens when any commit's author or committer differs from the account that opened the pull request. The command above is the fix for that failure.

## Several machines, a lost machine, and automation

- Use one key per machine. Upload each key under the name of its machine. To find which key signed a commit, compare its fingerprint with the fingerprints on your "SSH and GPG keys" page. Get the commit's fingerprint from `git log --show-signature`.
- A machine can be lost, or its key can be copied without your knowledge. In either case, delete that key on the "SSH and GPG keys" page. Generate a new key on the replacement machine. Commits that GitHub already verified keep their Verified status. GitHub records the result at the time of verification and does not re-check old commits when a key changes. Only new commits signed with the deleted key show Unverified. The repository's activity log also records which account pushed each commit.
- Tools that commit on your behalf, including AI coding agents, use the same global git config as you do. They sign commits with your key. Their commits then appear as your own commits. Run such tools only on a machine whose signing key is your own. Read what these tools commit. A signature proves that the key holder made the commit. It does not prove that the work is good.

## What a signature does and does not prove

- A signature proves that the holder of the private key created that exact commit content. Changing one byte of the commit breaks the signature.
- A signature does not prove that the work is original, or that it is the signer's own work. Copying someone else's change and signing it still produces a Verified commit.
- A signature does not replace the Contributor License Agreement. The CLA check is separate. It is also required.

## How main receives changes

The main branch allows two merge methods: "merge commit" and "squash". GitHub creates these merge commits itself. GitHub signs them with its own key, so they show as Verified. "Rebase and merge" is disabled for this repository. That method creates new commits with new hashes and new committer information, so the signature made on the original commit no longer matches its content. Merging from the command line works the same way. Both `gh pr merge --merge` and `gh pr merge --squash` use the same GitHub-made, signed commits.

## Troubleshooting

| What you see | What it means and what to do |
|---|---|
| `error: Couldn't load public key ... github_signing.pub` | The path in `user.signingkey` is wrong. Set it again, using the full path with `$HOME`. |
| `error: gpg failed to sign the data` | Git is calling gpg instead of ssh-keygen. `gpg.format` is not set to `ssh`. Run the Step 2 commands again. |
| `fatal: failed to write commit object`, on an older git | Your git is older than version 2.34. It does not support SSH signing. Upgrade git. |
| Signing prompts for a passphrase on every commit | The key has a passphrase, and it is not loaded in the SSH agent. Run the `ssh-add` command from Step 1. |
| Commit shows Unverified with reason `unknown_key` | The key is not registered on your account, or it was registered as an authentication key. Add it again as a signing key, as in Step 3. |
| Commit shows Unverified with reason `bad_email` | The email on the commit is not on your GitHub account. Fix `user.email`, or add the email under Settings, then Emails. |
| Commit shows Partially verified | You committed a commit that was authored by someone else. Each person raises their own pull request. Use the reset-author rebase if the author is wrong. |
| The "Commit identity" check fails | One commit's author or committer is not the account that opened the pull request. Run the reset-author rebase, then push again. |
| No "Good git signature" line appears in `git log --show-signature` | The allowed signers file is missing, or the email in it differs from `user.email`. Redo Step 5. |

Questions about this guide belong in a GitHub issue, not in a pull request that is blocked by it.
