import { vi, afterEach } from 'vitest';

// Ensure predictable env
process.env.ADMIN_USER = 'admin';
process.env.ADMIN_PASS = 'password';
process.env.JWT_SECRET = 'shhhhh';

// Silence console noise in test output
vi.spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => vi.clearAllMocks());
