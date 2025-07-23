# Conditional Questions Configuration Guide

## Overview

The conditional question system allows lawyers to create intelligent intake forms that only ask relevant questions based on previous answers. This eliminates redundant questions and provides a better user experience.

## How It Works

Questions are asked conversationally - users type their answers naturally, and the system intelligently determines which questions to ask next based on their responses.

## Configuration Format

Instead of a simple array of questions, you can now use a structured format with conditions:

```json
{
  "serviceQuestions": {
    "Family Law": {
      "questions": [
        {
          "id": "family_issue_type",
          "question": "What type of family issue are you dealing with?",
          "type": "text"
        },
        {
          "id": "relationship_status",
          "question": "Are you and the opposing party currently: Never married, Married, Separated, or Divorced?",
          "type": "choice",
          "options": ["Never married", "Married", "Separated", "Divorced"]
        },
        {
          "id": "marriage_date",
          "question": "What is the date that you and the opposing party became married?",
          "type": "date",
          "condition": {
            "field": "relationship_status",
            "value": "Married"
          }
        }
      ]
    }
  }
}
```

## Question Types

### Text Questions
```json
{
  "id": "issue_description",
  "question": "Can you describe your situation?",
  "type": "text"
}
```

### Choice Questions
```json
{
  "id": "urgency_level",
  "question": "How urgent is this matter?",
  "type": "choice",
  "options": ["Very urgent", "Somewhat urgent", "Not urgent"]
}
```

### Date Questions
```json
{
  "id": "incident_date",
  "question": "When did this incident occur?",
  "type": "date"
}
```

### Email Questions
```json
{
  "id": "client_email",
  "question": "What is your email address?",
  "type": "email"
}
```

## Conditional Logic

Use the `condition` field to make questions conditional:

```json
{
  "id": "marriage_date",
  "question": "What is your marriage date?",
  "type": "date",
  "condition": {
    "field": "relationship_status",
    "value": "Married"
  }
}
```

This question will only be asked if the user answered "Married" to the `relationship_status` question.

## Example: Family Law Flow

Here's a complete example showing how conditional questions work:

1. **Always asked**: Issue type, opposing party name, email
2. **Always asked**: Relationship status (choice: Never married, Married, Separated, Divorced)
3. **Conditional**: Marriage date (only if "Married" selected)
4. **Conditional**: Separation date (only if "Separated" selected)
5. **Conditional**: Divorce date (only if "Divorced" selected)
6. **Always asked**: Has children (choice: Yes, No)
7. **Conditional**: Children info (only if "Yes" selected)

## Benefits

- **No redundant questions**: Users only answer relevant questions
- **Better user experience**: Shorter, more focused intake forms
- **Higher completion rates**: Less overwhelming for users
- **Better data quality**: More accurate information collection
- **Flexible configuration**: Easy to modify without code changes

## Migration from Old Format

If you currently have simple arrays of questions, you can gradually migrate:

**Old format:**
```json
"Family Law": [
  "What type of family issue?",
  "Are you married?",
  "When did you get married?",
  "Do you have children?"
]
```

**New format:**
```json
"Family Law": {
  "questions": [
    {
      "id": "issue_type",
      "question": "What type of family issue?",
      "type": "text"
    },
    {
      "id": "marriage_status",
      "question": "Are you married?",
      "type": "choice",
      "options": ["Yes", "No"]
    },
    {
      "id": "marriage_date",
      "question": "When did you get married?",
      "type": "date",
      "condition": {
        "field": "marriage_status",
        "value": "Yes"
      }
    },
    {
      "id": "has_children",
      "question": "Do you have children?",
      "type": "choice",
      "options": ["Yes", "No"]
    }
  ]
}
```

## Testing Your Configuration

After updating your `teams.json`, test the flow by:

1. Starting a new conversation
2. Selecting your service
3. Answering questions naturally
4. Verifying that conditional questions appear/disappear correctly

The system will automatically handle the conditional logic based on user responses. 