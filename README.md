<div align="center">
  <h1>Dart MCP Server</h1>
  <p>
    <a href="https://npmjs.com/package/dart-mcp-server"><img src="https://img.shields.io/npm/v/dart-mcp-server" alt="NPM"></a>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/its-dart/dart-mcp-server" alt="License"></a>
  </p>
</div>

[Dart](https://dartai.com?nr=1) is Project Management powered by AI.

`dart-mcp-server` is the official AI [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol) server for Dart.

- [Features](#features)
  - [Prompts](#prompts)
  - [Resource templates](#resource-templates)
  - [Tools](#tools)
    - [Task management](#task-management)
    - [Document management](#document-management)
- [Setup](#setup)
  - [Find the MCP settings file for the client](#find-the-mcp-settings-file-for-the-client)
    - [Claude Desktop](#claude-desktop)
    - [Claude Code](#claude-code)
    - [Cursor](#cursor)
    - [Cline](#cline)
    - [Windsurf](#windsurf)
    - [Any other client](#any-other-client)
  - [Set up the MCP server](#set-up-the-mcp-server)
  - [Variant: setup with Docker](#variant-setup-with-docker)
- [Help and Resources](#help-and-resources)
- [Contributing](#contributing)
- [License](#license)

## Features

### Prompts

The following prompts are available

- `create-task` - Create a new task in Dart with title, description, status, priority, and assignee
- `create-doc` - Create a new document in Dart with title, text content, and folder
- `summarize-tasks` - Get a summary of tasks with optional filtering by status and assignee

These prompts make it easy for AI assistants to perform common actions in Dart without needing to understand the underlying API details.

### Resource templates

The following resources are available

- `dart-config:` - Configuration information about the user's space
- `dart-task:///{taskId}` - Detailed information about specific tasks
- `dart-doc:///{docId}` - Detailed information about specific docs

### Tools

The following tools are available

#### Task management

- `get_config` - Get information about the user's space, including available assignees, dartboards, folders, statuses, tags, priorities, and sizes
- `list_tasks` - List tasks with optional filtering by assignee, status, dartboard, priority, due date, and more
- `create_task` - Create a new task with title, description, status, priority, size, dates, dartboard, assignees, tags, and parent task
- `get_task` - Retrieve an existing task by its ID
- `update_task` - Update an existing task's properties
- `delete_task` - Move a task to the trash (recoverable)
- `add_task_comment` - Add a comment to an existing task

#### Document management

- `list_docs` - List docs with optional filtering by folder, title, text content, and more
- `create_doc` - Create a new doc with title, text content, and folder
- `get_doc` - Retrieve an existing doc by its ID
- `update_doc` - Update an existing doc's properties
- `delete_doc` - Move a doc to the trash (recoverable)

Each tool supports comprehensive input validation and returns structured JSON responses.

## Setup

The easiest way to run the MCP server is with `npx`, but a Docker setup is also available.

### Find the MCP settings file for the client

#### Claude Desktop

1. [Install Claude Desktop](https://claude.ai/download) as needed
2. Open the config file by opening the Claude Desktop app, going into its Settings, opening the 'Developer' tab, and clicking the 'Edit Config' button
3. Follow the 'Set up the MCP server' steps below

#### Claude Code

1. Install [Claude Code](https://docs.anthropic.com/en/docs/claude-code/getting-started) as needed
2. Copy your authentication token from [your Dart profile](https://app.itsdart.com/?settings=account)
3. Run the following command, being sure to replace `dsa...` with your actual Dart token

   ```bash
   claude mcp add dart -e DART_TOKEN=dsa_... -- npx -y dart-mcp-server
   ```

#### Cursor

1. [Install Cursor](https://www.cursor.com/downloads) as needed
2. Open the config file by opening Cursor, going into 'Cursor Settings' (not the normal VSCode IDE settings), opening the 'MCP' tab, and clicking the 'Add new global MCP server' button
3. Follow the 'Set up the MCP server' steps below

#### Cline

1. [Install Cline](https://cline.bot/) in your IDE as needed
2. Open the config file by opening your IDE, opening the Cline sidebar, clicking the 'MCP Servers' icon button that is second from left at the top, opening the 'Installed' tab, and clicking the 'Configure MCP Servers' button
3. Follow the 'Set up the MCP server' steps below

#### Windsurf

1. [Install Windsurf](https://windsurf.com/download) as needed
2. Open the config file by opening Windsurf, going into 'Windsurf Settings' (not the normal VSCode IDE settings), opening the 'Cascade' tab, and clicking the 'View raw config' button in the 'Model Context Protocol (MCP) Servers' section
3. Follow the 'Set up the MCP server' steps below

#### Any other client

1. Find the MCP settings file, usually something like `[client]_mcp_config.json`
2. Follow the 'Set up the MCP server' steps below

### Set up the MCP server

1. [Install npx](https://nodejs.org/en/download), which comes bundled with Node, as needed
2. Copy your authentication token from [your Dart profile](https://app.itsdart.com/?settings=account)
3. Add the following to your MCP setup, being sure to replace `dsa...` with your actual Dart token

   ```json
   {
     "mcpServers": {
       "dart": {
         "command": "npx",
         "args": ["-y", "dart-mcp-server"],
         "env": {
           "DART_TOKEN": "dsa_..."
         }
       }
     }
   }
   ```

### Variant: setup with Docker

If the `npx` setup above does not work well, we also provide a Docker setup. Follow the instructions above to find the MCP settings file

1. [Install Docker](https://www.docker.com/products/docker-desktop/) as needed
2. Build the Docker container with `docker build -t mcp/dart .`
3. Copy your authentication token from [your Dart profile](https://app.itsdart.com/?settings=account)
4. Add the following to your MCP setup, being sure to replace `dsa...` with your actual Dart token

   ```json
   {
     "mcpServers": {
       "dart": {
         "command": "bash",
         "args": [
           "-c",
           "docker rm -f dart-mcp >/dev/null 2>&1 || true; docker run -i --rm --name dart-mcp -e DART_TOKEN mcp/dart"
         ],
         "env": {
           "DART_TOKEN": "dsa_..."
         }
       }
     }
   }
   ```

## Help and Resources

- [Homepage](https://dartai.com/?nr=1)
- [Web App](https://app.itsdart.com/)
- [Help Center](https://help.dartai.com/)
- [Bugs and Features](https://app.itsdart.com/p/r/JFyPnhL9En61)
- [Library Source](https://github.com/its-dart/dart-mcp-server/)
- [Chat on Discord](https://discord.gg/RExv8jEkSh)
- Email us at [support@dartai.com](mailto:support@dartai.com)

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under [the MIT License](LICENSE).
