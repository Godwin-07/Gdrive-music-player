import { create } from 'zustand';

type SourceFilter = 'all' | 'drive' | 'local';
type SortOption = 'title' | 'artist' | 'recent' | 'duration';

interface LibraryState {
  songs: any[];
  isLoading: boolean;
  error: string | null;
  sourceFilter: SourceFilter;
  sortOption: SortOption;
  searchQuery: string;
  setSourceFilter: (filter: SourceFilter) => void;
  setSortOption: (option: SortOption) => void;
  setSearchQuery: (query: string) => void;
  setSongs: (songs: any[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getFilteredSongs: () => any[];
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  songs: [],
  isLoading: false,
  error: null,
  sourceFilter: 'all',
  sortOption: 'recent',
  searchQuery: '',

  setSourceFilter: (filter) => set({ sourceFilter: filter }),
  setSortOption: (option) => set({ sortOption: option }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSongs: (songs) => set({ songs }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  getFilteredSongs: () => {
    const { songs, sourceFilter, sortOption, searchQuery } = get();
    let filtered = songs;

    if (sourceFilter !== 'all') {
      filtered = filtered.filter((s) => s.source === sourceFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.title?.toLowerCase().includes(q) ||
          s.artist?.toLowerCase().includes(q) ||
          s.album?.toLowerCase().includes(q)
      );
    }

    const sorted = [...filtered];
    switch (sortOption) {
      case 'title':
        sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'artist':
        sorted.sort((a, b) =>
          (a.artist || '').localeCompare(b.artist || '')
        );
        break;
      case 'duration':
        sorted.sort((a, b) => (a.duration || 0) - (b.duration || 0));
        break;
      case 'recent':
      default:
        sorted.sort((a, b) => (b.added_at || 0) - (a.added_at || 0));
        break;
    }

    return sorted;
  },
}));
