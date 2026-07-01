import { describe, it, expect } from 'vitest';
import { recipeSchema, loginSchema, importSchema, configSchema, recipeStatusSchema } from '../src/utils/schemes.js';

const validRecipe = {
  title: 'Schokokuchen',
  url: 'https://example.com/r',
  image: 'https://example.com/x.jpg',
  ingredient_sections: [{ title: null, ingredients: [{ name: 'Mehl', amount: 200, unit: 'g' }] }],
  instructions: ['Backen bei 180 Grad.'],
};

describe('recipeSchema', () => {
  it('accepts a valid recipe and keeps snake_case fields', () => {
    const { error, value } = recipeSchema.validate(validRecipe);
    expect(error).toBeUndefined();
    expect(value).toHaveProperty('ingredient_sections');
    expect(value).not.toHaveProperty('ingredientSections');
  });

  it('rejects a title shorter than 3 chars', () => {
    const { error } = recipeSchema.validate({ ...validRecipe, title: 'ab' });
    expect(error?.message).toContain('at least 3 characters');
  });

  it('rejects when instructions are empty', () => {
    const { error } = recipeSchema.validate({ ...validRecipe, instructions: [] });
    expect(error).toBeDefined();
  });

  it('rejects an invalid image path', () => {
    const { error } = recipeSchema.validate({ ...validRecipe, image: '/uploads/evil.exe' });
    expect(error).toBeDefined();
  });

  it('accepts a relative /uploads/*.webp image', () => {
    const { error } = recipeSchema.validate({ ...validRecipe, image: '/uploads/123-x.webp' });
    expect(error).toBeUndefined();
  });

  it('accepts a valid recipeType and dietaryRestrictions', () => {
    const { error } = recipeSchema.validate({
      ...validRecipe,
      recipeType: 'baking',
      dietaryRestrictions: ['vegan', 'glutenfree'],
    });
    expect(error).toBeUndefined();
  });

  it('rejects an unknown recipeType', () => {
    const { error } = recipeSchema.validate({ ...validRecipe, recipeType: 'frying' });
    expect(error).toBeDefined();
  });

  it('requires section titles when there are multiple sections', () => {
    const { error } = recipeSchema.validate({
      ...validRecipe,
      ingredient_sections: [
        { title: 'Teig', ingredients: [{ name: 'Mehl' }] },
        { title: '', ingredients: [{ name: 'Zucker' }] },
      ],
    });
    expect(error).toBeDefined();
  });

  it('allows a single untitled section', () => {
    const { error } = recipeSchema.validate({
      ...validRecipe,
      ingredient_sections: [{ title: null, ingredients: [{ name: 'Mehl' }] }],
    });
    expect(error).toBeUndefined();
  });
});

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expect(loginSchema.validate({ username: 'admin', password: 'pw' }).error).toBeUndefined();
  });
  it('rejects a missing password', () => {
    expect(loginSchema.validate({ username: 'admin' }).error).toBeDefined();
  });
});

describe('importSchema', () => {
  it('accepts a public https URL', () => {
    expect(importSchema.validate({ url: 'https://example.com/r' }).error).toBeUndefined();
  });
  it('rejects a private/loopback URL', () => {
    const { error } = importSchema.validate({ url: 'http://127.0.0.1/x' });
    expect(error?.message).toContain('not allowed');
  });
  it('rejects a non-http protocol', () => {
    const { error } = importSchema.validate({ url: 'ftp://example.com/x' });
    expect(error).toBeDefined();
  });
  it('rejects a localhost subdomain', () => {
    expect(importSchema.validate({ url: 'http://api.localhost/x' }).error).toBeDefined();
  });
});

describe('configSchema', () => {
  it('accepts a config with consistent spice_map', () => {
    const { error } = configSchema.validate({
      spice_rules: { spices: ['Salz', 'Pfeffer'], spice_map: { Mix: ['Salz'] } },
    });
    expect(error).toBeUndefined();
  });

  it('rejects a spice_map referencing an unknown spice', () => {
    const { error } = configSchema.validate({
      spice_rules: { spices: ['Salz'], spice_map: { Mix: ['Kurkuma'] } },
    });
    expect(error).toBeDefined();
  });

  it('rejects duplicate spices', () => {
    const { error } = configSchema.validate({ spice_rules: { spices: ['Salz', 'Salz'] } });
    expect(error).toBeDefined();
  });

  it('rejects unknown top-level keys', () => {
    const { error } = configSchema.validate({ unexpected: true });
    expect(error).toBeDefined();
  });

  it('rejects an empty patch (min 1 key)', () => {
    const { error } = configSchema.validate({});
    expect(error).toBeDefined();
  });

  it('accepts rename_rules and bring_rules', () => {
    const { error } = configSchema.validate({
      rename_rules: [{ from: ['A', 'B'], to: 'Alpha' }],
      bring_rules: [{ from: ['Ei'], to: 'Eier' }],
    });
    expect(error).toBeUndefined();
  });
});

describe('recipeStatusSchema', () => {
  it('accepts a favorite flag', () => {
    expect(recipeStatusSchema.validate({ status: { favorite: true } }).error).toBeUndefined();
  });
  it('rejects an empty status object', () => {
    expect(recipeStatusSchema.validate({ status: {} }).error).toBeDefined();
  });
  it('rejects unknown status keys', () => {
    expect(recipeStatusSchema.validate({ status: { foo: true } }).error).toBeDefined();
  });
});
