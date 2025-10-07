import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import * as url from 'node:url'
import { execFileSync } from 'node:child_process'
import download from 'download'
import tempDirRoot from 'temp-dir'
import extract from 'decompress'
import { rimrafSync } from 'rimraf'

const platform = os.platform()
const arch = os.arch()
if (platform !== 'linux' && platform !== 'darwin' && platform !== 'win32') {
  throw new Error(`Unsupported platform: ${platform}`)
}
if (!(arch === 'x64' || (arch === 'arm64' && platform === 'darwin'))) {
  throw new Error(`Unsupported architecture: ${arch}`)
}

const filenames = {
  darwin: 'glslang-master-osx-Release',
  linux: 'glslang-master-linux-Release',
  win32: 'glslang-master-windows-x64-Release',
}

const dirname = path.dirname(url.fileURLToPath(import.meta.url))
const filename = filenames[platform]
const suffix = platform === 'win32' ? '.exe' : ''
const archiveURL = `https://github.com/KhronosGroup/glslang/releases/download/master-tot/${filename}.zip`
const tempDir = path.resolve(tempDirRoot, 'glslang-validator-prebuilt')
const zipPath = path.resolve(tempDir, `${filename}.zip`)
const unzippedBinPath = path.resolve(tempDir, `bin/glslangValidator${suffix}`)
const dstBinPath = path.resolve(dirname, `bin/glslangValidator${suffix}`)
const dstBinDir = path.resolve(dirname, `bin`)

if (!fs.existsSync(dstBinPath)) {
  rimrafSync(tempDir)
  fs.mkdirSync(tempDir, { recursive: true })
  await download(archiveURL, tempDir)
  await extract(zipPath, tempDir)
  rimrafSync(dstBinDir)
  fs.mkdirSync(dstBinDir, { recursive: true })
  fs.copyFileSync(unzippedBinPath, dstBinPath)
  fs.chmodSync(dstBinPath, '755')
}

export function glslang(...args: string[]): void {
  try {
    execFileSync(dstBinPath, args.length === 0 ? ['--version'] : args, { encoding: 'utf-8' })
  } catch (error: any) {
    throw new Error(error.stdout)
  }
}
