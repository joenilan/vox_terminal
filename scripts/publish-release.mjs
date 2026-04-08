import { readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import SftpClient from 'ssh2-sftp-client'

const appRoot = resolve(import.meta.dirname, '..')
const envFile = process.env.RPI_ENV_FILE ?? resolve(appRoot, '.env.raspi')
const releaseRoot = resolve(appRoot, 'release', 'windows')
const version = readFileSync(resolve(appRoot, 'VERSION'), 'utf8').trim()
const patchNotesSource = readFileSync(resolve(appRoot, 'PATCH_NOTES.md'), 'utf8')

const env = {
  ...loadEnvFile(envFile),
  ...process.env,
}

const host = requiredEnv(env, 'SSH_HOST')
const username = requiredEnv(env, 'SSH_USER')
const password = requiredEnv(env, 'SSH_PASSWORD')
const port = Number.parseInt(env.SSH_PORT ?? '22', 10)
const appSlug = env.RELEASE_APP_SLUG ?? 'vox-terminal'
const baseDir = env.RPI_RELEASE_BASE_DIR ?? '/mnt/data/sites/apps/public/downloads'
const channel = env.RELEASE_CHANNEL ?? 'stable'
const remoteDir = `${baseDir.replace(/\/+$/, '')}/${appSlug}`

const setupName = `vox-terminal_${version}_x64-setup.exe`
const msiName = `vox-terminal_${version}_x64.msi`
const portableName = `vox-terminal_${version}_x64_portable.zip`
const manifestName = 'manifest.json'
const notesName = 'notes.md'
const latestName = 'latest.json'

const notesMarkdown = extractVersionNotes(patchNotesSource, version)
const latest = {
  version,
  channel,
  publishedAt: new Date().toISOString(),
  file: setupName,
  notes: summarizeNotes(notesMarkdown),
  notesFile: notesName,
  files: {
    setup: setupName,
    msi: msiName,
    portable: portableName,
  },
}

const latestPath = resolve(releaseRoot, latestName)
const notesPath = resolve(releaseRoot, notesName)

writeFileSync(latestPath, `${JSON.stringify(latest, null, 2)}\n`)
writeFileSync(notesPath, `${notesMarkdown.trim()}\n`)

const uploadPaths = [
  setupName,
  `${setupName}.sha256`,
  msiName,
  `${msiName}.sha256`,
  portableName,
  `${portableName}.sha256`,
  manifestName,
  latestName,
  notesName,
].map((name) => resolve(releaseRoot, name))

// Verify all files exist before uploading
for (const path of uploadPaths) {
  readFileSync(path)
}

const sftp = new SftpClient()

try {
  await sftp.connect({ host, port, username, password })
  await sftp.mkdir(remoteDir, true)

  // Archive the current top-level release before uploading the new one
  try {
    const existingBuf = await sftp.get(`${remoteDir}/latest.json`)
    const existingLatest = JSON.parse(existingBuf.toString('utf8'))
    const oldVersion = existingLatest?.version

    if (oldVersion && oldVersion !== version) {
      const archiveDir = `${remoteDir}/archive/${oldVersion}`
      await sftp.mkdir(archiveDir, true)

      const topLevel = await sftp.list(remoteDir)
      for (const item of topLevel) {
        if (item.type === '-') {
          await sftp.rename(`${remoteDir}/${item.name}`, `${archiveDir}/${item.name}`)
        }
      }
      console.log(`Archived ${oldVersion} → archive/${oldVersion}/`)
    }
  } catch {
    // No existing release yet — nothing to archive
  }

  for (const localPath of uploadPaths) {
    const remotePath = `${remoteDir}/${basename(localPath)}`
    await sftp.put(localPath, remotePath)
  }
} finally {
  await sftp.end().catch(() => {})
}

console.log(`Published VOX_TERMINAL ${version} to ${remoteDir}`)
for (const localPath of uploadPaths) {
  console.log(`- ${basename(localPath)}`)
}

function loadEnvFile(path) {
  let source
  try {
    source = readFileSync(path, 'utf8')
  } catch {
    throw new Error(`Missing .env.raspi at ${path}. Copy .env.raspi.example and fill in your credentials.`)
  }

  const parsed = {}
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue
    parsed[line.slice(0, separatorIndex).trim()] = line.slice(separatorIndex + 1).trim()
  }
  return parsed
}

function requiredEnv(env, key) {
  const value = env[key]
  if (!value) throw new Error(`Missing required release env: ${key}`)
  return value
}

function extractVersionNotes(source, targetVersion) {
  const sectionPattern = new RegExp(
    `^##\\s+${escapeRegExp(targetVersion)}\\s*$([\\s\\S]*?)(?=^##\\s+\\S|\\s*$)`,
    'm',
  )
  const match = source.match(sectionPattern)
  if (!match) throw new Error(`Unable to find patch notes for version ${targetVersion} in PATCH_NOTES.md`)
  return `## ${targetVersion}\n${match[1].trimEnd()}`
}

function summarizeNotes(notesMarkdown) {
  const bullet = notesMarkdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith('- '))
  return bullet ? bullet.slice(2) : `VOX_TERMINAL ${version}`
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
