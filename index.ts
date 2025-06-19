#!/usr/bin/env node

import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  ResourceTemplate,
  Tool,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Prompt,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  ApiError,
  CommentCreate,
  CommentService,
  ConfigService,
  DocCreate,
  DocService,
  DocUpdate,
  TaskCreate,
  TaskService,
  TaskUpdate,
} from "dart-tools";

const ID_REGEX = /^[a-zA-Z0-9]{12}$/;

const token = process.env.DART_TOKEN;
if (!token) {
  console.error("DART_TOKEN environment variable is required");
  process.exit(1);
}

const filename = fileURLToPath(import.meta.url);
const packageJson = JSON.parse(
  readFileSync(join(dirname(filename), "..", "package.json"), "utf-8"),
);

const getIdValidated = (strMaybe: any): string => {
  if (typeof strMaybe !== "string" && !(strMaybe instanceof String)) {
    throw new Error("ID must be a string");
  }
  const id = strMaybe.toString();
  if (!ID_REGEX.test(id)) {
    throw new Error(`ID must be 12 alphanumeric characters`);
  }
  return id;
};

const CUSTOM_PROPERTIES_SCHEMA = {
  type: "object",
  description:
    "Custom properties to apply to the task. Use the property names from the config. Examples: { 'customCheckboxProperty': true, 'customTextProperty': 'Some text', 'customNumberProperty': 5, 'customSelectProperty': 'Option Name', 'customDatesProperty': '2025-05-10', 'customDatesPropertyWithRange': ['2025-05-01', '2025-05-30'], 'customMultiselectProperty': ['option1', 'option2'], 'customUserProperty': 'user@example.com', 'customMultipleUserProperty': ['user1@example.com', 'user2@example.com'] }",
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
        title: "CustomPropertyUserMultiple",
        type: "array",
        items: { type: "string" },
      },
      { title: "CustomPropertyUserSingle", type: ["string", "null"] },
    ],
  },
};

// Prompts
const CREATE_TASK_PROMPT: Prompt = {
  name: "Create task",
  description: "Create a new task in Dart",
  arguments: [
    {
      name: "title",
      description: "Title of the task",
      required: true,
    },
    {
      name: "description",
      description: "Description of the task",
      required: false,
    },
    {
      name: "status",
      description: "Status of the task",
      required: false,
    },
    {
      name: "priority",
      description: "Priority of the task",
      required: false,
    },
    {
      name: "assignee",
      description: "Email of the assignee",
      required: false,
    },
  ],
};

const CREATE_DOC_PROMPT: Prompt = {
  name: "Create doc",
  description: "Create a new document in Dart",
  arguments: [
    {
      name: "title",
      description: "Title of the document",
      required: true,
    },
    {
      name: "text",
      description: "Content of the document",
      required: false,
    },
    {
      name: "folder",
      description: "Folder to place the document in",
      required: false,
    },
  ],
};

const SUMMARIZE_TASKS_PROMPT: Prompt = {
  name: "Summarize tasks",
  description: "Get a summary of tasks with optional filtering",
  arguments: [
    {
      name: "status",
      description: "Filter by status (e.g., 'In Progress', 'Done')",
      required: false,
    },
    {
      name: "assignee",
      description: "Filter by assignee email",
      required: false,
    },
  ],
};

// Resources
const CONFIG_PROTOCOL = "dart-config";
const CONFIG_RESOURCE_TEMPLATE: ResourceTemplate = {
  uriTemplate: `${CONFIG_PROTOCOL}:`,
  name: "Dart config",
  description:
    "Information about the authenticated user associated with the API key, including their role, teams, and settings.",
  parameters: {},
  examples: [`${CONFIG_PROTOCOL}:`],
};

const TASK_PROTOCOL = "dart-task:";
const TASK_RESOURCE_TEMPLATE: ResourceTemplate = {
  uriTemplate: `${TASK_PROTOCOL}///{taskId}`,
  name: "Dart task",
  description:
    "A Dart task with its title, description, status, priority, dates, and more. Use this to fetch detailed information about a specific task.",
  parameters: {
    taskId: {
      type: "string",
      description: "The unique identifier of the Dart task",
    },
  },
  examples: [`${TASK_PROTOCOL}///9q5qtB8n2Qn6`],
};

