// Downloads the OCR models that ship inside the app (resources/ocr/).
//
// The models are PaddleOCR's PP-OCRv6 / PP-OCRv5 recognition models
// (Apache-2.0, https://github.com/PaddlePaddle/PaddleOCR), exported to ONNX.
// They are too large to keep in git, so `npm run dev` and `npm run build`
// fetch them once. Every file is checked against a SHA-256 below; a file that
// is already present and matches is not downloaded again.
//
//   node scripts/fetch-ocr-models.mjs          download what is missing
//   node scripts/fetch-ocr-models.mjs --check  only verify, exit 1 if missing
//   node scripts/fetch-ocr-models.mjs --optional  never fail (npm run dev offline)

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, 'resources', 'ocr');

// Same files, two hosts: the Hugging Face repo and its GitHub mirror.
const MIRRORS = [
    'https://huggingface.co/snowfluke/ppu-paddle-ocr-models/resolve/main',
    'https://media.githubusercontent.com/media/PT-Perkasa-Pilar-Utama/ppu-paddle-ocr-models/main',
    'https://raw.githubusercontent.com/PT-Perkasa-Pilar-Utama/ppu-paddle-ocr-models/main',
];

/** name in resources/ocr → [remote path, sha256] */
export const FILES = {
    'det.onnx': ['detection/PP-OCRv6_small_det.onnx', 'd73e0058b7a8086bbd57f3d10b8bcd4ff95363f67e06e2762b5e814fe9c9410e'],
    'rec-v6.onnx': ['recognition/PP-OCRv6_small_rec.onnx', '5435fd747c9e0efe15a96d0b378d5bd157e9492ed8fd80edf08f30d02fa24634'],
    'rec-v6.txt': ['recognition/ppocrv6_dict.txt', '41557512862dfe31970cf22407742b629725461dd84c0d8771bde9c87c2202c8'],
};
const PACKS = { cyrillic: 'cyrillic', korean: 'korean', arabic: 'arabic', greek: 'el', thai: 'th', devanagari: 'devanagari', tamil: 'ta', telugu: 'te' };
const PACK_HASHES = {
    'cyrillic.onnx': '0d91040605ef7bdca6868fad6cad1664840d031e9f6d40d54607df5b50fa280a',
    'cyrillic.txt': '90822a96058eb83f8e637ace75f90cbd36c41253f9dbdfb88fcf5a2bdd50d669',
    'korean.onnx': 'ee0dfde503d787c91fd0455daae2eb85311b4b5bdcddf85a54d8c1e0adc157de',
    'korean.txt': 'a3792cbb41215a43e555e16ff4a7f7b18db5dd80cd058637098f0d872f2dd9d6',
    'arabic.onnx': 'b58f7d1cc7200566aae1d56ac26c17942881958ed100ac5a07d9a6e67150cbef',
    'arabic.txt': 'f6b5baf1335408e6e1fb5cc6e8268a26769f549c2bb37268e72a6804fe269b4c',
    'greek.onnx': '54235f471b1ca8e356c48673125e0b14e4823496cd7bb583b24fb8808dbcd9c4',
    'greek.txt': '17147b8921fbcc7d2bcbc69cb7dbb7ae61cc0808e6dec1b311d746ffe5f6afed',
    'thai.onnx': '6f07aa2af58713da04b4bdaf1524588d8051fc734db5a1ad7b7a65c1e7c7ec18',
    'thai.txt': 'eaacae5cf9b0808d9078ce1152c9ea5c6099d1f563750e66b93c12854acea31a',
    'devanagari.onnx': '932e2d53fafdfd929131c4e20133f49901288e8ec1ba03b18317a4780b21f3ce',
    'devanagari.txt': '4bfb5fc511c24da3b1f3a582ae4e07ecd16601997b70b864bb34e111fc646cfe',
    'tamil.onnx': '99734f0d198fddc89869dcce54cab4c8330898bac6ab4a192ee5aef4debb023b',
    'tamil.txt': 'ed4c188a82743f6067809d004be1b320b3d2c53c849a9ca83f8e47e7bcd6010f',
    'telugu.onnx': 'e068d1331426f686bcffa65b04d295359f2615429100119482e7687e91420504',
    'telugu.txt': '3b4fa5b9a85676c59681df9155612b86d61a407a2abb074f729ae66e41301a57',
};
for (const [id, dir] of Object.entries(PACKS)) {
    FILES[`rec-${id}.onnx`] = [`recognition/multi/${dir}/v5/${dir}_PP-OCRv5_mobile_rec_infer.onnx`, PACK_HASHES[`${id}.onnx`]];
    FILES[`rec-${id}.txt`] = [`recognition/multi/${dir}/v5/ppocrv5_${dir}_dict.txt`, PACK_HASHES[`${id}.txt`]];
}

const sha256 = buf => createHash('sha256').update(buf).digest('hex');

async function download(remote) {
    let lastErr;
    for (const base of MIRRORS) {
        const url = `${base}/${remote}`;
        try {
            const res = await fetch(url, { redirect: 'follow' });
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            const buf = Buffer.from(await res.arrayBuffer());
            // A Git LFS pointer instead of the file means this host only had the pointer
            if (buf.length < 200 && buf.toString('utf8').startsWith('version https://git-lfs')) throw new Error('LFS pointer');
            return buf;
        } catch (e) {
            lastErr = new Error(`${url}: ${e.message}`);
        }
    }
    throw lastErr;
}

async function main() {
    const checkOnly = process.argv.includes('--check');
    mkdirSync(outDir, { recursive: true });
    let missing = 0;
    for (const [name, [remote, hash]] of Object.entries(FILES)) {
        const file = path.join(outDir, name);
        if (existsSync(file) && sha256(readFileSync(file)) === hash) continue;
        if (checkOnly) {
            console.error(`missing or changed: resources/ocr/${name}`);
            missing++;
            continue;
        }
        process.stdout.write(`OCR model: ${name} … `);
        const buf = await download(remote);
        const got = sha256(buf);
        if (got !== hash) throw new Error(`${name}: SHA-256 ${got} does not match the expected ${hash}`);
        writeFileSync(file + '.part', buf);
        renameSync(file + '.part', file);
        console.log(`${(buf.length / 1e6).toFixed(1)} MB`);
    }
    if (missing) process.exit(1);
}

main().catch(e => {
    console.error(`\nCould not fetch the OCR models: ${e.message}`);
    console.error('Text recognition for scanned pages will be unavailable until they are downloaded.');
    process.exit(process.argv.includes('--optional') ? 0 : 1);
});
