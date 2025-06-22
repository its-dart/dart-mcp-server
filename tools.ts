import { Tool } from "@modelcontextprotocol/sdk/types.js";

const CUSTOM_PROPERTIES_SCHEMA = {
  type: "object",
  description:
    "Custom properties to apply to the task. Use the property names from the config. Examples: { 'customCheckboxProperty': true, 'customTextProperty': 'Some text', 'customNumberProperty': 5, 'customSelectProperty': 'Option Name', 'customDatesProperty': '2025-05-10', 'customDatesPropertyWithRange': ['2025-05-01', '2025-05-30'], 'customMultiselectProperty': ['option1', 'option2'], 'customUserProperty': 'user@example.com', 'customMultipleUserProperty': ['user1@example.com', 'user2@example.com'], 'customTimeTrackingProperty': '1:30:00' }",
  additionalProperties: {
    oneOf: [
      { title: "CustomPropertyCheckbox", type: "boolean" },
      {
        title: "CustomPropertyDatesRange",
        type: ["array", "null"],
        items: { type: ["string", "null"] },
      },
      { title: "CustomPropertyDatesSingle", type: ["string", "null"] },
      {
        title: "CustomPropertyMultiselect",
        type: "array",
        items: { type: "string" },
      },
      { title: "CustomPropertyNumber", type: ["number", "null"] },
      { title: "CustomPropertySelect", type: ["string", "null"] },
      { title: "CustomPropertyStatus", type: "string" },
      { title: "CustomPropertyText", type: "string" },
      {
        title: "CustomPropertyTimeTracking",
        type: "string",
        pattern: "^[0-9]+:[0-5][0-9]:[0-5][0-9]$",
        description: "Duration in HH:MM:SS format",
      },
      {
        title: "CustomPropertyUserMultiple",
        type: "array",
        items: { type: "string" },
      },
      { title: "CustomPropertyUserSingle", type: ["string", "null"] },
    ],
  },
};

export const GET_CONFIG_TOOL: Tool = {
  name: "get_config",
  description:
    "Get information about the user's space, including all of the possible values that can be provided to other endpoints. This includes available assignees, dartboards, folders, statuses, tags, priorities, sizes, and all custom property definitions.",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

export const LIST_TASKS_TOOL: Tool = {
  name: "list_tasks",
  description:
    "List tasks from Dart with optional filtering parameters. You can filter by assignee, status, dartboard, priority, due date, and more.",
  inputSchema: {
    type: "object",
    properties: {
      assignee: {
        type: "string",
        description: "Filter by assignee name or email",
      },
      assignee_id: {
        type: "string",
        description: "Filter by assignee ID",
      },
      dartboard: {
        type: "string",
        description: "Filter by dartboard title",
      },
      dartboard_id: {
        type: "string",
        description: "Filter by dartboard ID",
      },
      description: {
        type: "string",
        description: "Filter by description content",
      },
      due_at_before: {
        type: "string",
        description: "Filter by due date before (ISO format)",
      },
      due_at_after: {
        type: "string",
        description: "Filter by due date after (ISO format)",
      },
      ids: { type: "string", description: "Filter by IDs" },
      in_trash: { type: "boolean", description: "Filter by trash status" },
      is_completed: {
        type: "boolean",
        description: "Filter by completion status",
      },
      limit: { type: "number", description: "Number of results per page" },
      offset: {
        type: "number",
        description: "Initial index for pagination",
      },
      priority: { type: "string", description: "Filter by priority" },
      size: { type: "number", description: "Filter by task size" },
      start_at_before: {
        type: "string",
        description: "Filter by start date before (ISO format)",
      },
      start_at_after: {
        type: "string",
        description: "Filter by start date after (ISO format)",
      },
      status: { type: "string", description: "Filter by status" },
      status_id: { type: "string", description: "Filter by status ID" },
      tag: { type: "string", description: "Filter by tag" },
      tag_id: { type: "string", description: "Filter by tag ID" },
      parent_id: { type: "string", description: "Filter by parent task ID" },
      type: { type: "string", description: "Filter by task type" },
      type_id: { type: "string", description: "Filter by task type ID" },
      title: { type: "string", description: "Filter by title" },
    },
    required: [],
  },
};

export const CREATE_TASK_TOOL: Tool = {
  name: "create_task",
  description:
    "Create a new task in Dart. You can specify title, description, status, priority, size, dates, dartboard, assignees, tags, parent task, and custom properties.",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "The title of the task (required)",
      },
      description: {
        type: "string",
        description:
          "A longer description of the task, which can include markdown formatting",
      },
      status: {
        type: "string",
        description: "The status from the list of available statuses",
      },
      priority: {
        type: "string",
        description: "The priority (Critical, High, Medium, or Low)",
      },
      size: {
        type: ["string", "number", "null"],
        description: "The size which represents the amount of work needed",
      },
      startAt: {
        type: "string",
        description:
          "The start date in ISO format (should be at 9:00am in user's timezone)",
      },
      dueAt: {
        type: "string",
        description:
          "The due date in ISO format (should be at 9:00am in user's timezone)",
      },
      dartboard: {
        type: "string",
        description: "The title of the dartboard (project or list of tasks)",
      },
      assignees: {
        type: "array",
        items: { type: "string" },
        description:
          "Array of assignee names or emails (if workspace allows multiple assignees)",
      },
      assignee: {
        type: "string",
        description:
          "Single assignee name or email (if workspace doesn't allow multiple assignees)",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Array of tags to apply to the task",
      },
      parentId: {
        type: "string",
        description: "The ID of the parent task",
      },
      customProperties: CUSTOM_PROPERTIES_SCHEMA,
    },
    required: ["title"],
  },
};

