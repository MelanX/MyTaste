import { type Mock } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import { useNextUp } from '../hooks/useNextUp';
import * as api from '../utils/apiService';

vi.mock('../utils/apiService', () => ({
  fetchNextUp: vi.fn(),
  addToNextUp: vi.fn(),
  removeFromNextUp: vi.fn(),
  clearNextUp: vi.fn(),
}));

const mockFetchNextUp = api.fetchNextUp as Mock;
const mockAddToNextUp = api.addToNextUp as Mock;
const mockRemoveFromNextUp = api.removeFromNextUp as Mock;
const mockClearNextUp = api.clearNextUp as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useNextUp', () => {
  it('has initial state: ids=[], loading=true, error=null', () => {
    mockFetchNextUp.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useNextUp());
    expect(result.current.ids).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('populates ids and sets loading=false after successful fetch', async () => {
    mockFetchNextUp.mockResolvedValue(['r1', 'r2']);
    const { result } = renderHook(() => useNextUp());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ids).toEqual(['r1', 'r2']);
    expect(result.current.error).toBeNull();
  });

  it('add(id) calls addToNextUp and updates ids', async () => {
    mockFetchNextUp.mockResolvedValue([]);
    mockAddToNextUp.mockResolvedValue(['r1']);
    const { result } = renderHook(() => useNextUp());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.add('r1');
    });
    expect(mockAddToNextUp).toHaveBeenCalledWith('r1');
    expect(result.current.ids).toEqual(['r1']);
  });

  it('remove(id) calls removeFromNextUp and updates ids', async () => {
    mockFetchNextUp.mockResolvedValue(['r1']);
    mockRemoveFromNextUp.mockResolvedValue([]);
    const { result } = renderHook(() => useNextUp());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.remove('r1');
    });
    expect(mockRemoveFromNextUp).toHaveBeenCalledWith('r1');
    expect(result.current.ids).toEqual([]);
  });

  it('clear() calls clearNextUp and resets ids to []', async () => {
    mockFetchNextUp.mockResolvedValue(['r1', 'r2']);
    mockClearNextUp.mockResolvedValue(undefined);
    const { result } = renderHook(() => useNextUp());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.clear();
    });
    expect(mockClearNextUp).toHaveBeenCalled();
    expect(result.current.ids).toEqual([]);
  });

  it('propagates API error into error state', async () => {
    const err = new Error('Network error');
    mockFetchNextUp.mockRejectedValue(err);
    const { result } = renderHook(() => useNextUp());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(err);
    expect(result.current.ids).toEqual([]);
  });
});
