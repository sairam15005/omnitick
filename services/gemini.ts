import { IntentType, Event, User } from "../types";

// Helper to grab authorization headers with the JWT token
const getAuthHeaders = () => {
  const token = sessionStorage.getItem('omni_jwt') || localStorage.getItem('omni_jwt');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const processUserMessage = async (message: string, events: Event[]) => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      throw new Error("Backend chat context failed.");
    }

    return await response.json();
  } catch (error) {
    console.error("Backend Proxy Chat Error:", error);
    // Graceful smart fallback if Server-Side Key fails
    const matched = events.find(e => 
      e.name.toLowerCase().includes(message.toLowerCase()) || 
      message.toLowerCase().includes(e.category.toLowerCase())
    );
    return {
      reply: matched 
        ? `Namaste, Bhai! I looked up our registers and found **${matched.name}** fits perfectly. Would you like to secure a general ticket for ₹${matched.basePrice}?`
        : `Namaste! I searched our local Bharat ledger hubs but did not find an explicit match. Let's check outstanding IPL seats or Saffron Music schedules, ji?`,
      intent: matched ? IntentType.BOOK_TICKET : IntentType.GENERAL_QUERY,
      entities: matched ? { eventId: matched.id, event: matched.name, quantity: 1 } : {}
    };
  }
};

export const getPersonalizedRecommendations = async (user: User, events: Event[]) => {
  try {
    const response = await fetch('/api/ai/recommendations', {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to load recommendations.");
    }

    return await response.json();
  } catch (error) {
    console.error("Proxy Recommendation Error:", error);
    return {
      recommendations: [
        { name: "Sports", val: 95, color: "#FF9933", insight: "Cricket demand matches are high" },
        { name: "Music", val: 80, color: "#138808", insight: "EDM beats are trending in Goa" },
        { name: "Conference", val: 60, color: "#000080", insight: "Tech sessions in Bengaluru" },
        { name: "Culture", val: 75, color: "#D4AF37", insight: "Temples and classical art meets" }
      ],
      topInsight: `Namaste! Based on current Indian festival season forecasts, sports and concert seats are in high demand.`
    };
  }
};

export const getDemandForecast = async (events: Event[]) => {
  try {
    const response = await fetch('/api/ai/forecast', {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error("Failed to load demand forecasts.");
    }

    return await response.json();
  } catch (error) {
    console.error("Proxy Forecast Error:", error);
    return {
      forecastData: [
        { name: "Mon", demand: 32, sales: 18, forecast: 42 },
        { name: "Tue", demand: 45, sales: 25, forecast: 55 },
        { name: "Wed", demand: 60, sales: 30, forecast: 65 },
        { name: "Thu", demand: 75, sales: 40, forecast: 80 },
        { name: "Fri", demand: 90, sales: 55, forecast: 95 },
        { name: "Sat", demand: 110, sales: 70, forecast: 115 },
        { name: "Sun", demand: 125, sales: 85, forecast: 130 }
      ]
    };
  }
};

export const getUserPreferences = async () => {
  try {
    const response = await fetch('/api/user/preferences', {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error("Failed to load user preferences.");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return null;
  }
};

export const saveUserPreferences = async (prefs: {
  preferredCategories: string[];
  preferredLocations: string[];
  maxPricePreference: number;
  favoriteDatePreference: string;
}) => {
  try {
    const response = await fetch('/api/user/preferences', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(prefs)
    });
    if (!response.ok) {
      throw new Error("Failed to save user preferences.");
    }
    return await response.json();
  } catch (error) {
    console.error("Error saving user preferences:", error);
    throw error;
  }
};

export const getVoiceIntent = async (text: string) => {
  try {
    const response = await fetch('/api/ai/voice-intent', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
    if (!response.ok) {
      throw new Error("Failed to fetch voice intent classification.");
    }
    return await response.json();
  } catch (error) {
    console.error("Error calling voice intent proxy:", error);
    throw error;
  }
};
