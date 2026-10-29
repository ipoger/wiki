import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { ROOT, createPage, promptForPage } from './lib.mjs';

const rl = readline.createInterface({ input: stdin, output: stdout });
const ask = async (question, fallback = '') => {
  const suffix = fallback ? ` (${fallback})` : '';
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  return answer || fallback;
};

try {
  console.log('新建页面\n');
  const page = await promptForPage(ask);
  const { file } = createPage(page);
  const relative = path.relative(ROOT, file);

  console.log(`
已创建 ${relative}

它已经带上日期，会自动出现在首页的「最近更新」里。

下一步：
  npm run dev       # 本地预览，保存后自动重建
  或 npm run write   # 直接打开编辑器，退出后自动构建、提交、推送

  写完发布：
  git add -A && git commit -m "${page.section.dir}: ${page.title}" && git push
`);
} catch (error) {
  if (error?.code === 'EEXIST') {
    console.error(`\n${error.message}`);
    process.exitCode = 1;
  } else if (error?.code === 'ABORT_ERR' || error?.name === 'AbortError') {
    console.log('\n已取消。');
  } else {
    throw error;
  }
} finally {
  rl.close();
}
