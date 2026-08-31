#!/usr/bin/env node

// 用法：
//   node scripts/setup-github.mjs --backend nd-backend-bot --frontend nd-frontend-bot
//
// 前置条件：
//   1. 已安装并登录 gh（gh auth status 通过）
//   2. 两个账号已存在，且对仓库有写权限

import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
function getArg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

const backend = getArg('--backend');
const frontend = getArg('--frontend');

if (!backend || !frontend) {
  console.error('请提供 --backend 和 --frontend 两个 GitHub 账号名');
  process.exit(1);
}

const repo = 'chiyuan222/Nodusfall-wiki';

function gh(args, input) {
  const r = spawnSync('gh', args, {
    input: input === undefined ? undefined : input,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) {
    throw new Error(`gh ${args.join(' ')} 失败：${r.stderr || r.stdout}`);
  }
  return r.stdout;
}

function graphql(query, variables) {
  const r = spawnSync(
    'gh',
    ['api', 'graphql', '-f', `query=${query}`, '-F', `variables=${JSON.stringify(variables)}`],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  if (r.status !== 0) {
    throw new Error(`gh api graphql 失败：${r.stderr || r.stdout}`);
  }
  const json = JSON.parse(r.stdout);
  if (json.errors) {
    throw new Error(JSON.stringify(json.errors, null, 2));
  }
  return json.data;
}

// 1. 替换 CODEOWNERS 占位账号
const codeownersPath = new URL('../.github/CODEOWNERS', import.meta.url);
let codeowners = readFileSync(codeownersPath, 'utf8');
codeowners = codeowners.replaceAll('@nd-backend-bot', `@${backend}`);
codeowners = codeowners.replaceAll('@nd-frontend-bot', `@${frontend}`);
writeFileSync(codeownersPath, codeowners);
console.log('CODEOWNERS 已更新');

// 2. 解析账号 node id
const repoData = graphql(
  `query($owner:String!,$name:String!){ repository(owner:$owner,name:$name){ id } }`,
  { owner: 'chiyuan222', name: 'Nodusfall-wiki' },
);
const repositoryId = repoData.repository.id;

function actorId(login) {
  const data = graphql(
    `query($login:String!){ user(login:$login){ id } }`,
    { login },
  );
  return data.user.id;
}

const backendId = actorId(backend);
const frontendId = actorId(frontend);

// 3. 创建分支保护规则（GraphQL）
function protect(pattern, input) {
  return graphql(
    `mutation($input:CreateBranchProtectionRuleInput!){ createBranchProtectionRule(input:$input){ branchProtectionRule { id pattern } } }`,
    { input: { repositoryId, pattern, ...input } },
  );
}

protect('main', {
  requiresApprovingReviews: true,
  requiredApprovingReviewCount: 1,
  dismissesStaleReviews: true,
  requiresCodeOwnerReviews: true,
  requiresConversationResolution: true,
  isAdminEnforced: true,
});

protect('develop', {
  requiresApprovingReviews: true,
  requiredApprovingReviewCount: 1,
  dismissesStaleReviews: true,
  requiresCodeOwnerReviews: true,
  isAdminEnforced: true,
});

protect('backend/*', {
  restrictsPushes: true,
  pushActorIds: [backendId],
});

protect('frontend/*', {
  restrictsPushes: true,
  pushActorIds: [frontendId],
});

protect('contract/*', {
  requiresApprovingReviews: true,
  requiredApprovingReviewCount: 2,
  dismissesStaleReviews: true,
  requiresCodeOwnerReviews: true,
  restrictsPushes: true,
  pushActorIds: [backendId, frontendId],
  isAdminEnforced: true,
});

console.log('分支保护规则已创建：main / develop / backend/* / frontend/* / contract/*');
console.log('请手动检查 GitHub 仓库 Settings > Branches 确认结果。');
