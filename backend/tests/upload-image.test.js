const request = require("supertest");
const { makeApp, authHeader } = require("./testUtils");

const app = makeApp();
const agent = request(app);

describe('POST /api/upload-image', () => {
    it('401 without credentials', async () => {
        const res = await agent
            .post('/api/upload-image')
            .send({});
        expect(res.status).toBe(401);
        expect(res.body).toMatchObject({
            message: 'Unauthorized',
            details: [ 'No credentials provided' ]
        });
    });

    it('403 with invalid credentials', async () => {
        const res = await agent
            .post('/api/upload-image')
            .set('Authorization', 'Bearer invalid')
            .send({});
        expect(res.status).toBe(403);
        expect(res.body).toMatchObject({
            message: 'Unauthorized',
            details: [ 'Invalid credentials' ]
        });
    });

    it('400 when no file is sent', async () => {
        const res = await agent
            .post('/api/upload-image')
            .set(authHeader())
            .send({});              // no multipart/form-data
        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({
            message: 'Validation failed',
            details: [ 'No file uploaded' ]
        });
    });

    it('400 when wrong field-name is used', async () => {
        const res = await agent
            .post('/api/upload-image')
            .set(authHeader())
            .field('not_file', 'oops')
            .attach('not_file', Buffer.from('fake'), {
                filename: 'fake.png',
                contentType: 'image/png'
            });
        expect(res.status).toBe(400);
        expect(res.body.details).toContain('No file uploaded');
    });

    it('413 when file too large', async () => {
        // generate a Buffer >10 MiB
        const large = Buffer.alloc(11 * 1024 * 1024, 0);
        const res = await agent
            .post('/api/upload-image')
            .set(authHeader())
            .attach('file', large, {
                filename: 'big.png',
                contentType: 'image/png'
            });
        expect(res.status).toBe(413);
        expect(res.body).toMatchObject({
            message: 'Validation failed',
            details: expect.arrayContaining([ expect.stringMatching(/File too large/) ])
        });
    });

    it('200 and returns a .webp URL on success', async () => {
        const tiny = Buffer.from(
            // a 1×1 transparent PNG
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
            'base64'
        );
        const res = await agent
            .post('/api/upload-image')
            .set(authHeader())
            .attach('file', tiny, {
                filename: 'pixel.png',
                contentType: 'image/png'
            });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('url');
        // url should start with /uploads/ and end in .webp
        expect(res.body.url).toMatch(/^\/uploads\/\d+\-.*\.webp$/);
    });
});
