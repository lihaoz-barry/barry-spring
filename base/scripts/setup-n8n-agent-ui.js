#!/usr/bin/env node
const { Octokit } = require("octokit");

async function ensureRepository(octokit, { owner, repo, visibility, description }) {
  try {
    await octokit.rest.repos.get({ owner, repo });
    console.log(`Repository ${owner}/${repo} already exists.`);
  } catch (error) {
    if (error.status !== 404) throw error;
    const params = {
      name: repo,
      description,
      private: visibility === "private",
      auto_init: false,
      has_issues: true,
    };
    if (process.env.GITHUB_ORG) {
      await octokit.rest.repos.createInOrg({ org: process.env.GITHUB_ORG, ...params });
    } else {
      await octokit.rest.repos.createForAuthenticatedUser(params);
    }
    console.log(`Created repository ${owner}/${repo}.`);
  }
}

async function ensureRef(octokit, { owner, repo, ref, sha }) {
  try {
    await octokit.rest.git.getRef({ owner, repo, ref: ref.replace("refs/", "") });
    console.log(`Ref ${ref} already exists.`);
  } catch (error) {
    if (error.status !== 404) throw error;
    await octokit.rest.git.createRef({ owner, repo, ref, sha });
    console.log(`Created ref ${ref}.`);
  }
}

async function ensureMainBranch(octokit, { owner, repo }) {
  try {
    await octokit.rest.git.getRef({ owner, repo, ref: "heads/main" });
    console.log("Default branch main already exists.");
  } catch (error) {
    if (error.status !== 404) throw error;
    const emptyTree = await octokit.rest.git.createTree({ owner, repo, tree: [] });
    const commit = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: "chore: bootstrap repository",
      tree: emptyTree.data.sha,
      parents: [],
    });
    await ensureRef(octokit, {
      owner,
      repo,
      ref: "refs/heads/main",
      sha: commit.data.sha,
    });
  }
}

async function ensureBranchFrom(octokit, { owner, repo, branch, from }) {
  try {
    await octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
    console.log(`Branch ${branch} already exists.`);
  } catch (error) {
    if (error.status !== 404) throw error;
    const baseRef = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${from}` });
    await ensureRef(octokit, {
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: baseRef.data.object.sha,
    });
  }
}

async function createOrUpdateFile(octokit, { owner, repo, branch, path, content, message }) {
  const encoded = Buffer.from(content, "utf8").toString("base64");
  const options = { owner, repo, path, message, content: encoded, branch };
  try {
    const existing = await octokit.rest.repos.getContent({ owner, repo, path, ref: branch });
    options.sha = existing.data.sha;
    await octokit.rest.repos.createOrUpdateFileContents(options);
    console.log(`Updated ${path}.`);
  } catch (error) {
    if (error.status !== 404) throw error;
    await octokit.rest.repos.createOrUpdateFileContents(options);
    console.log(`Created ${path}.`);
  }
}

async function ensureIssue(octokit, { owner, repo, title, body }) {
  const { data: issues } = await octokit.rest.issues.listForRepo({ owner, repo, state: "open", per_page: 100 });
  const existing = issues.find((issue) => issue.title === title);
  if (existing) {
    console.log(`Issue '${title}' already exists at ${existing.html_url}`);
    return existing;
  }
  const { data } = await octokit.rest.issues.create({ owner, repo, title, body });
  console.log(`Created issue at ${data.html_url}`);
  return data;
}

async function ensurePullRequest(octokit, { owner, repo, head, base, title, body }) {
  const { data: prs } = await octokit.rest.pulls.list({ owner, repo, state: "open", head: `${owner}:${head}`, base, per_page: 100 });
  const existing = prs.find((pr) => pr.title === title);
  if (existing) {
    console.log(`Pull request '${title}' already exists at ${existing.html_url}`);
    return existing;
  }
  const { data } = await octokit.rest.pulls.create({ owner, repo, head, base, title, body });
  console.log(`Created pull request at ${data.html_url}`);
  return data;
}

function buildReadme() {
  return `# n8n-agent-ui\n\n` +
    `## 项目简介\n` +
    `n8n-agent-ui 是一个用于可视化管理和触发 n8n 自动化 Agent 的前端项目。\n\n` +
    `## 技术栈\n` +
    `- React + Vite\n` +
    `- Tailwind CSS\n` +
    `- n8n API 集成\n` +
    `- GitHub Actions\n\n` +
    `## 快速运行\n` +
    `1. 克隆仓库并进入 \`frontend\` 目录。\n` +
    `2. 复制 \`.env.example\` 为 \`.env\`，补充必需的环境变量。\n` +
    `3. 运行 \`npm install\` 安装依赖。\n` +
    `4. 运行 \`npm run dev\` 启动开发服务器。\n\n` +
    `## 部署说明\n` +
    `- 推荐使用静态托管平台（如 Vercel、Netlify）或容器化部署。\n` +
    `- 在 CI/CD 流水线中执行 \`npm run build\` 并上传构建产物。\n\n` +
    `## Agent 自动化流程说明\n` +
    `- 通过 n8n API 调用触发 Agent 执行工作流。\n` +
    `- UI 提供工作流状态监控、触发和历史记录展示。\n` +
    `- 可结合 GitHub Actions 自动部署和通知。\n`;
}

function buildTailwindConfig() {
  return `/** @type {import('tailwindcss').Config} */\nmodule.exports = {\n  content: ['src/**/*.{js,jsx,ts,tsx}', 'public/index.html'],\n  theme: {\n    extend: {},\n  },\n  plugins: [],\n};\n`;
}

function buildPackageJson() {
  return JSON.stringify({
    name: "n8n-agent-ui",
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "vite",
      build: "vite build",
      preview: "vite preview",
      lint: "eslint ."
    },
    dependencies: {
      react: "^18.2.0",
      "react-dom": "^18.2.0"
    },
    devDependencies: {
      "@vitejs/plugin-react": "^4.0.0",
      autoprefixer: "^10.4.0",
      eslint: "^8.0.0",
      postcss: "^8.4.0",
      tailwindcss: "^3.3.0",
      vite: "^5.0.0"
    }
  }, null, 2) + "\n";
}

