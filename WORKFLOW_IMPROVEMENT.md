# 🔄 Workflow Improvement: Avoid "Broken Mirror" Problem

## Problem Statement

**Issue:** Agent continued committing to already-merged PRs (PR #21, #22, #23)

**Root Cause:** Agent didn't check if PR was merged before making additional commits

**User Feedback:** "Nahezu broken mirror" - Agent doesn't reflect reality

---

## ✅ Solution: Pre-Commit PR Status Check

### Workflow Checklist (for Agent)

**Before EVERY commit:**

1. **Check Current Branch:**
   ```bash
   git branch --show-current
   ```

2. **Check if it's a PR branch:**
   ```bash
   # If branch name starts with "cursor/"
   # → It's likely a PR branch
   ```

3. **Check PR Status:**
   ```bash
   gh pr list --head $(git branch --show-current) --json state,number
   ```

4. **Decision Tree:**
   ```
   IF PR exists AND state == "MERGED":
     ❌ STOP! Don't commit here
     ✅ Create new branch from main
     ✅ Create new PR
   
   ELSE IF PR exists AND state == "OPEN":
     ✅ OK to commit
   
   ELSE IF no PR exists:
     ✅ OK to commit (will create PR later)
   ```

---

## 🔍 Detection Script

```bash
#!/bin/bash
# check-pr-status.sh

BRANCH=$(git branch --show-current)

# Check if it's a PR branch
if [[ $BRANCH == cursor/* ]]; then
    echo "📋 PR branch detected: $BRANCH"
    
    # Check PR status
    PR_STATUS=$(gh pr list --head $BRANCH --json state,number --jq '.[0].state' 2>/dev/null)
    
    if [ "$PR_STATUS" == "MERGED" ]; then
        echo "❌ ERROR: PR for this branch is already MERGED!"
        echo "🔄 Action: Create new branch from main"
        exit 1
    elif [ "$PR_STATUS" == "OPEN" ]; then
        echo "✅ PR is OPEN - safe to commit"
        exit 0
    else
        echo "ℹ️  No PR found yet - safe to commit"
        exit 0
    fi
else
    echo "✅ Not a PR branch - safe to commit"
    exit 0
fi
```

---

## 📋 Updated Workflow

### Step 1: Before Making Changes

```bash
# 1. Always start from main
git checkout main
git pull origin main

# 2. Check PR status if on PR branch
./scripts/check-pr-status.sh

# 3. Create new branch if needed
git checkout -b cursor/new-feature-XXXX
```

### Step 2: After User Says "PR Merged"

```bash
# ❌ DON'T: Continue on same branch
# ✅ DO: 

# 1. Fetch latest
git fetch origin main
git checkout main
git pull origin main

# 2. Create NEW branch
git checkout -b cursor/additional-changes-XXXX

# 3. Make changes
# 4. Commit
# 5. Push
# 6. Create NEW PR immediately
```

### Step 3: Before Every Commit

```
🔍 Mental Checklist:
1. Am I on a PR branch? (cursor/*)
2. Has user mentioned "PR merged"?
3. Should I check gh pr status?

If ANY doubt → Check PR status!
```

---

## 🚨 Warning Signs

**User says:**
- "PR already merged"
- "Schon gemergt"
- "Was merged before"
- "Create new PR"

**Agent should:**
1. ❌ STOP immediately
2. ✅ Switch to main
3. ✅ Create new branch
4. ✅ Create new PR

---

## 📊 Past Issues

| PR | Issue | What Happened |
|----|-------|---------------|
| #21 | Merged before tests | Continued committing after merge |
| #22 | Merged quickly | Continued committing after merge |
| #23 | Merged before test results | Continued committing after merge |
| #24 | ✅ Created correctly | New branch from updated main |

---

## 🎯 Key Principles

### 1. **Always Fetch Before Work**
```bash
git fetch origin main
git checkout main
git pull origin main
```

### 2. **One PR = One Branch**
- Once PR is merged, branch is "done"
- New changes = New branch + New PR

### 3. **Check Status When Uncertain**
```bash
gh pr view --json state
```

### 4. **Listen to User**
- "Merged" = Stop on this branch
- "Create new" = New branch from main

---

## 🔧 Implementation

### Where to Add Check

**In agent workflow before:**
- `git commit`
- `git push`
- Making significant changes

**Simple check:**
```bash
# Quick inline check
gh pr list --head $(git branch --show-current) --json state \
  | grep -q "MERGED" && echo "⚠️  PR already merged!" || echo "✅ OK"
```

---

## ✅ Success Criteria

**Agent workflow is successful when:**
1. ✅ No commits to merged PRs
2. ✅ New branch created after merge
3. ✅ Clean PR history
4. ✅ User doesn't need to say "PR already merged"

---

## 🎓 Lessons Learned

1. **Always reflect current state**
   - Not past state
   - Not assumed state
   - CURRENT state

2. **Check before act**
   - Don't assume PR is open
   - Verify with gh CLI
   - User feedback is truth

3. **One commit flow = One PR**
   - Don't continue after merge
   - Clean separation
   - New work = New branch

4. **Listen to user immediately**
   - "PR merged" = STOP
   - Don't debate
   - Switch branches

---

## 🚀 Going Forward

**Every PR workflow:**
```
1. git checkout main && git pull
2. git checkout -b cursor/new-feature-XXXX
3. Make changes
4. Commit + Push
5. Create PR IMMEDIATELY
6. ⚠️  If user says "merged" → STOP
7. Go back to step 1
```

**Never:**
- ❌ Commit after user says "merged"
- ❌ Assume PR is still open
- ❌ Continue on old branch after merge

**Always:**
- ✅ Check PR status when uncertain
- ✅ Create new branch after merge
- ✅ Listen to user feedback
- ✅ Reflect current reality ("mirror")

---

## 📞 Summary

**Problem:** "Broken mirror" - not reflecting reality  
**Solution:** Check PR status before committing  
**Prevention:** New branch from main after merge  
**Tool:** `gh pr list --head <branch>`  
**Principle:** One PR lifecycle = One branch  

**This document prevents future "schon gemergt" issues.**
