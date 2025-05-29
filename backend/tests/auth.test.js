const request = require("supertest");
const { makeApp } = require("./testUtils");

const app = makeApp();
const agent = request(app);

describe('Auth flow', () => {
    it('returns a token for valid credentials', async () => {
        const { body, status } = await agent
            .post('/api/login')
            .send({ username: 'admin', password: 'password' });
        expect(status).toBe(200);
        expect(body.token).toBeDefined();
    });

    it('401s on wrong credentials', async () => {
        const res = await agent
            .post('/api/login')
            .send({ username: 'foo', password: 'bar' });
        expect(res.status).toBe(401);
    });
});
