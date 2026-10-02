import { cp, lstat, mkdtemp, rename, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const checkScript = fileURLToPath(new URL('./check.mjs', import.meta.url));

export async function buildExtension(sourceRoot = projectRoot) {
  const root = path.resolve(sourceRoot);
  const output = path.join(root, 'dist');
  const staging = await mkdtemp(path.join(root, '.dist-stage-'));
  try {
    // Keep paths unchanged so Manifest, ES modules and content-script URLs still resolve.
    await cp(path.join(root, 'manifest.json'), path.join(staging, 'manifest.json'));
    for (const [directory, extensions] of [
      ['src', new Set(['.js', '.css', '.html'])],
      ['assets', new Set(['.png', '.svg'])],
      ['_locales', new Set(['.json'])]
    ]) {
      await cp(path.join(root, directory), path.join(staging, directory), {
        recursive: true,
        filter: async source => {
          if (path.basename(source).startsWith('.')) return false;
          const info = await lstat(source);
          if (info.isSymbolicLink()) throw new Error(`构建不接受符号链接：${source}`);
          return info.isDirectory() || (info.isFile() && extensions.has(path.extname(source)));
        }
      });
    }
    // Validate the copied extension before replacing the previous working build.
    execFileSync(process.execPath, [checkScript, staging], { stdio: 'pipe' });
    await rm(output, { recursive: true, force: true });
    await rename(staging, output);
    return output;
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const output = await buildExtension();
  console.log(`✓ 构建完成：${output}`);
  console.log('仅包含 manifest.json、src/、assets/ 和 _locales/，未生成 ZIP。');
  console.log('请在 Chrome 开发者模式中加载此目录；后续构建后重新加载扩展即可。');
}
