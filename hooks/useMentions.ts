// hooks/useMentions.ts
import { useState, useMemo } from 'react';

export interface MentionUser {
  id: string;
  name: string;
}

export function useMentions(users: MentionUser[]) {
  const [query, setQuery] = useState('');

  const suggestions = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(q));
  }, [query, users]);

  const reset = () => setQuery('');

  return { query, setQuery, suggestions, reset };
}