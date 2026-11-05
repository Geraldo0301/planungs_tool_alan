import fs from 'node:fs/promises';
import path from 'node:path';
import type { SAPMaterialData } from '../types/scm';

const DATA_PATH = path.resolve(
    __dirname, '../../src/data/mockMaterials.json'
);

interface MaterialsCache {
    signature: string;
    materials: SAPMaterialData[];
}

let cache: MaterialsCache | null = null;

//simultaneous requests share one same load
let pendingLoad: Promise<SAPMaterialData[]> | null = null;

async function getFileSignature(): Promise<string> {
    const stats = await fs.stat(DATA_PATH);

    return [
        stats.ino,
        stats.size,
        stats.mtimeMs,
        stats.ctimeMs,
    ].join(':')
}

async function readMaterials(): Promise<SAPMaterialData[]> {
    //retry if the file change while being read
    for (let attempt = 0; attempt < 3; attempt++) {
        const signatureBefore = await getFileSignature();

        if (cache?.signature === signatureBefore) {
            return cache.materials;
        }

        const content = await fs.readFile(DATA_PATH, 'utf-8');
        const signatureAfter = await getFileSignature();

        if (signatureBefore != signatureAfter) {
            continue;
        }

        const parsed: unknown = JSON.parse(content);

        if (!Array.isArray(parsed)) {
            throw new Error('Array list expected')
        }

        const materials = parsed as SAPMaterialData[];

        cache = {
            signature: signatureAfter,
            materials,
        };

        return materials;
    }

    throw new Error('Material Data is being changed. Please try again');
}

export function loadRawMaterials(): Promise<SAPMaterialData[]> {
    if (pendingLoad) {
        return pendingLoad;
    }

    pendingLoad = readMaterials().finally(() => {
        pendingLoad = null;
    });

    return pendingLoad;
}