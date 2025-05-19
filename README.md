# DocTree CLI

✨ **DocTree CLI** is a simple, zero-dependency documentation generator for your JavaScript and PHP projects.  
It scans your source directory, collects docblocks and annotations, and outputs a readable Markdown file with a table of contents, classes, functions, constants, and more.

---

## 🚀 Features

- 📂 Recursively scans your source directory (`src` by default)
- 📝 Extracts docblocks from JS and PHP files (customizable extensions)
- 📐 Supports classes, class methods, global functions, constants, hooks/events
- 🏷️ Collects `@annotations` from docblocks (optional)
- 📑 Generates a clean, navigable Markdown file with Table of Contents
- ⚙️ Highly configurable: includes, labels, ignores, etc.
- 🔥 No dependencies, just Node.js

---

## ℹ️ Usage

```sh
node doctree-cli.mjs [srcDir] [outputFile] [options]
```

### 📂 Positional arguments

| Argument      | Description                        | Default                  |
|---------------|------------------------------------|--------------------------|
| `srcDir`      | Source directory to analyze        | `src`                    |
| `outputFile`  | Output file                        | `docs/structure.md`      |

### ⚙️ Options

| Option                         | Description                                              |
|---------------------------------|---------------------------------------------------------|
| `--extensions=.js,.php`         | File extensions to analyze (comma-separated)            |
| `--excludeExtensions=.test.js`  | File extensions to exclude (comma-separated)            |
| `--ignore=node_modules,dist`    | Directories/files to ignore (comma-separated)           |
| `--include.toc=false`           | Disable table of contents                               |
| `--include.classes=false`       | Disable classes                                         |
| `--include.methods=false`       | Disable class methods                                   |
| `--include.functions=false`     | Disable global functions                                |
| `--include.constants=false`     | Disable constants                                       |
| `--include.hooks=false`         | Disable hooks/events                                    |
| `--labels.docTitle="Title"`     | Custom documentation title                              |
| `--showAnnotations`             | Show annotations (@...) from docblocks                  |
| `--annotations`                 | Alias for `--showAnnotations`                           |
| `--help`, `/help`, `-h`         | Show help                                               |

---

## 📝 Examples

```sh
# Generate documentation for current directory with annotations
node doctree-cli.mjs ./ ./docs/structure.md --showAnnotations

# Use custom source/output, ignore node_modules and dist, skip constants
node doctree-cli.mjs --srcDir=src --outputFile=docs/api.md --ignore=node_modules,dist --include.constants=false
```

---

## 💡 Tips

- By default, all classes, methods, functions, constants, and hooks are included.  
- Use `--showAnnotations` to include `@param`, `@return`, and any other tags in your docs.
- You can customize section titles with `--labels.docTitle="My Project Docs"` etc.
- Works with both JavaScript and PHP, and is easy to extend.

---

## 🛠️ Requirements

- Node.js v14 or newer

---

## 📄 License

MIT

---

## ✨ Author

Created by [Jan Wegner](https://github.com/jan-wegner)  
Contributions & suggestions welcome!