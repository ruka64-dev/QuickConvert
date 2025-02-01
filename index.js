import { spawn } from 'child_process';
import { consola } from 'consola';
import { lstat, readdir, stat } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { parse, join, isAbsolute } from 'path';

const __dirname = import.meta.dirname;

const ExtArr = ['bmp', 'ico', 'jpg', 'svg', 'tif', 'webp', 'png'];

export function mkdirIfnotExists(path) {
	console.log(path);
	try {
		if (!existsSync(path)) {
			mkdirSync(path, { recursive: true });
		}
	} catch (e) {
		throw new Error(e);
	}
}

/**
 * Convert file with ffmpeg
 * @param {string} path
 * @param {string} Ext_to
 * @returns true | Error
 */
function Convert(path, ext) {
	return new Promise((resolve, reject) => {
		const is = ExtArr.includes(ext);
		console.log(is);
		if (!is) {
			throw new Error(`Unsupported extension (${ext})`);
		} else {
			//* Without extension
			const filename = parse(path).name;

			const outputDir = join(__dirname, 'output');
			mkdirIfnotExists(outputDir);
			const output = join(outputDir, `${filename}.${ext}`);

			const cmd = 'ffmpeg';
			const args = ['-i', `"${path}"`, `"${output}"`];

			const cp = spawn(cmd, args, { shell: true, stdio: 'inherit' });
			cp.on('close', (code) => {
				if (code == 0) resolve(true);
				else reject(new Error(`[FFmpeg] Failed with code ${code}`));
			});
		}
	});
}

let repeat = 0;

async function main() {
	const pathstr = await consola.prompt('Enter the target folder (absolute path):', {
		type: 'text',
	});
	if (!pathstr) {
		if (repeat >= 1) {
			process.exit(0);
		}
		consola.fail('Please enter the folder path');
		repeat++;
		return main();
	}
	const path = pathstr.replace(/"/g, '');
	console.log(path);
	console.log(isAbsolute(path));
	try {
		if (!(await lstat(path)).isDirectory()) {
			consola.fail('That path is not directory.');
			return main();
		}
	} catch (e) {
		consola.fail('Failed to check path (incorrect path?)');
		consola.error(e);
		return main();
	}
	const ext = await consola.prompt('Choose the file extension that after converted', {
		type: 'select',
		required: true,
		options: ExtArr,
	});
	// const path = join(pathStr);
	consola.info(`Reading ${path}...`);
	const files = await readdir(path);
	let all = 0;
	let success = 0;
	let failed = 0;
	await Promise.all(
		files.map(async (file) => {
			const FsStat = await stat(join(path, file));
			if (FsStat.isDirectory()) {
				//* Ignore child directory
				return;
			} else {
				consola.info(`Converting ${file}...`);
				all++;
				try {
					await Convert(join(path, file), ext);
					consola.success(`Converted ${file}`);
					success++;
				} catch (e) {
					consola.fail(`Error occured while converting ${file}`);
					consola.error(e);
					failed++;
				}
			}
		})
	);
	consola.success(failed !== 0 ? `Successfully converted ${success} files` : `Successfully converted ${success}/${all} files (${failed} files failed to convert! please check the error log.)`);
}

function kill() {
	console.log('BYE');
	process.exit(0);
}

process.on('SIGINT', kill);
process.on('SIGTERM', kill);

main();
