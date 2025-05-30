import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({children}) => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    return isAuthenticated ? children : <Navigate to={`/login?redir=${location.pathname}`} replace />;
};

export default ProtectedRoute;
