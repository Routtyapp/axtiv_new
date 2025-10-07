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
      className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#121212]/95 backdrop-blur-md border-b border-gray-200/60 dark:border-white/12"
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
                  <Text weight="medium" size="2" className="text-gray-800 dark:text-gray-200">
                    {user?.name || user?.email?.split("@")[0] || "사용자"}
                  </Text>
                  <Text size="1" className="text-gray-500 dark:text-gray-400" style={{ marginLeft: "4px" }}>
                    {dropdownOpen ? "▲" : "▼"}
                  </Text>
                </Flex>
              </div>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div
                  className="absolute top-[calc(100%+8px)] right-0 min-w-[220px] bg-white dark:bg-[#232323] border border-gray-200 dark:border-white/12 rounded-lg shadow-lg overflow-hidden"
                >
                  {/* User Info */}
                  <div className="p-3 border-b border-gray-200 dark:border-white/12">
                    <Text weight="bold" size="2" className="text-gray-800 dark:text-white/[0.87] block">
                      {user?.name || user?.email?.split("@")[0] || "사용자"}
                    </Text>
                    <Text size="1" className="text-gray-500 dark:text-white/60 block mt-1">
                      {user?.email || user.user_id}
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
                        className="p-2.5 hover:bg-gray-50 dark:hover:bg-[#272727] transition-colors"
                        style={{ cursor: "pointer" }}
                      >
                        <Text size="2" className="text-gray-800 dark:text-white/[0.87]">
                          🏢 내 워크스페이스
                        </Text>
                      </div>
                    </Link>

                    <div
                      onClick={handleLogout}
                      className="p-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-gray-200 dark:border-white/12"
                      style={{ cursor: "pointer" }}
                    >
                      <Text size="2" className="text-red-600 dark:text-[#CF6679]">
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