const DOC_PROTOCOL = "dart-doc:";
const DOC_RESOURCE_TEMPLATE: ResourceTemplate = {
  uriTemplate: `${DOC_PROTOCOL}///{docId}`,
  name: "Dart doc",
  description:
    "A Dart doc with its title, text content, and folder. Use this to fetch detailed information about a specific doc.",
  parameters: {
    docId: {
      type: "string",
      description: "The unique identifier of the Dart doc",
    },
  },
  examples: [`${DOC_PROTOCOL}///9q5qtB8n2Qn6`],
};

// Tools
const GET_CONFIG_TOOL: Tool = {
  name: "get_config",
  description:
    "Get information about the user's space, including all of the possible values that can be provided to other endpoints. This includes available assignees, dartboards, folders, statuses, tags, priorities, sizes, and all custom property definitions.",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

const LIST_TASKS_TOOL: Tool = {
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
      assignee_duid: {
        type: "string",
        description: "Filter by assignee ID",
      },
      dartboard: {
        type: "string",
        description: "Filter by dartboard title",
      },
      dartboard_duid: {
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
      duids: { type: "string", description: "Filter by IDs" },
      in_trash: { type: "boolean", description: "Filter by trash status" },
      is_draft: { type: "boolean", description: "Filter by draft status" },
      kind: { type: "string", description: "Filter by task kind" },
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
      status_duid: { type: "string", description: "Filter by status ID" },
      subscriber_duid: {
        type: "string",
        description: "Filter by subscriber ID",
      },
      tag: { type: "string", description: "Filter by tag" },
      title: { type: "string", description: "Filter by title" },
    },
    required: [],
  },
};

