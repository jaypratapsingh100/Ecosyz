# Testing stage-committable-files.sh Script

This guide explains how to safely test the `stage-committable-files.sh` script in development.

## 🧪 Testing Methods

### Method 1: Dry-Run Test (Recommended)

Use the dry-run script to see what would be staged **without actually staging anything**:

```bash
./scripts/test-stage-committable-files.sh
```

This will show you:
- All modified/deleted files that would be staged
- All untracked files that would be added
- A count of total files

### Method 2: Test on a Separate Branch

Create a test branch to safely test the script:

```bash
# Create and switch to a test branch
git checkout -b test/stage-script

# Run the script
./scripts/stage-committable-files.sh

# Check what was staged
git status

# If you want to unstage everything
git reset

# Switch back to your working branch
git checkout develop
git branch -D test/stage-script
```

### Method 3: Test with Git Stash

Save your current work, test the script, then restore:

```bash
# Save current changes
git stash

# Run the script
./scripts/stage-committable-files.sh

# Check what was staged
git status

# Unstage everything
git reset

# Restore your changes
git stash pop
```

### Method 4: Manual Verification

Before running the script, manually check what files it would affect:

```bash
# See modified files (excluding .md)
git status --porcelain | grep -E '^[MD]' | grep -v '\.md$'

# See untracked files (excluding .md)
git status --porcelain | grep '^??' | grep -v '\.md$'
```

## ✅ Verification Steps

After running the script, verify:

1. **Check staged files:**
   ```bash
   git status --short
   ```

2. **See detailed staging:**
   ```bash
   git diff --cached --name-only
   ```

3. **Verify no .md files are staged:**
   ```bash
   git diff --cached --name-only | grep '\.md$'
   # Should return nothing
   ```

4. **Count staged files:**
   ```bash
   git diff --cached --name-only | wc -l
   ```

## 🔄 Undoing Changes

If you need to unstage files after testing:

```bash
# Unstage all files
git reset

# Or unstage specific files
git reset HEAD <file-path>
```

## 📋 Expected Behavior

The script should:
- ✅ Stage all modified files (excluding .md)
- ✅ Stage all deleted files (excluding .md)
- ✅ Stage all untracked files (excluding .md)
- ✅ Show a summary of staged files
- ✅ Display total count of staged files

## 🐛 Troubleshooting

### Issue: Script doesn't execute
```bash
# Make sure it's executable
chmod +x scripts/stage-committable-files.sh

# Run with bash explicitly
bash scripts/stage-committable-files.sh
```

### Issue: Wrong files being staged
```bash
# Check what files match the pattern
git status --porcelain | grep -v '\.md$'

# Verify the script logic
cat scripts/stage-committable-files.sh
```

### Issue: Need to test specific file types
Modify the script temporarily to test:
```bash
# Edit the script to add more exclusions
# For example, exclude .txt files too:
grep -v '\.md$\|\.txt$'
```

## 🎯 Quick Test Checklist

- [ ] Run dry-run script first
- [ ] Verify output matches expectations
- [ ] Test on a separate branch or with stash
- [ ] Check that no .md files are staged
- [ ] Verify file counts match expectations
- [ ] Test undo functionality (git reset)

## 📝 Example Test Session

```bash
# 1. Check current status
git status

# 2. Run dry-run
./scripts/test-stage-committable-files.sh

# 3. If dry-run looks good, run actual script
./scripts/stage-committable-files.sh

# 4. Verify staging
git status --short

# 5. Check staged files count
git diff --cached --name-only | wc -l

# 6. If needed, unstage
git reset
```
