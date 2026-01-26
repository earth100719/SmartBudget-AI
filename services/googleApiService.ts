
import { BudgetState } from '../types.ts';

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';
let tokenClient: any = null;
let accessToken: string | null = null;

/**
 * Helper to wait for the global 'google' object from Identity Services to be available.
 */
const waitForGoogle = (): Promise<any> => {
  return new Promise((resolve) => {
    if ((window as any).google) {
      return resolve((window as any).google);
    }
    const interval = setInterval(() => {
      if ((window as any).google) {
        clearInterval(interval);
        resolve((window as any).google);
      }
    }, 100);
    // Timeout after 10 seconds to prevent infinite wait
    setTimeout(() => {
      clearInterval(interval);
      resolve(null);
    }, 10000);
  });
};

export const googleApiService = {
  // เริ่มต้น OAuth2 Client
  init: async () => {
    const google = await waitForGoogle();
    if (!google) {
      console.warn('Google Identity Services library not loaded.');
      return null;
    }

    return new Promise((resolve) => {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
        scope: SCOPES,
        callback: (response: any) => {
          if (response.error !== undefined) {
            throw response;
          }
          accessToken = response.access_token;
          resolve(accessToken);
        },
      });
      resolve(tokenClient);
    });
  },

  // ขอสิทธิ์การเข้าถึง (Request Token)
  requestAccessToken: (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!tokenClient) {
        reject('Google Client not initialized');
        return;
      }
      tokenClient.callback = (response: any) => {
        if (response.error) {
          reject(response);
        } else {
          accessToken = response.access_token;
          resolve(accessToken!);
        }
      };
      tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  },

  // สร้าง Google Sheets และส่งออกข้อมูล
  exportToSheets: async (data: BudgetState, title: string) => {
    if (!accessToken) await googleApiService.requestAccessToken();

    // 1. สร้าง Spreadsheet ใหม่
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { title: `SmartBudget - ${title}` }
      })
    });
    const spreadsheet = await createRes.json();
    const spreadsheetId = spreadsheet.spreadsheetId;

    // 2. เตรียมข้อมูล
    const totalSpent = data.expenses.reduce((sum, e) => sum + e.amount, 0);
    const values = [
      ['วันที่', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน (บาท)'],
      ...data.expenses.map(e => [e.date, e.category, e.description, e.amount]),
      ['', '', '', ''],
      ['', '', 'รายได้ทั้งหมด', data.salary],
      ['', '', 'ค่าใช้จ่ายทั้งหมด', totalSpent],
      ['', '', 'คงเหลือสุทธิ', data.salary - totalSpent],
    ];

    // 3. เขียนข้อมูลลงใน Sheet
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values })
    });

    return spreadsheet.spreadsheetUrl;
  },

  // สำรองข้อมูลลง Google Drive
  backupToDrive: async (userId: string, appData: any) => {
    if (!accessToken) await googleApiService.requestAccessToken();

    const fileName = `smartbudget_backup_${userId}.json`;
    const metadata = {
      name: fileName,
      mimeType: 'application/json',
    };

    const fileContent = JSON.stringify(appData);
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([fileContent], { type: 'application/json' }));

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: form
    });

    return res.ok;
  }
};
