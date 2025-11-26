import { User } from '../types';

const USERS_KEY = 'linguabot_users';
const CURRENT_USER_KEY = 'linguabot_current_user';

export const getUsers = (): User[] => {
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveUser = (user: User): void => {
  const users = getUsers();
  const existingIndex = users.findIndex(u => u.username === user.username);
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  // Update current user if it's the one being saved
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.username === user.username) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  }
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  return data ? JSON.parse(data) : null;
};

export const setCurrentUser = (user: User | null): void => {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};
