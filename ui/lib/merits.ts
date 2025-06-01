interface MeritsDistribution {
  address: string;
  amount: string;
}

interface MeritsDistributeRequest {
  id: string;
  description: string;
  distributions: MeritsDistribution[];
  create_missing_accounts: boolean;
  expected_total: string;
}

interface MeritsDistributeResponse {
  accounts_distributed: string;
  accounts_created: string;
}

interface MeritsBalanceResponse {
  name: string;
  api_key: string;
  valid_since: string;
  valid_until: string;
  rate: string;
  balance: string;
  total_distributed: string;
  updated_at: string;
}

const MERITS_API_BASE_URL = "https://merits-staging.blockscout.com";

export class MeritsAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    body?: any
  ): Promise<T> {
    const url = `${MERITS_API_BASE_URL}${endpoint}`;

    const headers: HeadersInit = {
      Authorization: this.apiKey,
      Accept: "*/*",
    };

    if (method === "POST" && body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Merits API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  async getBalance(): Promise<MeritsBalanceResponse> {
    return this.makeRequest<MeritsBalanceResponse>("/partner/api/v1/balance");
  }

  async distributeMerits(
    userAddress: string,
    amount: string,
    description: string = "Garmin Account Verification Reward"
  ): Promise<MeritsDistributeResponse> {
    const distributionId = `garmin_verification_${Date.now()}_${userAddress.slice(
      -8
    )}`;

    const request: MeritsDistributeRequest = {
      id: distributionId,
      description,
      distributions: [
        {
          address: userAddress,
          amount,
        },
      ],
      create_missing_accounts: true,
      expected_total: amount,
    };

    return this.makeRequest<MeritsDistributeResponse>(
      "/partner/api/v1/distribute",
      "POST",
      request
    );
  }

  async distributeMultipleMerits(
    distributions: MeritsDistribution[],
    description: string = "Garmin Account Verification Rewards"
  ): Promise<MeritsDistributeResponse> {
    const distributionId = `garmin_verification_batch_${Date.now()}`;

    const totalAmount = distributions
      .reduce((sum, dist) => sum + parseFloat(dist.amount), 0)
      .toFixed(2);

    const request: MeritsDistributeRequest = {
      id: distributionId,
      description,
      distributions,
      create_missing_accounts: true,
      expected_total: totalAmount,
    };

    return this.makeRequest<MeritsDistributeResponse>(
      "/partner/api/v1/distribute",
      "POST",
      request
    );
  }
}

// Default reward amounts for different verification types
export const MERIT_REWARDS = {
  PROFILE_VERIFICATION: "10.00",
  FITNESS_DATA_VERIFICATION: "5.00",
  DAILY_SUMMARY_VERIFICATION: "3.00",
  COMMUNITY_CREATION: "15.00",
} as const;

// Helper function to create a Merits API instance
export function createMeritsAPI(): MeritsAPI | null {
  const apiKey = process.env.NEXT_PUBLIC_MERITS_API_KEY;

  if (!apiKey) {
    console.warn(
      "NEXT_PUBLIC_MERITS_API_KEY not found in environment variables"
    );
    return null;
  }

  return new MeritsAPI(apiKey);
}

// Helper function to distribute merits with error handling
export async function distributeMeritsWithErrorHandling(
  userAddress: string,
  amount: string,
  description: string
): Promise<{
  success: boolean;
  message: string;
  data?: MeritsDistributeResponse;
}> {
  try {
    const meritsAPI = createMeritsAPI();

    if (!meritsAPI) {
      return {
        success: false,
        message: "Merits API not configured. Please contact support.",
      };
    }

    const result = await meritsAPI.distributeMerits(
      userAddress,
      amount,
      description
    );

    return {
      success: true,
      message: `Successfully distributed ${amount} Merits to your account!`,
      data: result,
    };
  } catch (error) {
    console.error("Error distributing Merits:", error);

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to distribute Merits",
    };
  }
}
