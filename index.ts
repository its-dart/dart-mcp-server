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

// Prompts
const CREATE_TASK_PROMPT_NAME = "Create task";
const CREATE_TASK_PROMPT: Prompt = {
  name: CREATE_TASK_PROMPT_NAME,
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

const CREATE_DOC_PROMPT_NAME = "Create doc";
const CREATE_DOC_PROMPT: Prompt = {
  name: CREATE_DOC_PROMPT_NAME,
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

const SUMMARIZE_TASKS_PROMPT_NAME = "Summarize tasks";
const SUMMARIZE_TASKS_PROMPT: Prompt = {
  name: SUMMARIZE_TASKS_PROMPT_NAME,
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
const CONFIG_RESOURCE_TEMPLATE: ResourceTemplate = {
  uriTemplate: "dart-config:",
  name: "Dart config",
  description:
    "Information about the authenticated user associated with the API key, including their role, teams, and settings.",
  parameters: {},
  examples: ["dart-config:"],
};

const TASK_RESOURCE_TEMPLATE: ResourceTemplate = {
  uriTemplate: "dart-task:///{taskId}",
  name: "Dart task",
  description:
    "A Dart task with its title, description, status, priority, dates, and more. Use this to fetch detailed information about a specific task.",
  parameters: {
    taskId: {
      type: "string",
      description: "The unique identifier of the Dart task",
    },
  },
  examples: ["dart-task:///9q5qtB8n2Qn6"],
};

const DOC_RESOURCE_TEMPLATE: ResourceTemplate = {
  uriTemplate: "dart-doc:///{docId}",
  name: "Dart doc",
  description:
    "A Dart doc with its title, text content, and folder. Use this to fetch detailed information about a specific doc.",
  parameters: {
    docId: {
      type: "string",
      description: "The unique identifier of the Dart doc",
    },
  },
  examples: ["dart-doc:///9q5qtB8n2Qn6"],
};

// Tools
const GET_CONFIG_TOOL: Tool = {
  name: "get_config",
  description:
    "Get information about the user's space, including all of the possible values that can be provided to other endpoints. This includes available assignees, dartboards, folders, statuses, tags, priorities, and sizes.",
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
    "Create a new task in Dart. You can specify title, description, status, priority, size, dates, dartboard, assignees, tags, and parent task.",
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
    },
    required: ["title"],
  },
};

const GET_TASK_TOOL: Tool = {
  name: "get_task",
  description:
    "Retrieve an existing task by its ID. Returns the task's information including title, description, status, priority, dates, and more.",
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
    "Update an existing task. You can modify any of its properties including title, description, status, priority, dates, assignees, and more.",
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
  const promptName = request.params.name;

  if (promptName === CREATE_TASK_PROMPT_NAME) {
    const title = request.params.arguments?.title || "(no title)";
    const description = request.params.arguments?.description || "";
    const status = request.params.arguments?.status || "";
    const priority = request.params.arguments?.priority || "";
    const assignee = request.params.arguments?.assignee || "";

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

  if (promptName === CREATE_DOC_PROMPT_NAME) {
    const title = request.params.arguments?.title || "(no title)";
    const text = request.params.arguments?.text || "";
    const folder = request.params.arguments?.folder || "";

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

  if (promptName === SUMMARIZE_TASKS_PROMPT_NAME) {
    const status = request.params.arguments?.status || "";
    const assignee = request.params.arguments?.assignee || "";

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

  throw new Error(`Unknown prompt: ${promptName}`);
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

  if (protocol === "dart-config") {
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

  if (protocol === "dart-task:") {
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

  if (protocol === "dart-doc:") {
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
  tools: [
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
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (!request.params.arguments) {
      throw new Error("Arguments are required");
    }

    switch (request.params.name) {
      case "get_config": {
        const config = await ConfigService.getConfig();
        return {
          content: [{ type: "text", text: JSON.stringify(config, null, 2) }],
        };
      }
      case "list_tasks": {
        const tasks = await TaskService.listTasks(request.params.arguments);
        return {
          content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }],
        };
      }
      case "create_task": {
        const taskData = request.params.arguments as TaskCreate;
        const task = await TaskService.createTask({ item: taskData });
        return {
          content: [{ type: "text", text: JSON.stringify(task, null, 2) }],
        };
      }
      case "get_task": {
        const id = getIdValidated(request.params.arguments.id);
        const task = await TaskService.retrieveTask(id);
        return {
          content: [{ type: "text", text: JSON.stringify(task, null, 2) }],
        };
      }
      case "update_task": {
        const id = getIdValidated(request.params.arguments.id);
        const taskData = request.params.arguments as TaskUpdate;
        const task = await TaskService.updateTask(id, {
          item: taskData,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(task, null, 2) }],
        };
      }
      case "delete_task": {
        const id = getIdValidated(request.params.arguments.id);
        const task = await TaskService.deleteTask(id);
        return {
          content: [{ type: "text", text: JSON.stringify(task, null, 2) }],
        };
      }
      case "add_task_comment": {
        const taskId = getIdValidated(request.params.arguments.taskId);
        const text = request.params.arguments.text;
        const commentData = { taskId, text } as CommentCreate;
        const comment = await CommentService.createComment({
          item: commentData,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(comment, null, 2) }],
        };
      }
      case "list_docs": {
        const docs = await DocService.listDocs(request.params.arguments);
        return {
          content: [{ type: "text", text: JSON.stringify(docs, null, 2) }],
        };
      }
      case "create_doc": {
        const docData = request.params.arguments as DocCreate;
        const doc = await DocService.createDoc({
          item: docData,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(doc, null, 2) }],
        };
      }
      case "get_doc": {
        const id = getIdValidated(request.params.arguments.id);
        const doc = await DocService.retrieveDoc(id);
        return {
          content: [{ type: "text", text: JSON.stringify(doc, null, 2) }],
        };
      }
      case "update_doc": {
        const id = getIdValidated(request.params.arguments.id);
        const docData = request.params.arguments as DocUpdate;
        const doc = await DocService.updateDoc(id, { item: docData });
        return {
          content: [{ type: "text", text: JSON.stringify(doc, null, 2) }],
        };
      }
      case "delete_doc": {
        const id = getIdValidated(request.params.arguments.id);
        const doc = await DocService.deleteDoc(id);
        return {
          content: [{ type: "text", text: JSON.stringify(doc, null, 2) }],
        };
      }
      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
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
