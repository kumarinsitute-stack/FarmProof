import { User, Claim, AppNotification } from './types';

const TOKEN_KEY = 'farmproof_auth_token';

export const api = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  async login(identifier: string, password: string, portalType: 'farmer' | 'staff'): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password, portalType })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    this.setToken(data.token);
    return data;
  },

  async registerFarmer(farmerData: Record<string, any>): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/register-farmer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(farmerData)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Farmer registration failed');
    }

    this.setToken(data.token);
    return data;
  },

  async getCurrentUser(): Promise<User | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch('/api/auth/me', {
        headers: this.getHeaders()
      });

      if (!res.ok) {
        this.removeToken();
        return null;
      }

      const data = await res.json();
      return data.user;
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: this.getHeaders()
      });
    } catch (e) {
      // ignore
    } finally {
      this.removeToken();
    }
  },

  async getApplications(params?: { search?: string; status?: string }): Promise<Claim[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);

    const res = await fetch(`/api/applications?${query.toString()}`, {
      headers: this.getHeaders()
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch applications');
    }

    return res.json();
  },

  async getApplication(id: string): Promise<Claim> {
    const res = await fetch(`/api/applications/${id}`, {
      headers: this.getHeaders()
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch application details');
    }

    return res.json();
  },

  async createApplication(appData: Partial<Claim>): Promise<Claim> {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(appData)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit application');
    }

    return res.json();
  },

  async updateApplication(id: string, updates: Record<string, any>): Promise<Claim> {
    const res = await fetch(`/api/applications/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update application');
    }

    return res.json();
  },

  async getSurveyors(): Promise<User[]> {
    const res = await fetch('/api/surveyors', {
      headers: this.getHeaders()
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to load surveyors list');
    }

    return res.json();
  },

  async assignSurveyor(applicationId: string, surveyorId: string, deadline: string, instructions: string): Promise<Claim> {
    const res = await fetch(`/api/applications/${applicationId}/assign-surveyor`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ surveyorId, deadline, instructions })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to assign surveyor');
    }

    return res.json();
  },

  async submitSurveyFindings(applicationId: string, findingsData: Record<string, any>): Promise<Claim> {
    const res = await fetch(`/api/applications/${applicationId}/submit-survey`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(findingsData)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit survey findings');
    }

    return res.json();
  },

  async submitOfficerDecision(applicationId: string, decision: string, remarks: string, sanctionedPayout?: number): Promise<Claim> {
    const res = await fetch(`/api/applications/${applicationId}/officer-decision`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ decision, remarks, sanctionedPayout })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to record officer decision');
    }

    return res.json();
  },

  async uploadFile(file: File): Promise<{ url: string; name: string; size: string; type: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: file.name,
              type: file.type,
              data: reader.result as string
            })
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Upload failed');
          }

          const data = await res.json();
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  async getNotifications(): Promise<AppNotification[]> {
    const res = await fetch('/api/notifications', {
      headers: this.getHeaders()
    });

    if (!res.ok) return [];
    return res.json();
  },

  async markNotificationRead(id: string): Promise<void> {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: this.getHeaders()
      });
    } catch {
      // ignore
    }
  }
};
