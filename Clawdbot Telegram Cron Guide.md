# Clawdbot: Configure Cron Jobs with Telegram Notifications

This guide explains how to set up automated cron jobs in Clawdbot that send notifications directly to Telegram.

## Prerequisites

- Clawdbot installed and running
- Telegram channel configured in Clawdbot
- Your Telegram chat ID (format: numeric ID)
- Terminal access to the Clawdbot server

## Quick Start

### 1. Check Your Telegram Chat ID

First, find your Telegram chat ID:

```bash
# Check Clawdbot channel configuration
clawdbot gateway config.get | grep telegram
```

Your chat ID is a numeric value like `6X2X1X2X1X`.

### 2. List Existing Cron Jobs

```bash
clawdbot cron list
```

Output format:
```
ID                                   Name                     Schedule                         Next       Last       Status
5790e8e9-db3b-4f05-9527-cfc2d013f408 Check overdue tasks      cron 0 */2 * * 1-5               in 27m     2h ago     ok
```

### 3. Create a New Cron Job with Telegram Delivery

```bash
clawdbot cron add \
  --name "Check overdue tasks" \
  --cron "0 */2 * * 1-5" \
  --message "Check overdue tasks in Kanboard. Send result via message tool." \
  --channel telegram \
  --to <YOUR_CHAT_ID> \
  --deliver
```

Parameters:
- `--name`: Human-readable job name
- `--cron`: Cron expression (e.g., `"0 */2 * * 1-5"` = every 2 hours, Mon-Fri)
- `--message`: Instructions for the agent
- `--channel`: Delivery channel (`telegram`)
- `--to`: Your Telegram chat ID
- `--deliver`: Enable message delivery

## Modifying Existing Cron Jobs

### Update Job to Send to Telegram

```bash
clawdbot cron edit <JOB_ID> \
  --message "Check tasks and send to Telegram" \
  --channel telegram \
  --to <YOUR_CHAT_ID> \
  --deliver
```

### Example: Update an Overdue Task Checker

```bash
clawdbot cron edit 5790e8e9-db3b-4f05-9527-cfc2d013f408 \
  --message "Check overdue tasks in Kanboard. Send result to user 6X2X1X2X1X via message tool." \
  --channel telegram \
  --to 6X2X1X2X1X \
  --deliver
```

## Cron Expression Examples

| Expression | Description |
|------------|-------------|
| `0 */2 * * *` | Every 2 hours (every day) |
| `0 */2 * * 1-5` | Every 2 hours, Monday to Friday |
| `0 9 * * 1-5` | 9:00 AM, Monday to Friday |
| `0 18 * * 1-5` | 6:00 PM, Monday to Friday |
| `0 10 * * 1` | 10:00 AM every Monday |
| `0 8 * * *` | 8:00 AM every day |
| `*/15 * * * *` | Every 15 minutes |

## Common Cron Job Templates

### Daily Morning Briefing

```bash
clawdbot cron add \
  --name "Morning briefing" \
  --cron "0 9 * * 1-5" \
  --message "Morning briefing: Check Kanboard tasks for today and GCal agenda. Run: gcalcli agenda today. Send result via message tool." \
  --channel telegram \
  --to <YOUR_CHAT_ID> \
  --deliver
```

### Evening Review

```bash
clawdbot cron add \
  --name "Evening review" \
  --cron "0 18 * * 1-5" \
  --message "Evening review: Check closed tasks in Kanboard and GCal agenda for tomorrow. Run: gcalcli agenda tomorrow. Send result via message tool." \
  --channel telegram \
  --to <YOUR_CHAT_ID> \
  --deliver
```

### Weekly Review

```bash
clawdbot cron add \
  --name "Weekly review" \
  --cron "0 10 * * 1" \
  --message "Weekly review — open tasks by projects, overdue tasks. Send result via message tool." \
  --channel telegram \
  --to <YOUR_CHAT_ID> \
  --deliver
```

### Overdue Task Checker

```bash
clawdbot cron add \
  --name "Check overdue tasks" \
  --cron "0 */2 * * 1-5" \
  --message "Check overdue tasks in Kanboard. Send result via message tool." \
  --channel telegram \
  --to <YOUR_CHAT_ID> \
  --deliver
```

## Managing Cron Jobs

### Disable a Job

```bash
clawdbot cron disable <JOB_ID>
```

### Enable a Job

```bash
clawdbot cron enable <JOB_ID>
```

