import React from 'react';
import ProtectedRoute from './ProtectedRoute';
import { getConfig } from '../config';

/**
 * Wrap any element in <RequireLogin> to make it conditionally private.
 * If REACT_APP_REQUIRE_LOGIN !== 'true' it simply renders its children.
 */
const RequireLogin: React.FC<{ children: React.ReactElement }> = ({children}) => {
    const mustLogin = getConfig().requireLogin;
    if (!mustLogin) return children;

    // reuse existing logic from ProtectedRoute
    return <ProtectedRoute>{children}</ProtectedRoute>;
};

export default RequireLogin;
