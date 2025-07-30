import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { useEffect } from "react";

const Navbar = () => {
  const { isAuthenticated,isLoading } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await authService.logout();
    navigate("/login");
  };
  useEffect(() =>{
    if(!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  },[isLoading])

  return (
    <div className="h-screen bg-white shadow-md">
      <nav className="flex flex-col items-center justify-between w-full px-6 py-4 h-full">
        <div>
          <div>
            <h1 className="font-bold text-xl ">ChatApp</h1>
          </div>
          <ul className="mt-4 space-y-2">
            <li className="text-gray-700 hover:text-blue-500 hover:cursor-pointer">
              Home
            </li>
            <li className="text-gray-700 hover:text-blue-500 hover:cursor-pointer">
              Rooms
            </li>
            <li className="text-gray-700 hover:text-blue-500 hover:cursor-pointer">
              Settings
            </li>
            <li className="text-gray-700 hover:text-blue-500 hover:cursor-pointer">
              Profile
            </li>
          </ul>
        </div>
        <div>
          {!isAuthenticated ? (
            <button
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
              onClick={() => navigate("/login")}
            >
              Login
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
            >
              Logout
            </button>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
