const request = require("supertest");
const { makeApp } = require("./testUtils");

const app = makeApp();
const agent = request(app);

describe('Auth flow', () => {
    it('200 for valid credentials', async () => {
        const { status } = await agent
            .post('/api/login')
            .send({ username: 'admin', password: 'password' });
        expect(status).toBe(200);
    });

    it('401 on wrong credentials', async () => {
        const res = await agent
            .post('/api/login')
            .send({ username: 'foo', password: 'bar' });
        expect(res.status).toBe(401);
    });
});