### Delete a Job

```bash
clawdbot cron rm <JOB_ID>
```

### Run a Job Now (Test)

```bash
clawdbot cron run <JOB_ID>
```

### View Run History

```bash
clawdbot cron runs <JOB_ID>
```

## Advanced Options

### Set Session Target

```bash
clawdbot cron edit <JOB_ID> --session isolated
```

Options: `main` or `isolated`

### Set Thinking Level

```bash
clawdbot cron edit <JOB_ID> --thinking medium
```

Options: `low`, `medium`, `high`, `on`

### Set Custom Model

```bash
clawdbot cron edit <JOB_ID> --model openai/gpt-4
```

### Set Timeout

```bash
clawdbot cron edit <JOB_ID> --timeout-seconds 120
```

## Troubleshooting

### Messages Not Arriving in Telegram

1. **Check job status:**
   ```bash
   clawdbot cron list
   ```

2. **Check run history:**
   ```bash
   clawdbot cron runs <JOB_ID>
   ```

3. **Verify Telegram configuration:**
   ```bash
   clawdbot gateway config.get | grep telegram
   ```

4. **Test Telegram message directly:**
   ```bash
   # Via Clawdbot CLI (if supported)
   # Or check gateway logs
   ```

### Job Not Running

1. **Verify schedule:**
   - Check timezone with `--tz` option
   - Ensure cron expression is valid

2. **Check if job is enabled:**
   ```bash
   clawdbot cron list
   ```

3. **Check gateway logs:**
   ```bash
   clawdbot gateway status
   ```

### Permission Errors

Ensure the user running Clawdbot has permission to manage cron jobs.

## Best Practices

1. **Test Before Scheduling:** Always run jobs manually before scheduling:
   ```bash
   clawdbot cron run <JOB_ID>
   ```

2. **Use Descriptive Names:** Name jobs clearly for easy identification:
   ```bash
   --name "Check Kanboard overdue tasks (→ Telegram)"
   ```

3. **Set Appropriate Intervals:** Don't overwhelm yourself with notifications
   - Critical tasks: Every 1-2 hours
   - Daily reviews: Morning and evening
   - Weekly reviews: Once per week

4. **Monitor Performance:** Check run history regularly to ensure jobs complete successfully

5. **Backup Your Configuration:** Export cron job definitions periodically

## Complete Example Setup

Here's a complete setup for a productivity workflow:

```bash
# 1. Morning briefing (9 AM, Mon-Fri)
clawdbot cron add \
  --name "Morning briefing (9 AM, Mon-Fri)" \
  --cron "0 9 * * 1-5" \
  --message "Morning briefing: Check Kanboard tasks for today and GCal agenda. Run: gcalcli agenda today. Send result via message tool to user 6X2X1X2X1X." \
  --channel telegram \
  --to 6X2X1X2X1X \
  --deliver

# 2. Overdue task check (every 2 hours, Mon-Fri)
clawdbot cron add \
  --name "Check overdue tasks (every 2h, Mon-Fri)" \
  --cron "0 */2 * * 1-5" \
  --message "Check overdue tasks in Kanboard. Send result via message tool to user 6X2X1X2X1X." \
  --channel telegram \
  --to 6X2X1X2X1X \
  --deliver

# 3. Evening review (6 PM, Mon-Fri)
clawdbot cron add \
  --name "Evening review (6 PM, Mon-Fri)" \
  --cron "0 18 * * 1-5" \
  --message "Evening review: Check closed tasks in Kanboard and GCal agenda for tomorrow. Run: gcalcli agenda tomorrow. Send result via message tool to user 6X2X1X2X1X." \
  --channel telegram \
  --to 6X2X1X2X1X \
  --deliver

# 4. Weekly review (Monday 10 AM)
clawdbot cron add \
  --name "Weekly review (Mon 10 AM)" \
  --cron "0 10 * * 1" \
  --message "Weekly review — open tasks by projects, overdue tasks. Send result via message tool to user 6X2X1X2X1X." \
  --channel telegram \
  --to 6X2X1X2X1X \
  --deliver
```

## Additional Resources

- [Clawdbot Documentation](https://docs.clawd.bot)
- [Cron Expression Generator](https://crontab.guru)
- [Clawdbot GitHub](https://github.com/clawdbot/clawdbot)

---

**Version:** 1.0  
**Last Updated:** 2026-02-24  
**Clawdbot Version:** 2026.1.24+
