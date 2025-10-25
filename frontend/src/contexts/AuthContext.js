import { createContext, useContext, useState, useEffect } from "react";
import { useAccount, useSignMessage } from "wagmi";
import axios from "axios";
import { toast } from "sonner";

const AuthContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("auth_token"));
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      logout();
    }
  };

  const login = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return false;
    }

    try {
      const message = `Sign this message to authenticate with Aetherium Proxy.\n\nWallet: ${address}\nTimestamp: ${Date.now()}`;
      
      console.log("Requesting signature for message:", message);
      const signature = await signMessageAsync({ message });
      console.log("Signature received:", signature);

      console.log("Sending authentication request to:", `${API}/auth/connect-wallet`);
      const response = await axios.post(`${API}/auth/connect-wallet`, {
        wallet_address: address,
        signature,
        message,
      });

      console.log("Authentication response:", response.data);
      const { token: authToken, user: userData } = response.data;
      setToken(authToken);
      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem("auth_token", authToken);
      toast.success("Successfully authenticated!");
      return true;
    } catch (error) {
      console.error("Authentication error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      const errorMsg = error.response?.data?.detail || error.message || "Authentication failed";
      toast.error(`Authentication failed: ${errorMsg}`);
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("auth_token");
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        token,
        login,
        logout,
        address,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};