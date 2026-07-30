# Admin functionality

- [Admin functionality](#admin-functionality)
  - [Local setup](#local-setup)
  - [Deploy](#deploy)
  - [Dependency updating](#dependency-updating)

## Local setup

1. Copy `.env.example` to `.env` and fill out the environment variables
2. Run `bun install` to install the dependencies
3. Run `bun run build` to build the library
4. To debug with the MCP inspector
   1. Run `bun run start:mcp-inspector`
   2. Open [the page for the inspector](http://127.0.0.1:6274)
   3. Click 'Connect'
5. To use the local build with Claude Desktop, add the following to your `claude_desktop_config.json`:

   ```json
   {
     "mcpServers": {
       "dart": {
         "command": "node",
         "args": ["<PATH_TO_WORKSPACE>/dart-mcp-server/dist/index.js"],
         "env": {
           "DART_TOKEN": "dsa_...",
           "DART_HOST": "http://localhost:5100"
         }
       }
     }
   }
   ```

## Deploy

1. Commit and push all local changes to GitHub
2. Run `npm login` if needed
3. Run `bun run release` and follow the prompts (usually they are all a yes), confirming each step by pressing enter

## Dependency updating

1. Update node, replace the current version in `dockerfile` with [the latest stable version](https://nodejs.org/en/download)
2. Run `bun run req-up-all` and select everything to update all FE dependencies
3. Manually set the versions in `dependencies`, but not `devDependencies`, to be `~` the lowest functional minor version
4. Run `bun install`
