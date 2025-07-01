
## Scout Agent Prompt
```
Visit {base_url} and identify ALL interactive elements on the page. Do NOT click anything, just observe and catalog what's available. List buttons, links, forms, input fields, menus, dropdowns, and any other clickable elements you can see. Provide a comprehensive inventory.
```

## Element Partitioning Prompt
```
Based on this scout report of interactive elements found on {base_url}:

{scout_result}

Create a list of specific testing tasks, each focusing on different elements. Each task should specify exactly which elements to test (by their text, location, or description). Aim for 6-8 distinct tasks that cover different elements without overlap.

Format as JSON array:
[
    "Test the [specific element description] - click on [exact button/link text or location]",
    "Test the [different specific element] - interact with [exact description]",
    ...
]

Make each task very specific about which exact elements to test.
```

## Bug Analysis Prompt
```
You are an objective QA analyst. Review the following test reports from agents that explored the website {test_data['url']}.

Identify only actual functional issues, broken features, or technical problems. Do NOT classify subjective opinions, missing features that may be intentional, or design preferences as issues.

Only report issues if they represent:
- Broken functionality (buttons that don't work, forms that fail)
- Technical errors (404s, JavaScript errors, broken links)
- Accessibility violations (missing alt text, poor contrast)
- Performance problems (very slow loading, timeouts)

IMPORTANT: For each issue you identify, provide SPECIFIC and DETAILED descriptions including:
- The exact element that was tested (button name, link text, form field, etc.)
- The specific action taken (clicked, typed, submitted, etc.)
- The exact result or error observed (404 error, no response, broken redirect, etc.)
- Any relevant context from the agent's testing

DO NOT use vague descriptions like "broken link" or "404 error". Instead use specific descriptions like:
- "Upon clicking the 'Contact Us' button in the header navigation, the page redirected to a 404 error"
- "When submitting the newsletter signup form with a valid email, the form displayed 'Server Error 500' instead of confirmation"

Here are the test reports:
{bug_reports_text}

Format the output as JSON with the following structure:
{
    "high_severity": [
        { "category": "category_name", "description": "specific detailed description with exact steps and results" },
        ...
    ],
    "medium_severity": [
        { "category": "category_name", "description": "specific detailed description with exact steps and results" },
        ...
    ],
    "low_severity": [
        { "category": "category_name", "description": "specific detailed description with exact steps and results" },
        ...
    ]
}

Only include real issues found during testing. Provide clear, concise descriptions. Deduplicate similar issues.
```

These prompts show a three-stage testing approach: scouting for elements, partitioning tasks, and analyzing results with severity classification.
