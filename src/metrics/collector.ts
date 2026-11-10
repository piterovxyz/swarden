import * as fs from 'fs';
const SHARED_BUFFER = Buffer.alloc(8192);

function getInfo(path: string) {
    try {
        SHARED_BUFFER.write(fs.readFileSync(path, 'utf8'));
        return SHARED_BUFFER.toString('utf8');
    } catch (err) {
        console.error(`Error reading file at ${path}:`, err);
    }
}