function buildCiWorkflow() {
  return `name: CI\n\non:\n  push:\n    branches: [main]\n  pull_request:\n    branches: [main]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n          cache: 'npm'\n          cache-dependency-path: frontend/package.json\n      - name: Install dependencies\n        working-directory: frontend\n        run: npm install\n      - name: Lint\n        working-directory: frontend\n        run: npm run lint --if-present\n      - name: Build\n        working-directory: frontend\n        run: npm run build\n`;
}

function buildEnvExample() {
  return `# API endpoint for n8n instance\nVITE_N8N_BASE_URL=https://your-n8n-instance.example.com\n# Optional API key if required by your n8n deployment\nVITE_N8N_API_KEY=\n`;
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || process.env.GITHUB_ORG;
  if (!token) {
    throw new Error("Missing GITHUB_TOKEN environment variable.");
  }
  if (!owner) {
    throw new Error("Set GITHUB_OWNER (or GITHUB_ORG) to target the repository owner.");
  }

  const octokit = new Octokit({ auth: token });
  const repo = "n8n-agent-ui";
  const branch = "setup/initial-structure";

  await ensureRepository(octokit, {
    owner,
    repo,
    visibility: "public",
    description: "Front-end UI for orchestrating n8n agents",
  });

  await ensureMainBranch(octokit, { owner, repo });
  await ensureBranchFrom(octokit, { owner, repo, branch, from: "main" });

  const files = [
    { path: "README.md", content: buildReadme() },
    { path: ".env.example", content: buildEnvExample() },
    { path: ".github/workflows/ci-cd.yml", content: buildCiWorkflow() },
    { path: "frontend/tailwind.config.js", content: buildTailwindConfig() },
    { path: "frontend/package.json", content: buildPackageJson() },
    { path: "frontend/src/.gitkeep", content: "" },
    { path: "frontend/public/.gitkeep", content: "" },
  ];

  for (const file of files) {
    await createOrUpdateFile(octokit, {
      owner,
      repo,
      branch,
      path: file.path,
      content: file.content,
      message: `chore: add ${file.path}`,
    });
  }

  const pr = await ensurePullRequest(octokit, {
    owner,
    repo,
    head: branch,
    base: "main",
    title: "chore: initialize project structure",
    body: `## Summary\n- scaffolds frontend folder with Tailwind + Vite defaults\n- adds CI/CD workflow\n- documents agent automation flow in README\n\n## Testing\n- npm run build`,
  });

  await ensureIssue(octokit, {
    owner,
    repo,
    title: "Initial project setup",
    body: "Please review structure & README.",
  });

  console.log("Automation complete. PR:", pr.html_url);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