const CREATE_TASK_TOOL: Tool = {
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
        type: "number",
        description: "A number that represents the amount of work needed",
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

const GET_TASK_TOOL: Tool = {
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

const UPDATE_TASK_TOOL: Tool = {
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
        type: "number",
        description: "A number that represents the amount of work needed",
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

const DELETE_TASK_TOOL: Tool = {
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

const ADD_TASK_COMMENT_TOOL: Tool = {
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

const LIST_DOCS_TOOL: Tool = {
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
      folder_duid: {
        type: "string",
        description: "Filter by folder ID",
      },
      duids: {
        type: "string",
        description: "Filter by IDs",
      },
      in_trash: {
        type: "boolean",
        description: "Filter by trash status",
      },
      is_draft: {
        type: "boolean",
        description: "Filter by draft status",
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

const CREATE_DOC_TOOL: Tool = {
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

const GET_DOC_TOOL: Tool = {
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

const UPDATE_DOC_TOOL: Tool = {
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

const DELETE_DOC_TOOL: Tool = {
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

const TOOLS = [
  GET_CONFIG_TOOL,
  LIST_TASKS_TOOL,
  CREATE_TASK_TOOL,
  GET_TASK_TOOL,
  UPDATE_TASK_TOOL,
  DELETE_TASK_TOOL,
  ADD_TASK_COMMENT_TOOL,
  LIST_DOCS_TOOL,
  CREATE_DOC_TOOL,
  GET_DOC_TOOL,
  UPDATE_DOC_TOOL,
  DELETE_DOC_TOOL,
];
const NO_ARGS_TOOL_NAMES = new Set(
  TOOLS.filter(
    (tool) =>
      !tool.inputSchema.properties ||
      Object.keys(tool.inputSchema.properties).length === 0,
  ).map((tool) => tool.name),
);

// Server
const server = new Server(
  {
    name: "dart-mcp",
    version: packageJson.version,
  },
  {
    capabilities: {
      prompts: {},
      resources: {},
      tools: {},
    },
  },
);

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [CREATE_TASK_PROMPT, CREATE_DOC_PROMPT, SUMMARIZE_TASKS_PROMPT],
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === CREATE_TASK_PROMPT.name) {
    const title = args?.title || "(no title)";
    const description = args?.description || "";
    const status = args?.status || "";
    const priority = args?.priority || "";
    const assignee = args?.assignee || "";

    return {
      description: "Create a new task in Dart",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Create a new task in Dart with the following details:
Title: ${title}
${description ? `Description: ${description}` : ""}
${status ? `Status: ${status}` : ""}
${priority ? `Priority: ${priority}` : ""}
${assignee ? `Assignee: ${assignee}` : ""}`,
          },
        },
      ],
    };
  }

  if (name === CREATE_DOC_PROMPT.name) {
    const title = args?.title || "(no title)";
    const text = args?.text || "";
    const folder = args?.folder || "";

    return {
      description: "Create a new document in Dart",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Create a new document in Dart with the following details:
Title: ${title}
${text ? `Content: ${text}` : ""}
${folder ? `Folder: ${folder}` : ""}`,
          },
        },
      ],
    };
  }

  if (name === SUMMARIZE_TASKS_PROMPT.name) {
    const status = args?.status || "";
    const assignee = args?.assignee || "";

    return {
      description: "Get a summary of tasks with optional filtering",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Summarize the tasks in Dart${status ? ` with status "${status}"` : ""}${assignee ? ` assigned to ${assignee}` : ""}.
Please include the total count, group by status, and list any high priority items.`,
          },
        },
      ],
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
});

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
  resourceTemplates: [
    CONFIG_RESOURCE_TEMPLATE,
    TASK_RESOURCE_TEMPLATE,
    DOC_RESOURCE_TEMPLATE,
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  const url = new URL(uri);
  const path = url.pathname.replace(/^\//, "");
  const { protocol } = url;

  if (protocol === CONFIG_PROTOCOL) {
    const config = await ConfigService.getConfig();
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(config, null, 2),
        },
      ],
    };
  }

  if (protocol === TASK_PROTOCOL) {
    const task = await TaskService.retrieveTask(path);
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(task, null, 2),
        },
      ],
    };
  }

  if (protocol === DOC_PROTOCOL) {
    const doc = await DocService.retrieveDoc(path);
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(doc, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: argsMaybe } = request.params;
  let args: Record<string, unknown>;
  try {
    if (argsMaybe) {
      args = argsMaybe;
    } else {
      if (!NO_ARGS_TOOL_NAMES.has(name)) {
        throw new Error("Arguments are required");
      } else {
        args = {};
      }
    }

    switch (name) {
      case GET_CONFIG_TOOL.name: {
        const config = await ConfigService.getConfig();
        return {
          content: [{ type: "text", text: JSON.stringify(config, null, 2) }],
        };
      }
      case LIST_TASKS_TOOL.name: {
        const tasks = await TaskService.listTasks(args);
        return {
          content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }],
        };
      }
      case CREATE_TASK_TOOL.name: {
        const taskData = args as TaskCreate;
        const task = await TaskService.createTask({ item: taskData });
        return {
          content: [{ type: "text", text: JSON.stringify(task, null, 2) }],
        };
      }
      case GET_TASK_TOOL.name: {
        const id = getIdValidated(args.id);
        const task = await TaskService.retrieveTask(id);
        return {
          content: [{ type: "text", text: JSON.stringify(task, null, 2) }],
        };
      }
      case UPDATE_TASK_TOOL.name: {
        const id = getIdValidated(args.id);
        const taskData = args as TaskUpdate;
        const task = await TaskService.updateTask(id, {
          item: taskData,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(task, null, 2) }],
        };
      }
      case DELETE_TASK_TOOL.name: {
        const id = getIdValidated(args.id);
        const task = await TaskService.deleteTask(id);
        return {
          content: [{ type: "text", text: JSON.stringify(task, null, 2) }],
        };
      }
      case ADD_TASK_COMMENT_TOOL.name: {
        const taskId = getIdValidated(args.taskId);
        const text = args.text;
        const commentData = { taskId, text } as CommentCreate;
        const comment = await CommentService.createComment({
          item: commentData,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(comment, null, 2) }],
        };
      }
      case LIST_DOCS_TOOL.name: {
        const docs = await DocService.listDocs(args);
        return {
          content: [{ type: "text", text: JSON.stringify(docs, null, 2) }],
        };
      }
      case CREATE_DOC_TOOL.name: {
        const docData = args as DocCreate;
        const doc = await DocService.createDoc({
          item: docData,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(doc, null, 2) }],
        };
      }
      case GET_DOC_TOOL.name: {
        const id = getIdValidated(args.id);
        const doc = await DocService.retrieveDoc(id);
        return {
          content: [{ type: "text", text: JSON.stringify(doc, null, 2) }],
        };
      }
      case UPDATE_DOC_TOOL.name: {
        const id = getIdValidated(args.id);
        const docData = args as DocUpdate;
        const doc = await DocService.updateDoc(id, { item: docData });
        return {
          content: [{ type: "text", text: JSON.stringify(doc, null, 2) }],
        };
      }
      case DELETE_DOC_TOOL.name: {
        const id = getIdValidated(args.id);
        const doc = await DocService.deleteDoc(id);
        return {
          content: [{ type: "text", text: JSON.stringify(doc, null, 2) }],
        };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Error(
        `API error: ${error.status} ${JSON.stringify(error.body) || error.message || "(unknown error)"}`,
      );
    }
    throw error;
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Dart MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