export const GET_TASK_TOOL: Tool = {
  name: "get_task",
  description:
    "Retrieve an existing task by its ID. Returns the task's information including title, description, status, priority, dates, custom properties, and more.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The 12-character alphanumeric ID of the task",
        pattern: "^[a-zA-Z0-9]{12}$",
      },
    },
    required: ["id"],
  },
};

export const UPDATE_TASK_TOOL: Tool = {
  name: "update_task",
  description:
    "Update an existing task. You can modify any of its properties including title, description, status, priority, dates, assignees, tags, and custom properties.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The 12-character alphanumeric ID of the task",
        pattern: "^[a-zA-Z0-9]{12}$",
      },
      title: {
        type: "string",
        description: "The title of the task",
      },
      description: {
        type: "string",
        description:
          "A longer description of the task, which can include markdown formatting",
      },
      status: {
        type: "string",
        description: "The status from the list of available statuses",
      },
      priority: {
        type: "string",
        description: "The priority (Critical, High, Medium, or Low)",
      },
      size: {
        type: ["string", "number", "null"],
        description: "The size which represents the amount of work needed",
      },
      startAt: {
        type: "string",
        description:
          "The start date in ISO format (should be at 9:00am in user's timezone)",
      },
      dueAt: {
        type: "string",
        description:
          "The due date in ISO format (should be at 9:00am in user's timezone)",
      },
      dartboard: {
        type: "string",
        description: "The title of the dartboard (project or list of tasks)",
      },
      assignees: {
        type: "array",
        items: { type: "string" },
        description:
          "Array of assignee names or emails (if workspace allows multiple assignees)",
      },
      assignee: {
        type: "string",
        description:
          "Single assignee name or email (if workspace doesn't allow multiple assignees)",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Array of tags to apply to the task",
      },
      parentId: {
        type: "string",
        description: "The ID of the parent task",
      },
      customProperties: CUSTOM_PROPERTIES_SCHEMA,
    },
    required: ["id"],
  },
};

export const DELETE_TASK_TOOL: Tool = {
  name: "delete_task",
  description:
    "Move an existing task to the trash, where it can be recovered if needed. Nothing else about the task will be changed.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The 12-character alphanumeric ID of the task",
        pattern: "^[a-zA-Z0-9]{12}$",
      },
    },
    required: ["id"],
  },
};

export const ADD_TASK_COMMENT_TOOL: Tool = {
  name: "add_task_comment",
  description:
    "Add a comment to an existing task without modifying the task description. Comments support markdown formatting.",
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "The 12-character alphanumeric ID of the task",
        pattern: "^[a-zA-Z0-9]{12}$",
      },
      text: {
        type: "string",
        description:
          "The full content of the comment, which can include markdown formatting.",
      },
    },
    required: ["taskId", "text"],
  },
};

