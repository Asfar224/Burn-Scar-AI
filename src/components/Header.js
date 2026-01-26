import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NavItem = ({ to, children }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative px-2 py-2 font-medium transition-colors duration-200 ${isActive
          ? 'text-medical-blue'
          : 'text-medical-gray hover:text-medical-blue'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {children}
          {isActive && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-medical-blue"></span>
          )}
        </>
      )}
    </NavLink>
  );
};

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <NavLink to="/" className="text-2xl font-semibold text-medical-blue flex items-center">
              <svg className="w-8 h-8 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              BurnScar AI
            </NavLink>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <NavItem to="/">Home</NavItem>
            <NavItem to="/about">About</NavItem>
            {isAuthenticated ? (
              <>
                <NavItem to="/dashboard">Dashboard</NavItem>
                <NavItem to="/analyze">Analyze</NavItem>
                <div className="ml-4 flex items-center space-x-4 pl-4 border-l border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-medical-blue bg-opacity-10 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-medical-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span className="text-sm text-medical-gray">{user?.displayName || user?.email}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm hover:shadow"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <NavLink
                to="/auth"
                className="px-2 py-2 font-medium transition-colors duration-200 text-medical-gray hover:text-medical-blue"
              >
                Login
              </NavLink>
            )}
          </div>
          <div className="md:hidden">
            <button className="text-medical-gray hover:text-medical-blue">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
