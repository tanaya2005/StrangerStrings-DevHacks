// ============================================================
//  mockDB.js — In-memory fallback user store
//  Used when MongoDB is unavailable (offline dev/testing)
//  For testing voice/chat features without DB dependency
// ============================================================
import bcryptjs from "bcryptjs";

const mockUsers = new Map(); // email -> user object

export async function mockFindUserByEmail(email) {
    return mockUsers.get(email?.toLowerCase()?.trim());
}

export async function mockCreateUser(email, username, password, dateOfBirth) {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check duplicates
    if (mockUsers.has(normalizedEmail)) return null;
    
    const hashedPassword = await bcryptjs.hash(password, 10);
    const user = {
        _id: `mock_${Date.now()}`,
        email: normalizedEmail,
        username: username.trim(),
        password: hashedPassword,
        dateOfBirth: new Date(dateOfBirth),
        trophies: 0,
        wins: 0,
        gamesPlayed: 0,
        // Mock method to check password
        matchPassword: async function(pass) {
            return await bcryptjs.compare(pass, this.password);
        },
    };
    
    mockUsers.set(normalizedEmail, user);
    return user;
}

export function isMockDBAvailable() {
    return true; // Always available as fallback
}

// For testing: pre-populate with a demo account
export function seedMockDB() {
    (async () => {
        const demoExists = await mockFindUserByEmail("demo@test.com");
        if (!demoExists) {
            await mockCreateUser("demo@test.com", "demouser", "demo123", "2005-01-01");
            console.log("📝 Mock demo account created: demo@test.com / demo123");
        }
    })();
}
