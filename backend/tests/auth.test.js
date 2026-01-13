const request = require("supertest");
const { makeApp } = require("./testUtils");

const app = makeApp();
const agent = request.agent(app);

describe('Auth flow', () => {
    it('200 and sets cookies on correct credentials', async () => {
        const res = await agent.post('/api/login').send({ username: 'admin', password: 'password' });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true });

        // both tokens set?
        const cookies = res.headers['set-cookie'].join(';');
        expect(cookies).toMatch(/access_token=/);
        expect(cookies).toMatch(/refresh_token=/);
    });

    it('401 on wrong credentials', async () => {
        const res = await agent
            .post('/api/login')
            .send({ username: 'foo', password: 'bar' });
        expect(res.status).toBe(401);
    });

    it('400 when body is missing fields', async () => {
        const res = await request(app).post('/api/login').send({});
        expect(res.status).toBe(400);
    });

    // ────────────────────── POST /refresh ────────────────────
    it('401 when no refresh cookie present', async () => {
        const res = await request(app).post('/api/refresh');
        expect(res.status).toBe(401);
    });

    it('401 on invalid refresh token', async () => {
        const res = await request(app)
            .post('/api/refresh')
            .set('Cookie', 'refresh_token=bad.token.here');
        expect(res.status).toBe(401);
    });

    it('200 and rotates tokens when refresh cookie is valid', async () => {
        // we already logged in in the first test, so agent has cookies
        const res = await agent.post('/api/refresh');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true });

        // Make sure brand-new access/refresh cookies are issued
        const cookies = res.headers['set-cookie'].join(';');
        expect(cookies.match(/access_token=/g).length).toBe(1);
        expect(cookies.match(/refresh_token=/g).length).toBe(1);
    });

    // ────────────────────── POST /logout ─────────────────────
    it('204 and clears cookies on logout', async () => {
        const res = await agent.post('/api/logout');

        expect(res.status).toBe(204);
        const cookies = res.headers['set-cookie'].join(';');
        expect(cookies).toMatch(/access_token=;/);
        expect(cookies).toMatch(/refresh_token=;/);
    });
});
