import React, {useEffect} from 'react';
import {Navigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({children}) => {
    const {isAuthenticated, logout} = useAuth();

    useEffect(() => {
        if (!isAuthenticated) {
            logout();
        }
    }, [isAuthenticated, logout]);

    return isAuthenticated ? children : <Navigate to="/login" replace/>;
};

export default ProtectedRoute;
