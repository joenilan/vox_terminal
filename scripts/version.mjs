import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const appRoot = resolve(import.meta.dirname, '..')
const versionFile = resolve(appRoot, 'VERSION')
const packageJsonFile = resolve(appRoot, 'package.json')
const tauriConfFile = resolve(appRoot, 'src-tauri', 'tauri.conf.json')
const changelogFile = resolve(appRoot, 'CHANGELOG.md')
const patchNotesFile = resolve(appRoot, 'PATCH_NOTES.md')

const command = process.argv[2] ?? 'check'
const nextVersionArg = process.argv[3] ?? null

const currentVersion = readVersionFile()

switch (command) {
  case 'check':
    runCheck(currentVersion)
    break
  case 'check-notes':
    runNotesCheck(currentVersion)
    break
  case 'sync':
    writeAllTargets(currentVersion)
    logSuccess(`Synced version ${currentVersion}.`)
    break
  case 'patch':
  case 'minor':
  case 'major': {
    const nextVersion = bumpVersion(currentVersion, command)
    writeVersionFile(nextVersion)
    writeAllTargets(nextVersion)
    logSuccess(`Bumped version to ${nextVersion}.`)
    break
  }
  case 'set': {
    if (!nextVersionArg) {
      fail('Provide a version, for example: node ./scripts/version.mjs set 1.2.0')
    }
    assertSemver(nextVersionArg)
    writeVersionFile(nextVersionArg)
    writeAllTargets(nextVersionArg)
    logSuccess(`Set version to ${nextVersionArg}.`)
    break
  }
  default:
    fail(`Unknown command "${command}". Use check, check-notes, sync, patch, minor, major, or set.`)
}

function runCheck(expectedVersion) {
  const packageJsonVersion = readJson(packageJsonFile).version
  const tauriConfVersion = readJson(tauriConfFile).version

  const mismatches = [
    ['VERSION', expectedVersion],
    ['package.json', packageJsonVersion],
    ['src-tauri/tauri.conf.json', tauriConfVersion],
  ].filter(([, value]) => value !== expectedVersion)

  if (mismatches.length > 0) {
    const lines = mismatches.map(([label, value]) => `- ${label}: ${value ?? 'missing'}`)
    fail(`Versions are out of sync.\nExpected: ${expectedVersion}\n${lines.join('\n')}`)
  }

  logSuccess(`Versions are in sync at ${expectedVersion}.`)
}

function runNotesCheck(expectedVersion) {
  const missing = [
    ['CHANGELOG.md', fileContainsVersionHeading(changelogFile, expectedVersion)],
    ['PATCH_NOTES.md', fileContainsVersionHeading(patchNotesFile, expectedVersion)],
  ].filter(([, hasVersion]) => !hasVersion)

  if (missing.length > 0) {
    const lines = missing.map(([label]) => `- ${label}`)
    fail(`Release notes are missing version ${expectedVersion}.\n${lines.join('\n')}`)
  }

  logSuccess(`Release notes include ${expectedVersion}.`)
}

function writeAllTargets(version) {
  updatePackageJsonVersion(version)
  updateTauriConfVersion(version)
}

function updateTauriConfVersion(version) {
  const payload = readJson(tauriConfFile)
  payload.version = version
  writeJson(tauriConfFile, payload)
}

function updatePackageJsonVersion(version) {
  const payload = readJson(packageJsonFile)
  payload.version = version
  writeJson(packageJsonFile, payload)
}

function readVersionFile() {
  const value = readFileSync(versionFile, 'utf8').trim()
  assertSemver(value)
  return value
}

function writeVersionFile(version) {
  writeFileSync(versionFile, `${version}\n`)
}

function bumpVersion(version, mode) {
  const [major, minor, patch] = version.split('.').map((part) => Number.parseInt(part, 10))

  if (mode === 'major') return `${major + 1}.0.0`
  if (mode === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function fileContainsVersionHeading(path, version) {
  try {
    const source = readFileSync(path, 'utf8')
    return new RegExp(`^##\\s+${escapeRegExp(version)}\\b`, 'm').test(source)
  } catch {
    return false
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function assertSemver(value) {
  if (!/^\d+\.\d+\.\d+$/.test(value)) {
    fail(`Invalid version "${value}". Expected semver like 1.0.0.`)
  }
}

function logSuccess(message) {
  console.log(message)
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
