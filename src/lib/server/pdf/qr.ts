import QRCode from 'qrcode';
import { COLOR } from './theme.ts';
import type { Ctx } from './primitives.ts';

/** Quiet zone around the code, in modules. */
const QUIET = 2;

/**
 * Draws the QR code as vector rectangles (runs of dark modules per row) so it stays sharp in
 * print. Returns the side of the square including its quiet zone.
 */
export function drawQr(ctx: Ctx, url: string, x: number, y: number, side: number): number {
	if (ctx.dry) return side;
	const modules = QRCode.create(url, { errorCorrectionLevel: 'M' }).modules;
	const { size } = modules;
	const get = (row: number, col: number) => modules.get(row, col);
	const unit = side / (size + 2 * QUIET);
	const pdf = ctx.pdf.save().fillColor(COLOR.ink);
	for (let row = 0; row < size; row++) {
		for (let col = 0; col < size;) {
			if (!get(row, col)) {
				col++;
				continue;
			}
			const start = col;
			while (col < size && get(row, col)) col++;
			pdf.rect(x + (start + QUIET) * unit, y + (row + QUIET) * unit, (col - start) * unit, unit);
		}
	}
	pdf.fill().restore();
	return side;
}
