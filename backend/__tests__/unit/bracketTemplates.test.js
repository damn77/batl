import { describe, it, expect } from '@jest/globals';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Bracket Templates Validation (FR-012)', () => {
  let templates;

  beforeAll(async () => {
    const filePath = path.join(__dirname, '../../../docs/bracket-templates-all.json');
    const data = await readFile(filePath, 'utf-8');
    templates = JSON.parse(data);
  });

  it('should have templates for all player counts 4-128', () => {
    expect(templates).toBeDefined();
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBe(125); // 128 - 4 + 1 = 125

    for (let i = 4; i <= 128; i++) {
      const template = templates.find(t => t.key === String(i));
      expect(template).toBeDefined();
      expect(template).toHaveProperty('key', String(i));
      expect(template).toHaveProperty('value');
    }
  });

  it('should have valid structure format (0s and 1s only, with optional spaces)', () => {
    templates.forEach(template => {
      expect(template.value).toMatch(/^[01\s]+$/);
      expect(template.value.length).toBeGreaterThan(0);
    });
  });

  it('should have structures that make mathematical sense', () => {
    // Verify a few known templates match expected patterns
    const template7 = templates.find(t => t.key === '7');
    expect(template7.value).toBe('1000');

    const template11 = templates.find(t => t.key === '11');
    expect(template11.value).toBe('1110 0101');

    const template16 = templates.find(t => t.key === '16');
    expect(template16.value).toBe('0000 0000');
  });

  it('should have templates with reasonable structure lengths', () => {
    // Verify structure lengths are positive and reasonable
    templates.forEach(template => {
      const structure = template.value.replace(/\s/g, '');
      expect(structure.length).toBeGreaterThan(0);
      expect(structure.length).toBeLessThanOrEqual(128);
    });
  });

  it('should have valid 0s and 1s distribution', () => {
    // Verify each template has valid character composition
    templates.forEach(template => {
      const structure = template.value.replace(/\s/g, '');
      const countOnes = (structure.match(/1/g) || []).length;
      const countZeros = (structure.match(/0/g) || []).length;

      // Total should equal structure length
      expect(countOnes + countZeros).toBe(structure.length);
      // Structure should not be empty
      expect(structure.length).toBeGreaterThan(0);
    });
  });
});
