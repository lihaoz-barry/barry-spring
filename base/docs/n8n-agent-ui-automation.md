# n8n-agent-ui 仓库自动化创建指南

本文档演示如何使用 [Octokit.js](https://github.com/octokit/octokit.js) 脚本化创建 `n8n-agent-ui` GitHub 仓库、初始化目录结构，并自动提交 Pull Request 与 Issue。

## 前提条件
- 已创建的 GitHub Personal Access Token，拥有 `repo`、`workflow` 权限。
- 目标 GitHub 账号或组织名称。
- 本地 Node.js 18+ 运行环境。

## 环境变量
运行脚本前需要设置以下环境变量：

| 变量名 | 说明 |
| --- | --- |
| `GITHUB_TOKEN` | 用于调用 GitHub REST API 的 token。|
| `GITHUB_OWNER` | 仓库所属用户的登录名。若要在组织下创建，可改用 `GITHUB_ORG`。|
| `GITHUB_ORG` | （可选）目标组织名称，若设置则优先在组织下创建仓库。|

Linux/macOS 示例：
```bash
export GITHUB_TOKEN="ghp_xxx"
export GITHUB_OWNER="your-github-username"
# export GITHUB_ORG="your-org"  # 如果要创建到组织
```

Windows PowerShell 示例：
```powershell
$env:GITHUB_TOKEN = "ghp_xxx"
$env:GITHUB_OWNER = "your-github-username"
# $env:GITHUB_ORG = "your-org"
```

## 运行脚本
1. 安装依赖：
   ```bash
   npm install octokit
   ```
2. 执行脚本：
   ```bash
   node scripts/setup-n8n-agent-ui.js
   ```

脚本包含以下自动化步骤：
1. 创建公开仓库 `n8n-agent-ui`（如果已存在则跳过）。
2. 初始化空的 `main` 分支，随后从 `main` 切出 `setup/initial-structure` 分支。
3. 在分支中创建以下文件：
   - `README.md`
   - `.env.example`
   - `.github/workflows/ci-cd.yml`
   - `frontend/tailwind.config.js`
   - `frontend/package.json`
   - `frontend/src/.gitkeep`
   - `frontend/public/.gitkeep`
4. 创建 Issue：`Initial project setup`，内容为 `Please review structure & README`。
5. 打开标题为 `chore: initialize project structure` 的 Pull Request，目标分支为 `main`。

运行成功后，终端会输出创建的 Issue 与 Pull Request 链接。

## 二次执行
脚本具备幂等特性：
- 若仓库、分支或文件已存在，会更新而非报错。
- 若 Issue 或 PR 已存在，会直接输出对应链接。

## 自定义
如需调整生成文件内容，可修改 `scripts/setup-n8n-agent-ui.js` 中的 `build*` 辅助函数，或在 `files` 数组中新增条目。