export const LIST_TASK_COMMENTS_TOOL: Tool = {
  name: "list_task_comments",
  description:
    "List comments from Dart with optional filtering parameters. You can filter by author, task, text content, dates, and more.",
  inputSchema: {
    type: "object",
    properties: {
      author: {
        type: "string",
        description: "Filter by author name or email",
      },
      author_id: {
        type: "string",
        description: "Filter by author ID",
      },
      ids: {
        type: "string",
        description: "Filter by comment IDs",
      },
      limit: {
        type: "number",
        description: "Number of results per page",
      },
      offset: {
        type: "number",
        description: "Initial index for pagination",
      },
      parent_id: {
        type: "string",
        description: "Filter by parent comment ID",
      },
      published_at_after: {
        type: "string",
        description: "Filter by published date after (ISO format)",
      },
      published_at_before: {
        type: "string",
        description: "Filter by published date before (ISO format)",
      },
      task: {
        type: "string",
        description: "Filter by task title",
      },
      task_id: {
        type: "string",
        description: "Filter by task ID",
      },
      text: {
        type: "string",
        description: "Filter by comment text content",
      },
    },
    required: [],
  },
};

export const LIST_DOCS_TOOL: Tool = {
  name: "list_docs",
  description:
    "List docs from Dart with optional filtering parameters. You can filter by folder, title, text content, and more.",
  inputSchema: {
    type: "object",
    properties: {
      folder: {
        type: "string",
        description: "Filter by folder title",
      },
      folder_id: {
        type: "string",
        description: "Filter by folder ID",
      },
      ids: {
        type: "string",
        description: "Filter by IDs",
      },
      in_trash: {
        type: "boolean",
        description: "Filter by trash status",
      },
      limit: {
        type: "number",
        description: "Number of results per page",
      },
      offset: {
        type: "number",
        description: "Initial index for pagination",
      },
      s: {
        type: "string",
        description: "Search by title, text, or folder title",
      },
      o: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "-created_at",
            "-order",
            "-title",
            "-updated_at",
            "created_at",
            "order",
            "title",
            "updated_at",
          ],
        },
        description: "Ordering options (use - prefix for descending)",
      },
      text: {
        type: "string",
        description: "Filter by text content",
      },
      title: {
        type: "string",
        description: "Filter by title",
      },
    },
    required: [],
  },
};

export const CREATE_DOC_TOOL: Tool = {
  name: "create_doc",
  description:
    "Create a new doc in Dart. You can specify title, text content, and folder.",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "The title of the doc (required)",
      },
      text: {
        type: "string",
        description:
          "The text content of the doc, which can include markdown formatting",
      },
      folder: {
        type: "string",
        description: "The title of the folder to place the doc in",
      },
    },
    required: ["title"],
  },
};

export const GET_DOC_TOOL: Tool = {
  name: "get_doc",
  description:
    "Retrieve an existing doc by its ID. Returns the doc's information including title, text content, folder, and more.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The 12-character alphanumeric ID of the doc",
        pattern: "^[a-zA-Z0-9]{12}$",
      },
    },
    required: ["id"],
  },
};

export const UPDATE_DOC_TOOL: Tool = {
  name: "update_doc",
  description:
    "Update an existing doc. You can modify its title, text content, and folder.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The 12-character alphanumeric ID of the doc",
        pattern: "^[a-zA-Z0-9]{12}$",
      },
      title: {
        type: "string",
        description: "The title of the doc",
      },
      text: {
        type: "string",
        description:
          "The text content of the doc, which can include markdown formatting",
      },
      folder: {
        type: "string",
        description: "The title of the folder to place the doc in",
      },
    },
    required: ["id"],
  },
};

export const DELETE_DOC_TOOL: Tool = {
  name: "delete_doc",
  description:
    "Move an existing doc to the trash, where it can be recovered if needed. Nothing else about the doc will be changed.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The 12-character alphanumeric ID of the doc",
        pattern: "^[a-zA-Z0-9]{12}$",
      },
    },
    required: ["id"],
  },
};

export const GET_DARTBOARD_TOOL: Tool = {
  name: "get_dartboard",
  description:
    "Retrieve an existing dartboard by its ID. Returns the dartboard's information including title, description, and all tasks within it.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The 12-character alphanumeric ID of the dartboard",
        pattern: "^[a-zA-Z0-9]{12}$",
      },
    },
    required: ["id"],
  },
};

export const GET_FOLDER_TOOL: Tool = {
  name: "get_folder",
  description:
    "Retrieve an existing folder by its ID. Returns the folder's information including title, description, and all docs within it.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The 12-character alphanumeric ID of the folder",
        pattern: "^[a-zA-Z0-9]{12}$",
      },
    },
    required: ["id"],
  },
};

export const GET_VIEW_TOOL: Tool = {
  name: "get_view",
  description:
    "Retrieve an existing view by its ID. Returns the view's information including title, description, and all tasks within it.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The 12-character alphanumeric ID of the view",
        pattern: "^[a-zA-Z0-9]{12}$",
      },
    },
    required: ["id"],
  },
};
