import PDFDocument from 'pdfkit';
import type { MapDocument } from '../../map/types.ts';
import type { MapLayoutCopy } from '../../content/map-layout.it.ts';
import { areasPage, darkFooter, nextPage, summaryPage, type PageBody } from './pages.ts';
import { fill, type Ctx } from './primitives.ts';
import { AREA_LADDER, COLOR, LADDER, PAGE, SIZE, CONTENT_WIDTH, type Fit } from './theme.ts';

/** Everything the drawing needs from outside: no file or network access happens in here. */
export interface MapDeps {
	fonts: {
		/** Montserrat SemiBold. */
		heading: Uint8Array;
		/** Montserrat SemiBold Italic: the emphasis word of a title. */
		headingItalic: Uint8Array;
		/** Montserrat Italic: the accent word of the wordmark. */
		brandItalic: Uint8Array;
		/** Lato Regular. */
		body: Uint8Array;
		/** Lato Bold. */
		bold: Uint8Array;
		/** Montserrat Light: the numbers of page 1. */
		display: Uint8Array;
	};
	/** JPEG photographs: the paper waves behind the page 1 masthead, the horizon closing page 4. */
	images: { masthead: Uint8Array; horizon: Uint8Array };
	copy: MapLayoutCopy;
}

export interface PageReport {
	/** Index into the page's ladder of the first level whose content fitted. */
	level: number;
	/** Body size in points at that level. */
	body: number;
	/** The person's own question was cut on this page. */
	cutsQuestion: boolean;
	/** False only if even the tightest level overflowed; the page is then clipped, never extended. */
	fits: boolean;
	bottom: number;
	/** Every string drawn whole on the page; a text that had to be cut is missing from it. */
	printed: string[];
}

const PAGES: [PageBody, Fit[]][] = [
	[summaryPage, LADDER],
	[areasPage(0), AREA_LADDER],
	[areasPage(3), AREA_LADDER],
	[nextPage, LADDER]
];

/** The disclaimer: ink on paper; light on the photograph that closes page 4. */
function drawFooter(ctx: Ctx, dark: boolean) {
	const { pdf, copy } = ctx;
	const x = PAGE.marginX;
	pdf
		.lineWidth(0.6)
		.strokeColor(dark ? COLOR.trackOnDark : COLOR.hairline)
		.moveTo(x, PAGE.footerY - 6)
		.lineTo(x + CONTENT_WIDTH, PAGE.footerY - 6)
		.stroke();
	pdf
		.font('body')
		.fontSize(SIZE.footer)
		.fillColor(dark ? COLOR.white : COLOR.ink);
	pdf.text(copy.footer.disclaimer, x, PAGE.footerY, { width: CONTENT_WIDTH, lineBreak: false });
}

function drawDraftMark(ctx: Ctx) {
	const { pdf } = ctx;
	pdf.save().opacity(0.09).fillColor(COLOR.navy).font('heading').fontSize(150);
	pdf.rotate(-50, { origin: [PAGE.width / 2, PAGE.height / 2] });
	const w = pdf.widthOfString(ctx.copy.draftMark);
	pdf.text(ctx.copy.draftMark, (PAGE.width - w) / 2, PAGE.height / 2 - 75, { lineBreak: false });
	pdf.restore();
}

/** Same as `drawMap`, plus how each page was fitted; used by tests and the sample script. */
export async function renderMap(
	doc: MapDocument,
	deps: MapDeps
): Promise<{ pdf: Uint8Array; pages: PageReport[] }> {
	const created = Date.parse(`${doc.generatedOn}T00:00:00Z`);
	const pdf = new PDFDocument({
		size: 'A4',
		margin: 0,
		autoFirstPage: false,
		// No default font: the standard Helvetica is never loaded, only the embedded brand fonts.
		font: false as unknown as undefined,
		info: {
			Title: Object.values(deps.copy.pages.summary).join(''),
			// Not printed: which catalogue and rules made this map, for whoever looks it up.
			Subject: fill(deps.copy.footer.versions, doc.versions),
			CreationDate: new Date(Number.isNaN(created) ? 0 : created)
		}
	});
	for (const [key, bytes] of Object.entries(deps.fonts)) pdf.registerFont(key, Buffer.from(bytes));

	const chunks: Buffer[] = [];
	pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
	const done = new Promise<Uint8Array>((resolve, reject) => {
		pdf.on('end', () => resolve(new Uint8Array(Buffer.concat(chunks))));
		pdf.on('error', reject);
	});

	const images = {
		masthead: Buffer.from(deps.images.masthead),
		horizon: Buffer.from(deps.images.horizon)
	};
	const reports: PageReport[] = [];
	PAGES.forEach(([body, ladder], i) => {
		pdf.addPage({ size: 'A4', margin: 0 });
		pdf.rect(0, 0, PAGE.width, PAGE.height).fill(COLOR.paper);
		const ctx: Ctx = { pdf, copy: deps.copy, images, fit: ladder[0], dry: true };
		let level = 0;
		let bottom = body(ctx, doc);
		while (bottom > PAGE.bottom && level < ladder.length - 1) {
			ctx.fit = ladder[++level];
			bottom = body(ctx, doc);
		}
		ctx.dry = false;
		ctx.printed = [];
		body(ctx, doc);
		drawFooter(ctx, darkFooter(i + 1));
		// Over the content, so the page 4 photograph cannot hide it.
		if (doc.draft) drawDraftMark(ctx);
		reports.push({
			level,
			body: ladder[level].body,
			cutsQuestion: Number.isFinite(ladder[level].questionLines),
			fits: bottom <= PAGE.bottom,
			bottom,
			printed: ctx.printed
		});
	});
	pdf.end();
	return { pdf: await done, pages: reports };
}

/** Draws the four-page map and returns the PDF bytes. */
export async function drawMap(doc: MapDocument, deps: MapDeps): Promise<Uint8Array> {
	return (await renderMap(doc, deps)).pdf;
}
