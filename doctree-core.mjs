/**
 * DocTree - Code documentation generator
 * Author: Jan Wegner, ELSERO.pl
 * Description: Scans source files and generates markdown documentation
 * Version: 1.0.1
 */

export class DocTree {
  constructor(options = {}) {
    this.srcDir = options.srcDir === "." ? process.cwd() : options.srcDir || "src";
    this.outputFile = options.outputFile || "docs/structure.md";
    this.extensions = options.extensions || [".js", ".php"];
    this.excludeExtensions = options.excludeExtensions || [];
    this.ignore = [
      "doctree-cli.js",
      "vite-doctree.js",
      "tailwind.config.js",
      "node_modules",
      ".git",
      "dist",
      "build",
      "package.json",
      "package-lock.json",
      "yarn.lock",
      "README.md",
      "LICENSE",
      "webpack.config.js",
      ".env",
      ".env.local",
      "tests",
      "test",
      "__tests__",
      "coverage",
      ".vscode",
      ".idea",
      ...(options.ignore || []),
    ];

    this.include = {
      toc: true,
      classes: true,
      methods: true,
      functions: true,
      constants: true,
      hooks: true,
      ...(options.include || {}),
    };

    this.labels = {
      tocTitle: "Table of Contents",
      docTitle: "Project Documentation",
      classTitle: "Class",
      functionsTitle: "Global Functions",
      constantsTitle: "Constants",
      hooksTitle: "Hooks / Events",
      ...(options.labels || {}),
    };

    this.showAnnotations = options.showAnnotations || false;
  }

  normalizeDiacritics(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  githubSlug(str) {
    return str
      .replace(/\\/g, "/")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, "");
  }

  getDocblockDescription(docblockClean) {
    const lines = docblockClean
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== "");

