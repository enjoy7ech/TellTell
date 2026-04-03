import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CORE_DIR = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.resolve(CORE_DIR, 'meta/RequirementMetadata.json');

function scanFile(filePath: string, registry: any) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const regex = /\/\*\*[\s\S]*?#DEFINE_UI_FUNCTION([\s\S]*?)#END_DEFINE_UI_FUNCTION[\s\S]*?\*\/[\s\S]*?public\s+(?:async\s+)?(\w+)/g;
    
    let match;
    while ((match = regex.exec(content)) !== null) {
        const metadataRaw = match[1];
        const funcName = match[2];
        
        const metadata: any = {
            description: '',
            module: '',
            type: 'action', // Default to action
            moduleLabel: '',
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
        
        // Parse @params with pipes
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

function run() {
    const registry: any = {};
    
    // Scan core files
    const files: string[] = fs.readdirSync(CORE_DIR)
        .filter((f: string) => f.endsWith('.ts'))
        .map((f: string) => path.join(CORE_DIR, f));
        
    for (const f of files) {
        scanFile(f, registry);
    }
    
    // Ensure output directory exists
    const outDir = path.resolve(CORE_DIR, 'meta');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    
    // Output one single file for everything
    const outputFile = path.join(outDir, 'meta.json');
    fs.writeFileSync(outputFile, JSON.stringify(registry, null, 2));
    console.log(`Generated combined metadata for ${Object.keys(registry).length} modules at ${outputFile}`);
}

run();
