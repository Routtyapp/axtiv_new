import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { Flex, Text } from "@radix-ui/themes";
import { supabase } from "../../lib/supabase";
import userStore from "../../store/userStore";
import { Avatar } from "../ui";

const TopHeader = () => {
  const { user } = userStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("sb-nhvhujoentbvkgpanwwg-auth-token");
    userStore.getState().setUser(null);
    navigate("/login");
  };

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(226, 232, 240, 0.6)",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 2rem",
        }}
      >
        <Flex align="center" justify="between" style={{ height: "64px" }}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: "none" }}>
            <Flex align="center" gap="2">
              <img
                src="/Logo.png"
                alt="AXTIV Logo"
                style={{
                  height: "32px",
                  width: "auto",
                }}
              />
            </Flex>
          </Link>

          {/* User Dropdown */}
          {user && (
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <div
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  cursor: "pointer",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  transition: "all 0.2s ease",
                  background: dropdownOpen ? "rgba(59, 130, 246, 0.1)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!dropdownOpen) e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
                }}
                onMouseLeave={(e) => {
                  if (!dropdownOpen) e.currentTarget.style.background = "transparent";
                }}
              >
                <Flex align="center" gap="2">
                  <Avatar
                    size="2"
                    style={{
                      background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                      color: "white",
                      fontSize: "14px",
                    }}
                  >
                    {user?.email?.charAt(0).toUpperCase() ||
                      user?.name?.charAt(0).toUpperCase() ||
                      "U"}
                  </Avatar>
                  <Text weight="medium" size="2" style={{ color: "#1e293b" }}>
                    {user?.name || user?.email?.split("@")[0] || "사용자"}
                  </Text>
                  <Text size="1" style={{ color: "#64748b", marginLeft: "4px" }}>
                    {dropdownOpen ? "▲" : "▼"}
                  </Text>
                </Flex>
              </div>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    minWidth: "220px",
                    background: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
                    overflow: "hidden",
                  }}
                >
                  {/* User Info */}
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>
                    <Text weight="bold" size="2" style={{ color: "#1e293b", display: "block" }}>
                      {user?.name || user?.email?.split("@")[0] || "사용자"}
                    </Text>
                    <Text size="1" style={{ color: "#64748b", display: "block", marginTop: "4px" }}>
                      {user?.email || user.auth_id}
                    </Text>
                  </div>

                  {/* Menu Items */}
                  <div>
                    <Link
                      to="/companies"
                      style={{ textDecoration: "none" }}
                      onClick={() => setDropdownOpen(false)}
                    >
                      <div
                        style={{
                          padding: "10px 16px",
                          cursor: "pointer",
                          transition: "background 0.2s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <Text size="2" style={{ color: "#1e293b" }}>
                          🏢 내 워크스페이스
                        </Text>
                      </div>
                    </Link>

                    <div
                      onClick={handleLogout}
                      style={{
                        padding: "10px 16px",
                        cursor: "pointer",
                        transition: "background 0.2s ease",
                        borderTop: "1px solid #e2e8f0",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <Text size="2" style={{ color: "#dc2626" }}>
                        🚪 로그아웃
                      </Text>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Flex>
      </div>
    </header>
  );
};

export default TopHeader;
