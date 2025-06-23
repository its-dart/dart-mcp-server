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
  DartboardService,
  DocCreate,
  DocService,
  DocUpdate,
  FolderService,
  TaskCreate,
  TaskService,
  TaskUpdate,
  ViewService,
} from "dart-tools";

import {
  ADD_TASK_COMMENT_TOOL,
  CREATE_DOC_TOOL,
  CREATE_TASK_TOOL,
  DELETE_DOC_TOOL,
  DELETE_TASK_TOOL,
  GET_CONFIG_TOOL,
  GET_DARTBOARD_TOOL,
  GET_DOC_TOOL,
  GET_FOLDER_TOOL,
  GET_TASK_TOOL,
  GET_VIEW_TOOL,
  LIST_DOCS_TOOL,
  LIST_TASK_COMMENTS_TOOL,
  LIST_TASKS_TOOL,
  UPDATE_DOC_TOOL,
  UPDATE_TASK_TOOL,
} from "./tools.js";

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

const getIdValidated = (strMaybe: any, name: string = "ID"): string => {
  if (typeof strMaybe !== "string" && !(strMaybe instanceof String)) {
    throw new Error(`${name} must be a string`);
  }
  const id = strMaybe.toString();
  if (!ID_REGEX.test(id)) {
    throw new Error(`${name} must be 12 alphanumeric characters`);
  }
  return id;
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
const TOOLS = [
  // Config
  GET_CONFIG_TOOL,
  // Tasks
  CREATE_TASK_TOOL,
  LIST_TASKS_TOOL,
  GET_TASK_TOOL,
  UPDATE_TASK_TOOL,
  DELETE_TASK_TOOL,
  // Docs
  CREATE_DOC_TOOL,
  LIST_DOCS_TOOL,
  GET_DOC_TOOL,
  UPDATE_DOC_TOOL,
  DELETE_DOC_TOOL,
  // Comments
  ADD_TASK_COMMENT_TOOL,
  LIST_TASK_COMMENTS_TOOL,
  // Other
  GET_DARTBOARD_TOOL,
  GET_FOLDER_TOOL,
  GET_VIEW_TOOL,
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
      // Config
      case GET_CONFIG_TOOL.name: {
        const config = await ConfigService.getConfig();
        return {
          content: [{ type: "text", text: JSON.stringify(config, null, 2) }],
        };
      }
      // Tasks
      case CREATE_TASK_TOOL.name: {
        const taskData = args as TaskCreate;
        const task = await TaskService.createTask({ item: taskData });
        return {
          content: [{ type: "text", text: JSON.stringify(task, null, 2) }],
        };
      }
      case LIST_TASKS_TOOL.name: {
        const tasks = await TaskService.listTasks(args);
        return {
          content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }],
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
      // Docs
      case CREATE_DOC_TOOL.name: {
        const docData = args as DocCreate;
        const doc = await DocService.createDoc({
          item: docData,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(doc, null, 2) }],
        };
      }
      case LIST_DOCS_TOOL.name: {
        const docs = await DocService.listDocs(args);
        return {
          content: [{ type: "text", text: JSON.stringify(docs, null, 2) }],
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
      // Comments
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
      case LIST_TASK_COMMENTS_TOOL.name: {
        const taskId = getIdValidated(args.taskId, "taskId");
        const comments = await CommentService.listComments({ taskId, ...args });
        return {
          content: [{ type: "text", text: JSON.stringify(comments, null, 2) }],
        };
      }
      // Other tools
      case GET_DARTBOARD_TOOL.name: {
        const id = getIdValidated(args.id);
        const dartboard = await DartboardService.retrieveDartboard(id);
        return {
          content: [{ type: "text", text: JSON.stringify(dartboard, null, 2) }],
        };
      }
      case GET_FOLDER_TOOL.name: {
        const id = getIdValidated(args.id);
        const folder = await FolderService.retrieveFolder(id);
        return {
          content: [{ type: "text", text: JSON.stringify(folder, null, 2) }],
        };
      }
      case GET_VIEW_TOOL.name: {
        const id = getIdValidated(args.id);
        const view = await ViewService.retrieveView(id);
        return {
          content: [{ type: "text", text: JSON.stringify(view, null, 2) }],
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
