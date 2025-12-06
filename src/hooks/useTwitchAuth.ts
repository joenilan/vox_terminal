import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export function useTwitchAuth() {
    return useContext(AuthContext);
}

