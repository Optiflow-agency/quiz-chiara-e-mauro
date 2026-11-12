import { describe, expect, it } from 'vitest';
import { mapEmail } from './map-email.it';

describe('mapEmail', () => {
	it('carries the disclaimer and the contact link in both parts', () => {
		const { subject, text, html } = mapEmail();
		expect(subject).toBe('La tua mappa finanziaria');
		for (const part of [text, html]) {
			expect(part).toContain('Non è una consulenza e non contiene raccomandazioni.');
			expect(part).toContain('https://mauroschileo.it/contatti/');
		}
	});
});
