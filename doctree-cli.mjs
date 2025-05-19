#!/usr/bin/env node

import { DocTree } from './doctree-core.mjs';

// --- CLI OPTIONS PARSER (simple, no dependencies) ---
function parseArgs(argv) {
  const opts = {};
  argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      let [key, ...rest] = arg.slice(2).split('=');
      let value = rest.join('='); // allow = in value
      if (value === "") value = true;
      if (value === "true") value = true;
      if (value === "false") value = false;
      if (typeof value === 'string' && value.includes(',') && !key.startsWith('labels.')) {
        value = value.split(',').map(s => s.trim());
      }
      if (key.includes('.')) {
        const [main, sub] = key.split('.');
        opts[main] ||= {};
        opts[main][sub] = value;
      } else {
        opts[key] = value;
      }
    } else if (!opts._) {
      opts._ = [arg];
    } else {
      opts._.push(arg);
    }
  });
  return opts;
}

const args = parseArgs(process.argv);

// Help support: --help, /help, -h
if (
  process.argv.includes('--help') ||
  process.argv.includes('/help') ||
  process.argv.includes('-h')
) {
  console.log(`
✨ DocTree CLI – Code documentation generator with annotations

ℹ️  Usage:
  node doctree-cli.mjs [srcDir] [outputFile] [options]

📂 Positional arguments:
  srcDir        Source directory to analyze   (default: src)
  outputFile    Output file                   (default: docs/structure.md)

⚙️  Options:
  --extensions=.js,.php        File extensions to analyze (comma-separated)
  --excludeExtensions=.test.js Extensions to exclude (comma-separated)
  --ignore=node_modules,dist   Directories/files to ignore (comma-separated)
  --include.toc=false          Disable table of contents
  --include.classes=false      Disable classes
  --include.methods=false      Disable class methods
  --include.functions=false    Disable global functions
  --include.constants=false    Disable constants
  --include.hooks=false        Disable hooks/events
  --labels.docTitle="Title"    Custom documentation title
  --showAnnotations            Show annotations (@...) from docblocks
  --annotations                Alias for --showAnnotations
  --help / /help / -h          Show this help

📝 Examples:
  node doctree-cli.mjs ./ ./docs/structure.md --showAnnotations
  node doctree-cli.mjs --srcDir=src --ignore=node_modules,dist --include.constants=false
  `);
  process.exit(0);
}

// Support --annotations as alias for --showAnnotations
if (args.annotations && !args.showAnnotations) {
  args.showAnnotations = args.annotations;
}

// srcDir and outputFile as positional or via --srcDir/--outputFile
const srcDir = args.srcDir || (args._ && args._[0]) || "src";
const outputFile = args.outputFile || (args._ && args._[1]) || "docs/structure.md";

// Other options
const options = {
  srcDir,
  outputFile,
  extensions: args.extensions || undefined,
  excludeExtensions: args.excludeExtensions || undefined,
  ignore: args.ignore || undefined,
  include: args.include || undefined,
  labels: args.labels || undefined,
  showAnnotations: args.showAnnotations === true || args.showAnnotations === "true",
};

Object.keys(options).forEach(k => options[k] === undefined && delete options[k]);

// --- Run ---
const run = async () => {
  await new DocTree(options).applyBuildEnd();
};
run();