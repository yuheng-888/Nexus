const { contextBridge, ipcRenderer } = require("electron");

const nexusApi = {
  agent: {
    start: (options) => ipcRenderer.invoke("nexus:agent:start", options)
  },
  api: {
    active: () => ipcRenderer.invoke("nexus:api:active"),
    add: (config) => ipcRenderer.invoke("nexus:api:add", config),
    configs: () => ipcRenderer.invoke("nexus:api:configs"),
    presets: () => ipcRenderer.invoke("nexus:api:presets"),
    remove: (id) => ipcRenderer.invoke("nexus:api:remove", id),
    setActive: (id) => ipcRenderer.invoke("nexus:api:setActive", id),
    test: (id) => ipcRenderer.invoke("nexus:api:test", id),
    update: (id, updates) => ipcRenderer.invoke("nexus:api:update", id, updates)
  },
  file: {
    find: (query) => ipcRenderer.invoke("nexus:file:find", query),
    list: (path) => ipcRenderer.invoke("nexus:file:list", path),
    read: (path) => ipcRenderer.invoke("nexus:file:read", path),
    readAbsolute: (path) => ipcRenderer.invoke("nexus:file:readAbsolute", path),
    write: (path, content) => ipcRenderer.invoke("nexus:file:write", path, content),
    writeAbsolute: (path, content) => ipcRenderer.invoke("nexus:file:writeAbsolute", path, content)
  },
  languages: {
    completions: (request) => ipcRenderer.invoke("nexus:languages:completions", request),
    definition: (request) => ipcRenderer.invoke("nexus:languages:definition", request),
    diagnostics: (request) => ipcRenderer.invoke("nexus:languages:diagnostics", request),
    documentSymbols: (request) => ipcRenderer.invoke("nexus:languages:documentSymbols", request),
    hover: (request) => ipcRenderer.invoke("nexus:languages:hover", request),
    openDocument: (input) => ipcRenderer.invoke("nexus:languages:openDocument", input),
    references: (request) => ipcRenderer.invoke("nexus:languages:references", request),
    updateDocument: (input) => ipcRenderer.invoke("nexus:languages:updateDocument", input)
  },
  git: {
    abortMerge: () => ipcRenderer.invoke("nexus:git:abortMerge"),
    abortRebase: () => ipcRenderer.invoke("nexus:git:abortRebase"),
    addRemote: (request) => ipcRenderer.invoke("nexus:git:addRemote", request),
    branches: (cwd) => ipcRenderer.invoke("nexus:git:branches", cwd),
    checkoutBranch: (request) => ipcRenderer.invoke("nexus:git:checkoutBranch", request),
    commit: (message) => ipcRenderer.invoke("nexus:git:commit", message),
    createBranch: (request) => ipcRenderer.invoke("nexus:git:createBranch", request),
    createTag: (request) => ipcRenderer.invoke("nexus:git:createTag", request),
    deleteBranch: (request) => ipcRenderer.invoke("nexus:git:deleteBranch", request),
    deleteTag: (name) => ipcRenderer.invoke("nexus:git:deleteTag", name),
    diff: (request) => ipcRenderer.invoke("nexus:git:diff", request),
    discardAll: () => ipcRenderer.invoke("nexus:git:discardAll"),
    discardFile: (path) => ipcRenderer.invoke("nexus:git:discardFile", path),
    fetch: (request) => ipcRenderer.invoke("nexus:git:fetch", request),
    init: (request) => ipcRenderer.invoke("nexus:git:init", request),
    listBranches: (cwd) => ipcRenderer.invoke("nexus:git:listBranches", cwd),
    log: (request) => ipcRenderer.invoke("nexus:git:log", request),
    merge: (branch) => ipcRenderer.invoke("nexus:git:merge", branch),
    pull: (request) => ipcRenderer.invoke("nexus:git:pull", request),
    publishSafetyScan: () => ipcRenderer.invoke("nexus:git:publishSafetyScan"),
    publishToGitHub: (request) => ipcRenderer.invoke("nexus:git:publishToGitHub", request),
    push: (request) => ipcRenderer.invoke("nexus:git:push", request),
    rebase: (branch) => ipcRenderer.invoke("nexus:git:rebase", branch),
    removeRemote: (name) => ipcRenderer.invoke("nexus:git:removeRemote", name),
    remotes: (cwd) => ipcRenderer.invoke("nexus:git:remotes", cwd),
    show: (ref) => ipcRenderer.invoke("nexus:git:show", ref),
    stage: (path) => ipcRenderer.invoke("nexus:git:stage", path),
    stageAll: () => ipcRenderer.invoke("nexus:git:stageAll"),
    stashApply: (ref) => ipcRenderer.invoke("nexus:git:stashApply", ref),
    stashDrop: (ref) => ipcRenderer.invoke("nexus:git:stashDrop", ref),
    stashList: () => ipcRenderer.invoke("nexus:git:stashList"),
    stashPop: (ref) => ipcRenderer.invoke("nexus:git:stashPop", ref),
    stashPush: (request) => ipcRenderer.invoke("nexus:git:stashPush", request),
    status: (cwd) => ipcRenderer.invoke("nexus:git:status", cwd),
    summary: (cwd) => ipcRenderer.invoke("nexus:git:summary", cwd),
    tagList: () => ipcRenderer.invoke("nexus:git:tagList"),
    unstage: (path) => ipcRenderer.invoke("nexus:git:unstage", path),
    unstageAll: () => ipcRenderer.invoke("nexus:git:unstageAll")
  },
  conversations: {
    clear: (id) => ipcRenderer.invoke("nexus:conversations:clear", id),
    delete: (id) => ipcRenderer.invoke("nexus:conversations:delete", id),
    get: (id) => ipcRenderer.invoke("nexus:conversations:get", id),
    list: () => ipcRenderer.invoke("nexus:conversations:list")
  },
  dialog: {
    pickPath: (request) => ipcRenderer.invoke("nexus:dialog:pickPath", request)
  },
  marketplace: {
    plugins: {
      installed: () => ipcRenderer.invoke("nexus:plugins:installed"),
      install: (id) => ipcRenderer.invoke("nexus:plugins:install", id),
      list: () => ipcRenderer.invoke("nexus:plugins:list"),
      search: (request) => ipcRenderer.invoke("nexus:plugins:search", request),
      toggle: (id) => ipcRenderer.invoke("nexus:plugins:toggle", id),
      uninstall: (id) => ipcRenderer.invoke("nexus:plugins:uninstall", id)
    },
    skills: {
      installed: () => ipcRenderer.invoke("nexus:skills:installed"),
      install: (id) => ipcRenderer.invoke("nexus:skills:install", id),
      list: () => ipcRenderer.invoke("nexus:skills:list"),
      search: (request) => ipcRenderer.invoke("nexus:skills:search", request),
      toggle: (id) => ipcRenderer.invoke("nexus:skills:toggle", id),
      uninstall: (id) => ipcRenderer.invoke("nexus:skills:uninstall", id)
    }
  },
  mcp: {
    add: (request) => ipcRenderer.invoke("nexus:mcp:add", request),
    install: (id) => ipcRenderer.invoke("nexus:mcp:install", id),
    list: () => ipcRenderer.invoke("nexus:mcp:list"),
    remove: (name) => ipcRenderer.invoke("nexus:mcp:remove", name),
    search: (request) => ipcRenderer.invoke("nexus:mcp:search", request),
    toggle: (name) => ipcRenderer.invoke("nexus:mcp:toggle", name)
  },
  rag: {
    context: (request) => ipcRenderer.invoke("nexus:rag:context", request),
    index: {
      build: () => ipcRenderer.invoke("nexus:rag:index:build"),
      clear: () => ipcRenderer.invoke("nexus:rag:index:clear"),
      status: () => ipcRenderer.invoke("nexus:rag:index:status")
    },
    search: (request) => ipcRenderer.invoke("nexus:rag:search", request)
  },
  reverse: {
    analysis: {
      scan: (request) => ipcRenderer.invoke("nexus:reverse:analysis:scan", request)
    },
    asar: {
      diff: (request) => ipcRenderer.invoke("nexus:reverse:asar:diff", request),
      extract: (request) => ipcRenderer.invoke("nexus:reverse:asar:extract", request),
      inspect: (request) => ipcRenderer.invoke("nexus:reverse:asar:inspect", request),
      pack: (request) => ipcRenderer.invoke("nexus:reverse:asar:pack", request)
    },
    jshook: {
      generate: (request) => ipcRenderer.invoke("nexus:reverse:jshook:generate", request),
      inject: (request) => ipcRenderer.invoke("nexus:reverse:jshook:inject", request),
      restore: (request) => ipcRenderer.invoke("nexus:reverse:jshook:restore", request)
    },
    projects: {
      add: (draft) => ipcRenderer.invoke("nexus:reverse:projects:add", draft),
      list: () => ipcRenderer.invoke("nexus:reverse:projects:list"),
      remove: (id) => ipcRenderer.invoke("nexus:reverse:projects:remove", id)
    },
    target: {
      detect: (path) => ipcRenderer.invoke("nexus:reverse:target:detect", path)
    }
  },
  search: (request) => ipcRenderer.invoke("nexus:search", request),
  shell: {
    revealPath: (path) => ipcRenderer.invoke("nexus:shell:revealPath", path)
  },
  session: {
    kill: (sessionId) => ipcRenderer.invoke("nexus:session:kill", sessionId),
    onData: (handler) => subscribe("nexus:session:data", handler),
    onExit: (handler) => subscribe("nexus:session:exit", handler),
    resize: (sessionId, cols, rows) => {
      return ipcRenderer.invoke("nexus:session:resize", sessionId, cols, rows);
    },
    write: (sessionId, data) => ipcRenderer.invoke("nexus:session:write", sessionId, data)
  },
  subagents: {
    list: () => ipcRenderer.invoke("nexus:subagents:list"),
    profiles: () => ipcRenderer.invoke("nexus:subagents:profiles"),
    start: (options) => ipcRenderer.invoke("nexus:subagents:start", options)
  },
  workflows: {
    delete: (id) => ipcRenderer.invoke("nexus:workflows:delete", id),
    get: (id) => ipcRenderer.invoke("nexus:workflows:get", id),
    list: () => ipcRenderer.invoke("nexus:workflows:list"),
    run: (request) => ipcRenderer.invoke("nexus:workflows:run", request),
    runs: () => ipcRenderer.invoke("nexus:workflows:runs"),
    save: (definition) => ipcRenderer.invoke("nexus:workflows:save", definition)
  },
  terminal: {
    create: (options) => ipcRenderer.invoke("nexus:terminal:create", options)
  },
  workspace: {
    get: () => ipcRenderer.invoke("nexus:workspace:get"),
    open: () => ipcRenderer.invoke("nexus:workspace:open"),
    openRecent: (workspaceRoot) => ipcRenderer.invoke("nexus:workspace:openRecent", workspaceRoot),
    recent: () => ipcRenderer.invoke("nexus:workspace:recent")
  }
};

contextBridge.exposeInMainWorld("nexus", nexusApi);

function subscribe(channel, handler) {
  const listener = (_event, payload) => handler(payload);

  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.off(channel, listener);
}