    let descLines = [];
    for (const line of lines) {
      if (line.startsWith('@')) {
        break;
      }
      descLines.push(line);
    }
    return descLines.join(' ').replace(/\s+/g, ' ').trim();
  }

  async walk(dir) {
    const fs = (await import('fs')).default;
    const path = (await import('path')).default;
    const results = [];
    let list;
    try {
      list = fs.readdirSync(dir);
    } catch (e) {
      return [];
    }

    for (const file of list) {
      const filePath = path.join(dir, file);

      if (
        this.ignore.includes(file) ||
        this.ignore.some(pattern =>
          filePath === pattern ||
          filePath.endsWith(path.sep + pattern) ||
          filePath.includes(path.sep + pattern + path.sep)
        )
      ) {
        continue;
      }

      let stat;
      try {
        stat = fs.statSync(filePath);
      } catch (e) {
        continue;
      }

      if (stat.isDirectory()) {
        results.push(...(await this.walk(filePath)));
      } else {
        const ext = path.extname(file);
        if (
          this.extensions.includes(ext) &&
          !this.excludeExtensions.includes(ext)
        ) {
          results.push(filePath);
        }
      }
    }
    return results;
  }

  parseAnnotations(docblockRaw) {
    const lines = docblockRaw
      .split('\n')
      .map(line => line.trim().replace(/^\* ?/, ''));
    let annotations = [];
    for (const line of lines) {
      let idx = line.indexOf('@');
      while (idx !== -1) {
        let rest = line.slice(idx);
        let nextAt = rest.slice(1).indexOf('@');
        if (nextAt !== -1) {
          annotations.push(rest.slice(0, nextAt+1).trim());
          rest = rest.slice(nextAt+1);
        } else {
          annotations.push(rest.trim());
          break;
        }
        idx = rest.indexOf('@');
      }
    }
    return annotations.filter(a => a && a.startsWith('@'));
  }

  extractDocblocks(content) {
    const classes = [];
    const functions = [];
    const constants = [];
    const hooks = [];
    let fileDocs = [];

    const lines = content.split('\n');
    let pendingDocblock = null;
    let docblockText = '';
    let inDocblock = false;

    const classBoundaries = {};

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      let inlineDocDecl = line.match(/\/\*\*([\s\S]*?)\*\/\s*(.*)/);
      if (inlineDocDecl && inlineDocDecl[2]) {
        const docblockClean = inlineDocDecl[1].replace(/^\s*\*\s?/gm, "");
        let declLine = inlineDocDecl[2];

        let funcMatch = declLine.match(/function\s+(\w+)\s*\(/);
        if (funcMatch) {
          const description = this.getDocblockDescription(docblockClean);
          const annotations = this.parseAnnotations(inlineDocDecl[0]);
          functions.push({ name: funcMatch[1], doc: description, annotations });
          continue;
        }
        let classMatch = declLine.match(/(?:abstract\s+)?(?:class|interface|trait)\s+(\w+)/);
        if (classMatch) {
          const description = this.getDocblockDescription(docblockClean);
          const annotations = this.parseAnnotations(inlineDocDecl[0]);
          classes.push({ name: classMatch[1], doc: description, annotations, methods: [] });
          continue;
        }
        let constMatch = declLine.match(/const\s+(\w+)\s*=/);
        if (constMatch) {
          const description = this.getDocblockDescription(docblockClean);
          const annotations = this.parseAnnotations(inlineDocDecl[0]);
          constants.push({ name: constMatch[1], doc: description, annotations });
          continue;
        }
        let defineMatch = declLine.match(/define\s*\(\s*["'](\w+)["']/);
        if (defineMatch) {
          const description = this.getDocblockDescription(docblockClean);
          const annotations = this.parseAnnotations(inlineDocDecl[0]);
          constants.push({ name: defineMatch[1], doc: description, annotations });
          continue;
        }
        let hookMatch = declLine.match(/on\(['"`](\w+)['"`]\)/);
        if (hookMatch) {
          const description = this.getDocblockDescription(docblockClean);
          const annotations = this.parseAnnotations(inlineDocDecl[0]);
          hooks.push({ name: hookMatch[1], doc: description, annotations });
          continue;
        }
        const description = this.getDocblockDescription(docblockClean);
        if (description) fileDocs.push(description);
        continue;
      }

      if (/^\s*\/\*\*/.test(line)) {
        inDocblock = true;
        docblockText = line + "\n";
        continue;
      }
      if (inDocblock) {
        docblockText += line + "\n";
        if (/\*\/\s*$/.test(line)) {
          pendingDocblock = docblockText;
          inDocblock = false;
          docblockText = '';
        }
        continue;
      }

      if (/^\s*$/.test(line)) continue;
      if (/^\s*\/\//.test(line)) continue;
      if (/^\s*\*/.test(line)) continue;

      if (pendingDocblock !== null) {
        let funcMatch = line.match(/function\s+(\w+)\s*\(/);
        if (funcMatch) {
          const docblockClean = pendingDocblock.replace(/(^\s*\/\*\*|\*\/\s*$)/g, "").replace(/^\s*\*\s?/gm, "");
          const description = this.getDocblockDescription(docblockClean);
          const annotations = this.parseAnnotations(pendingDocblock);
          functions.push({ name: funcMatch[1], doc: description, annotations });
          pendingDocblock = null;
          continue;
        }
        let classMatch = line.match(/(?:abstract\s+)?(?:class|interface|trait)\s+(\w+)/);
        if (classMatch) {
          const docblockClean = pendingDocblock.replace(/(^\s*\/\*\*|\*\/\s*$)/g, "").replace(/^\s*\*\s?/gm, "");
          const description = this.getDocblockDescription(docblockClean);
          const annotations = this.parseAnnotations(pendingDocblock);
          let startClassLine = i;
          let braceDepth = 0;
          let endClassLine = i;
          let foundStart = false;
          for (let j = i; j < lines.length; j++) {
            if (lines[j].includes('{')) {
              startClassLine = j;
              foundStart = true;
              break;
            }
          }
          if (foundStart) {
            for (let j = startClassLine; j < lines.length; j++) {
              if (lines[j].includes('{')) braceDepth++;
              if (lines[j].includes('}')) braceDepth--;
              if (braceDepth === 0 && j > startClassLine) {
                endClassLine = j;
                break;
              }
            }
            classBoundaries[classMatch[1]] = {start: startClassLine, end: endClassLine};
          }
          classes.push({ name: classMatch[1], doc: description, annotations, methods: [] });
          pendingDocblock = null;
          continue;
        }
        let constMatch = line.match(/const\s+(\w+)\s*=/);
        if (constMatch) {
          const docblockClean = pendingDocblock.replace(/(^\s*\/\*\*|\*\/\s*$)/g, "").replace(/^\s*\*\s?/gm, "");
          const description = this.getDocblockDescription(docblockClean);
          const annotations = this.parseAnnotations(pendingDocblock);
          constants.push({ name: constMatch[1], doc: description, annotations });
          pendingDocblock = null;
          continue;
        }
        let defineMatch = line.match(/define\s*\(\s*["'](\w+)["']/);
        if (defineMatch) {
          const docblockClean = pendingDocblock.replace(/(^\s*\/\*\*|\*\/\s*$)/g, "").replace(/^\s*\*\s?/gm, "");
          const description = this.getDocblockDescription(docblockClean);
          const annotations = this.parseAnnotations(pendingDocblock);
          constants.push({ name: defineMatch[1], doc: description, annotations });
          pendingDocblock = null;
          continue;
        }
        let hookMatch = line.match(/on\(['"`](\w+)['"`]\)/);
        if (hookMatch) {
          const docblockClean = pendingDocblock.replace(/(^\s*\/\*\*|\*\/\s*$)/g, "").replace(/^\s*\*\s?/gm, "");
          const description = this.getDocblockDescription(docblockClean);
          const annotations = this.parseAnnotations(pendingDocblock);
          hooks.push({ name: hookMatch[1], doc: description, annotations });
          pendingDocblock = null;
          continue;
        }
        let addFilterMatch = line.match(/add_(?:filter|action)\s*\(\s*["'][^"']+["']\s*,\s*["'](\w+)["']/);
        if (addFilterMatch) {
          pendingDocblock = null;
          continue;
        }
        let arrowFuncMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*\(?.*\)?\s*=>/);
        if (arrowFuncMatch) {
          const docblockClean = pendingDocblock.replace(/(^\s*\/\*\*|\*\/\s*$)/g, "").replace(/^\s*\*\s?/gm, "");
          const description = this.getDocblockDescription(docblockClean);
          const annotations = this.parseAnnotations(pendingDocblock);
          functions.push({ name: arrowFuncMatch[1], doc: description, annotations });
          pendingDocblock = null;
          continue;
        }
        if (/=\s*function\s*\(/.test(line)) {
          pendingDocblock = null;
          continue;
        }
        const docblockClean = pendingDocblock.replace(/(^\s*\/\*\*|\*\/\s*$)/g, "").replace(/^\s*\*\s?/gm, "");
        const description = this.getDocblockDescription(docblockClean);
        if (description) fileDocs.push(description);
        pendingDocblock = null;
      }
    }

    if (pendingDocblock) {
      const docblockClean = pendingDocblock.replace(/(^\s*\/\*\*|\*\/\s*$)/g, "").replace(/^\s*\*\s?/gm, "");
      const description = this.getDocblockDescription(docblockClean);
      if (description) fileDocs.push(description);
      pendingDocblock = null;
    }

    if (this.include.classes && this.include.methods) {
      for (const cls of classes) {
        if (!classBoundaries[cls.name]) continue;
        const {start, end} = classBoundaries[cls.name];
        let method_pendingDocblock = null;
        let method_docblockText = '';
        let method_inDocblock = false;
        for (let i = start + 1; i < end; i++) {
          let line = lines[i];
          if (/^\s*\/\*\*/.test(line)) {
            method_inDocblock = true;
            method_docblockText = line + "\n";
            continue;
          }
          if (method_inDocblock) {
            method_docblockText += line + "\n";
            if (/\*\/\s*$/.test(line)) {
              method_pendingDocblock = method_docblockText;
              method_inDocblock = false;
              method_docblockText = '';
            }
            continue;
          }
          if (/^\s*$/.test(line)) continue;
          if (/^\s*\/\//.test(line)) continue;
          if (/^\s*\*/.test(line)) continue;
          if (method_pendingDocblock !== null) {
            let mthMatch = line.match(/(?:public\s+|private\s+|protected\s+)?(?:static\s+)?function\s+(\w+)\s*\(/);
            if (mthMatch) {
              const docblockClean = method_pendingDocblock.replace(/(^\s*\/\*\*|\*\/\s*$)/g, "").replace(/^\s*\*\s?/gm, "");
              const description = this.getDocblockDescription(docblockClean);
              const annotations = this.parseAnnotations(method_pendingDocblock);
              cls.methods.push({ name: mthMatch[1], doc: description, annotations });
              method_pendingDocblock = null;
              continue;
            }
            method_pendingDocblock = null;
          }
        }
      }
    }

    const uniqueFunctions = [];
    const seenFn = new Set();
    for (const fn of functions) {
      if (!seenFn.has(fn.name)) {
        uniqueFunctions.push(fn);
        seenFn.add(fn.name);
      }
    }

    return {
      classes,
      functions: uniqueFunctions,
      constants,
      hooks,
      fileDoc: fileDocs.join("\n\n"),
    };
  }

  async applyBuildEnd() {
    const fs = (await import("fs")).default;
    const path = (await import("path")).default;
    try {
      let files = await this.walk(this.srcDir);
      files.sort();

      const toc = [];
      const sections = [];

      for (const file of files) {
        const relPath = path.relative(process.cwd(), file);
        const relPathUnix = relPath.replace(/\\/g, '/'); // zawsze slashy

        let content;
        try {
          content = fs.readFileSync(file, "utf-8");
        } catch (err) {
          console.warn(`[DocTree] Skipping unreadable file: ${relPathUnix}`);
          continue;
        }

        const { classes, functions, constants, hooks, fileDoc } = this.extractDocblocks(content);

        const hasContent =
          (this.include.classes && classes.length) ||
          (this.include.functions && functions.length) ||
          (this.include.constants && constants.length) ||
          (this.include.hooks && hooks.length) ||
          (fileDoc && fileDoc.length > 0);

        if (hasContent) {
          if (this.include.toc) {
            toc.push(`- [${relPathUnix}](#${this.githubSlug(relPathUnix)})`);
          }

          let section = `### ${relPathUnix}\n\n`;

          if (fileDoc) {
            section += `${fileDoc}\n\n`;
          }

          if (this.include.classes && classes.length) {
            for (const cls of classes) {
              section += `- **${this.labels.classTitle} \`${cls.name}\`** – ${cls.doc}\n`;

              if (this.showAnnotations && cls.annotations.length) {
                for (const ann of cls.annotations) {
                  section += `  - _${ann}_\n`;
                }
              }

              if (this.include.methods && cls.methods.length) {
                for (const method of cls.methods) {
                  section += `  - \`${method.name}()\` – ${method.doc}\n`;

                  if (this.showAnnotations && method.annotations.length) {
                    for (const ann of method.annotations) {
                      section += `    - _${ann}_\n`;
                    }
                  }
                }
              }
            }
          }

          if (this.include.functions && functions.length) {
            section += `\n**${this.labels.functionsTitle}:**\n`;
            for (const fn of functions) {
              section += `- \`${fn.name}()\` – ${fn.doc}\n`;

              if (this.showAnnotations && fn.annotations.length) {
                for (const ann of fn.annotations) {
                  section += `  - _${ann}_\n`;
                }
              }
            }
          }

          if (this.include.constants && constants.length) {
            section += `\n**${this.labels.constantsTitle}:**\n`;
            for (const constant of constants) {
              section += `- \`${constant.name}\` – ${constant.doc}\n`;

              if (this.showAnnotations && constant.annotations.length) {
                for (const ann of constant.annotations) {
                  section += `  - _${ann}_\n`;
                }
              }
            }
          }

          if (this.include.hooks && hooks.length) {
            section += `\n**${this.labels.hooksTitle}:**\n`;
            for (const hook of hooks) {
              section += `- \`${hook.name}()\` – ${hook.doc}\n`;

              if (this.showAnnotations && hook.annotations.length) {
                for (const ann of hook.annotations) {
                  section += `  - _${ann}_\n`;
                }
              }
            }
          }

          sections.push(section);
        }
      }

      let output = `# ${this.labels.docTitle}\n\n`;

      if (this.include.toc && toc.length) {
        output += `## ${this.labels.tocTitle}\n\n${toc.join("\n")}\n\n`;
      }

      output += sections.join("\n");

      fs.mkdirSync(path.dirname(this.outputFile), { recursive: true });

      try {
        fs.writeFileSync(this.outputFile, output);
        console.log(`\n✅ 📄 \x1b[36m[DocTree]\x1b[0m Documentation generated at: ${this.outputFile}\n`);
      } catch (err) {
        console.error(`[DocTree] ❌ Error writing file: ${this.outputFile}\n`, err);
      }
    } catch (error) {
      console.error(`[DocTree] ❌ Unexpected error during documentation generation:\n`, error);
    }
  }
}