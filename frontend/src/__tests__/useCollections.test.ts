import { act, renderHook, waitFor } from '@testing-library/react';
import { useCollections } from '../hooks/useCollections';
import * as api from '../utils/api_service';

jest.mock('../utils/api_service', () => ({
    fetchCollections: jest.fn(),
    createCollection: jest.fn(),
    renameCollection: jest.fn(),
    deleteCollection: jest.fn(),
    addToCollection: jest.fn(),
    removeFromCollection: jest.fn(),
    clearCollection: jest.fn(),
}));

const mockFetchCollections = api.fetchCollections as jest.Mock;
const mockCreateCollection = api.createCollection as jest.Mock;
const mockRenameCollection = api.renameCollection as jest.Mock;
const mockDeleteCollection = api.deleteCollection as jest.Mock;
const mockAddToCollection = api.addToCollection as jest.Mock;
const mockRemoveFromCollection = api.removeFromCollection as jest.Mock;
const mockClearCollection = api.clearCollection as jest.Mock;

const sampleCollections = [
    { id: 'c1', name: 'Sunday Dinners', recipeIds: [ 'r1' ], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
];

beforeEach(() => {
    jest.clearAllMocks();
});

describe('useCollections', () => {
    it('has initial state: collections=[], loading=true, error=null', () => {
        mockFetchCollections.mockReturnValue(new Promise(() => {}));
        const { result } = renderHook(() => useCollections());
        expect(result.current.collections).toEqual([]);
        expect(result.current.loading).toBe(true);
        expect(result.current.error).toBeNull();
    });

    it('populates collections and sets loading=false after successful fetch', async () => {
        mockFetchCollections.mockResolvedValue(sampleCollections);
        const { result } = renderHook(() => useCollections());
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.collections).toEqual(sampleCollections);
        expect(result.current.error).toBeNull();
    });

    it('create(name) calls createCollection and updates state', async () => {
        const created = [ { id: 'c1', name: 'Test', recipeIds: [], createdAt: 'x', updatedAt: 'x' } ];
        mockFetchCollections.mockResolvedValue([]);
        mockCreateCollection.mockResolvedValue(created);
        const { result } = renderHook(() => useCollections());
        await waitFor(() => expect(result.current.loading).toBe(false));
        await act(async () => { await result.current.create('Test'); });
        expect(mockCreateCollection).toHaveBeenCalledWith('Test');
        expect(result.current.collections).toEqual(created);
    });

    it('rename(id, name) calls renameCollection and updates state', async () => {
        const renamed = [ { ...sampleCollections[0], name: 'New Name' } ];
        mockFetchCollections.mockResolvedValue(sampleCollections);
        mockRenameCollection.mockResolvedValue(renamed);
        const { result } = renderHook(() => useCollections());
        await waitFor(() => expect(result.current.loading).toBe(false));
        await act(async () => { await result.current.rename('c1', 'New Name'); });
        expect(mockRenameCollection).toHaveBeenCalledWith('c1', 'New Name');
        expect(result.current.collections[0].name).toBe('New Name');
    });

    it('remove(id) calls deleteCollection and updates state', async () => {
        mockFetchCollections.mockResolvedValue(sampleCollections);
        mockDeleteCollection.mockResolvedValue([]);
        const { result } = renderHook(() => useCollections());
        await waitFor(() => expect(result.current.loading).toBe(false));
        await act(async () => { await result.current.remove('c1'); });
        expect(mockDeleteCollection).toHaveBeenCalledWith('c1');
        expect(result.current.collections).toEqual([]);
    });

    it('addRecipe(collectionId, recipeId) calls addToCollection and updates state', async () => {
        const updated = [ { ...sampleCollections[0], recipeIds: [ 'r1', 'r2' ] } ];
        mockFetchCollections.mockResolvedValue(sampleCollections);
        mockAddToCollection.mockResolvedValue(updated);
        const { result } = renderHook(() => useCollections());
        await waitFor(() => expect(result.current.loading).toBe(false));
        await act(async () => { await result.current.addRecipe('c1', 'r2'); });
        expect(mockAddToCollection).toHaveBeenCalledWith('c1', 'r2');
        expect(result.current.collections[0].recipeIds).toEqual([ 'r1', 'r2' ]);
    });

    it('removeRecipe(collectionId, recipeId) calls removeFromCollection and updates state', async () => {
        const updated = [ { ...sampleCollections[0], recipeIds: [] } ];
        mockFetchCollections.mockResolvedValue(sampleCollections);
        mockRemoveFromCollection.mockResolvedValue(updated);
        const { result } = renderHook(() => useCollections());
        await waitFor(() => expect(result.current.loading).toBe(false));
        await act(async () => { await result.current.removeRecipe('c1', 'r1'); });
        expect(mockRemoveFromCollection).toHaveBeenCalledWith('c1', 'r1');
        expect(result.current.collections[0].recipeIds).toEqual([]);
    });

    it('clearRecipes(id) calls clearCollection and empties recipeIds', async () => {
        const updated = [ { ...sampleCollections[0], recipeIds: [] } ];
        mockFetchCollections.mockResolvedValue(sampleCollections);
        mockClearCollection.mockResolvedValue(updated);
        const { result } = renderHook(() => useCollections());
        await waitFor(() => expect(result.current.loading).toBe(false));
        await act(async () => { await result.current.clearRecipes('c1'); });
        expect(mockClearCollection).toHaveBeenCalledWith('c1');
        expect(result.current.collections[0].recipeIds).toEqual([]);
    });

    it('propagates API error into error state', async () => {
        const err = new Error('Network error');
        mockFetchCollections.mockRejectedValue(err);
        const { result } = renderHook(() => useCollections());
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.error).toBe(err);
        expect(result.current.collections).toEqual([]);
    });
});
