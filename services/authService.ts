
import { User } from '../types.ts';

const USERS_KEY = 'sb_users_db';
const SESSION_KEY = 'sb_current_session';

export const authService = {
  // สมัครสมาชิก
  register: async (username: string, fullName: string, password: string): Promise<User> => {
    // จำลอง Network Delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const users: any[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    
    if (users.find(u => u.username === username)) {
      throw new Error('ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว');
    }

    const newUser: any = {
      id: Math.random().toString(36).substr(2, 9),
      username,
      fullName,
      password, // ในระบบจริงต้อง Hash รหัสผ่าน
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword as User;
  },

  // เข้าสู่ระบบ
  login: async (username: string, password: string): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const users: any[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
      throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    const { password: _, ...userWithoutPassword } = user;
    localStorage.setItem(SESSION_KEY, JSON.stringify(userWithoutPassword));
    return userWithoutPassword as User;
  },

  // ออกจากระบบ
  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  // ดึงข้อมูลผู้ใช้ปัจจุบัน
  getCurrentUser: (): User | null => {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  }
};
