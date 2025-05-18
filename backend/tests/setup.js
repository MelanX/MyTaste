// Ensure predictable env
process.env.ADMIN_USER = 'admin';
process.env.ADMIN_PASS = 'password';
process.env.JWT_SECRET = 'shhhhh';

// Silence console noise in test output
jest.spyOn(console, 'error').mockImplementation(() => {
});
