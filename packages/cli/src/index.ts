import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');

const program = new Command();

program
  .name('telltell')
  .description('TellTell Game Engine CLI Tool')
  .version('1.0.0');

// add command (currently only supports plugin)
const add = program.command('add').description('Add something to the project');

add
  .command('plugin')
  .description('Interactively create a new plugin')
  .action(async () => {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Enter plugin name (e.g. "mobile"):',
        validate: (input: string) => input.trim() !== '' || 'Plugin name cannot be empty.'
      }
    ]);

    const pluginName = answers.name.toLowerCase();
    const pluginDir = path.resolve(ROOT_DIR, `packages/plugin-${pluginName}`);
    const templateDir = path.resolve(__dirname, '../templates/plugin');

    if (await fs.pathExists(pluginDir)) {
      console.error(chalk.red(`Error: Plugin directory "${pluginDir}" already exists.`));
      process.exit(1);
    }

    if (!(await fs.pathExists(templateDir))) {
        console.error(chalk.red(`Error: Template directory "${templateDir}" NOT found.`));
        process.exit(1);
    }

    console.log(chalk.blue(`Creating plugin ${pluginName}...`));
    await fs.ensureDir(pluginDir);
    
    // Copy templates and replace {{name}}
    const files = await fs.readdir(templateDir);
    for (const file of files) {
      const templatePath = path.join(templateDir, file);
      let content = await fs.readFile(templatePath, 'utf8');
      content = content.replace(/{{name}}/g, pluginName);
      await fs.writeFile(path.join(pluginDir, file), content);
    }

    console.log(chalk.green(`Success: Plugin "${pluginName}" created at ${pluginDir}`));
    console.log(chalk.yellow(`Don't forget to run "pnpm install" to link workspace dependencies.`));
  });

// meta command
program
  .command('meta')
  .description('Scan current directory for #DEFINE_UI_FUNCTION and generate meta.json')
  .action(async () => {
    const cwd = process.cwd();
    const metaDir = path.join(cwd, 'meta');
    const registry: any = {};

    console.log(chalk.blue(`Scanning .ts files in ${cwd}...`));

    const files = await fs.readdir(cwd);
    const tsFiles = files.filter((f: string) => f.endsWith('.ts') && !f.endsWith('.d.ts'));

    if (tsFiles.length === 0) {
      console.warn(chalk.yellow('No .ts files found in the current directory.'));
    }

    for (const file of tsFiles) {
      const filePath = path.join(cwd, file);
      const content = await fs.readFile(filePath, 'utf8');
      
      // Meta extraction regex
      const regex = /\/\*\*[\s\S]*?#DEFINE_UI_FUNCTION([\s\S]*?)#END_DEFINE_UI_FUNCTION[\s\S]*?\*\/[\s\S]*?public\s+(?:async\s+)?(\w+)/g;
      
      let match;
      while ((match = regex.exec(content)) !== null) {
        const metadataRaw = match[1];
        const funcName = match[2];
        
        const metadata: any = {
          description: '',
          module: 'Default',
          type: 'action',
          moduleLabel: 'Default Module',
          params: []
        };
        
        // Parse @description
        const descMatch = metadataRaw.match(/@description\s+(.*)/);
        if (descMatch) metadata.description = descMatch[1].trim();

        // Parse @type
        const typeMatch = metadataRaw.match(/@type\s+(judge|action)/);
        if (typeMatch) metadata.type = typeMatch[1].trim();
        
        // Parse @module
        const modMatch = metadataRaw.match(/@module\s+(\w+)\s+(.*)/);
        if (modMatch) {
          metadata.module = modMatch[1];
          metadata.moduleLabel = modMatch[2].trim();
        }
        
        // Parse @params
        const paramMatches = metadataRaw.matchAll(/@param\s+(\w+)\s+(.*)/g);
        for (const pMatch of paramMatches) {
          const pName = pMatch[1];
          const pLine = pMatch[2].trim();
          const segments = pLine.split('|').map((s: string) => s.trim());
          
          const pLabel = segments[0];
          let pType = 'text';
          const pProps: any = {};
          
          for (let i = 1; i < segments.length; i++) {
            const kv = segments[i].split(':').map((s: string) => s.trim());
            if (kv.length === 2) {
              const key = kv[0];
              const val = kv[1] === 'false' ? false : (kv[1] === 'true' ? true : kv[1]);
              
              if (key === 'unit') {
                pType = val as string;
              } else {
                pProps[key] = val;
              }
            }
          }
          
          metadata.params.push({
            name: pName,
            label: pLabel,
            type: pType,
            props: pProps
          });
        }
        
        // Add to registry
        if (!registry[metadata.module]) {
          registry[metadata.module] = {
            label: metadata.moduleLabel,
            funcs: {}
          };
        }
        
        registry[metadata.module].funcs[funcName] = {
          label: metadata.description,
          type: metadata.type,
          params: metadata.params
        };
      }
    }

    if (Object.keys(registry).length === 0) {
      console.warn(chalk.yellow('No metadata definitions found in current directory.'));
    } else {
        await fs.ensureDir(metaDir);
        const outputFile = path.join(metaDir, 'meta.json');
        await fs.writeJSON(outputFile, registry, { spaces: 2 });
        console.log(chalk.green(`Successfully generated meta.json at ${outputFile}`));
    }
  });

program.parse();
