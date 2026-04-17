type RecipientStatus = "PENDING" | "SENDING" | "SENT" | "ERROR" | "NOT_FOUND" | "SKIPPED";
type CampaignStatus = "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETED";

export interface Recipient {
  id: string;
  instagramUsername: string;
  messageText: string;
  status: RecipientStatus;
}

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  recipients: Recipient[];
}

export interface QueueResult {
  recipient: Recipient | null;
  campaignStatus: CampaignStatus;
}

export class CrmApi {
  constructor(
    private baseUrl: string,
    private secret: string,
  ) {}

  private headers() {
    return {
      "Content-Type": "application/json",
      "x-bot-secret": this.secret,
    };
  }

  private async checkResponse(r: Response, label: string) {
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      throw new Error(`[${label}] HTTP ${r.status}: ${text.slice(0, 200)}`);
    }
    return r;
  }

  async getCampaigns(): Promise<Campaign[]> {
    const r = await fetch(`${this.baseUrl}/api/campaigns`, { headers: this.headers() });
    await this.checkResponse(r, "getCampaigns");
    return r.json();
  }

  async getCampaign(id: string): Promise<Campaign> {
    const r = await fetch(`${this.baseUrl}/api/campaigns/${id}`, { headers: this.headers() });
    await this.checkResponse(r, "getCampaign");
    return r.json();
  }

  async setCampaignStatus(id: string, status: CampaignStatus): Promise<void> {
    const r = await fetch(`${this.baseUrl}/api/campaigns/${id}`, {
      method: "PUT",
      headers: this.headers(),
      body: JSON.stringify({ status }),
    });
    await this.checkResponse(r, "setCampaignStatus");
  }

  async getNextInQueue(campaignId: string): Promise<QueueResult> {
    const r = await fetch(`${this.baseUrl}/api/campaigns/${campaignId}/queue`, {
      headers: this.headers(),
    });
    await this.checkResponse(r, "getNextInQueue");
    return r.json();
  }

  async updateRecipient(
    campaignId: string,
    recipientId: string,
    data: { status: RecipientStatus; sentAt?: string; errorMessage?: string },
  ): Promise<void> {
    const r = await fetch(`${this.baseUrl}/api/campaigns/${campaignId}/recipients/${recipientId}`, {
      method: "PUT",
      headers: this.headers(),
      body: JSON.stringify(data),
    });
    await this.checkResponse(r, "updateRecipient");
  }
}
