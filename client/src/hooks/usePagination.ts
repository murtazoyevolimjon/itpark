import { useState } from 'react';

export function usePagination(initialLimit = 20) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(initialLimit);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string | undefined>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleLimitChange = (val: number) => {
    setLimit(val);
    setPage(1);
  };

  const handleSortChange = (col: string, newOrder: 'asc' | 'desc') => {
    setSortBy(col);
    setOrder(newOrder);
  };

  return {
    page,
    setPage,
    limit,
    setLimit: handleLimitChange,
    search,
    setSearch: handleSearchChange,
    sortBy,
    order,
    handleSortChange,
  };
}
