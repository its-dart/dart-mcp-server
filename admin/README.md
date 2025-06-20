# Admin functionality

- [Admin functionality](#admin-functionality)
  - [Local setup](#local-setup)
  - [Deploy](#deploy)
  - [Dependency updating](#dependency-updating)

## Local setup

1. Run `yarn install` to install the dependencies
2. Run `yarn build` to build the library
3. Debug with the MCP inspector
   1. Run `yarn start:mcp-inspector`
   2. Set up your environment variables:
      - Option A: Create a `.env` file in the project root with `DART_HOST` and `DART_TOKEN`
      - Option B: Fill out the environment variables in the MCP Inspector UI when it is opened
   3. Open [the page for the inspector](http://127.0.0.1:6274)
   4. Click 'Connect'
4. To use this with Claude Desktop, add the following to your `claude_desktop_config.json`:

   ```json
   {
     "mcpServers": {
       "dart": {
         "command": "node",
         "args": ["<PATH_TO_WORKSPACE>/dart-mcp-server/dist/index.js"],
         "env": {
           "DART_TOKEN": "dsa_...",
           "DART_HOST": "http://localhost:5173"
         }
       }
     }
   }
   ```

## Deploy

1. Commit and push all local changes to GitHub
2. Run `npm login` if needed
3. Run `yarn release` and follow the prompts (usually they are all a yes), confirming each step by pressing enter

## Dependency updating

1. Update node, replace the current version in `dockerfile` with the latest stable version [here](https://nodejs.org/en/download)
2. Run `yarn req-up-all` and select everything to update all FE dependencies
3. Manually set the versions in `dependencies`, but not `devDependencies`, to be `~` the lowest functional minor version
4. Run `yarn install`
