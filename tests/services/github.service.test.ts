import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitHubService } from '../../scripts/services/github.service';

describe('GitHubService', () => {
    let service: GitHubService;
    let fetchSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        service = new GitHubService('fake-token');
        fetchSpy = vi.spyOn(globalThis, 'fetch');
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should instantiate', () => {
        expect(service).toBeDefined();
    });

    describe('fetchAll', () => {
        it('should fetch all pages', async () => {
            const mockDataPage1 = [{ id: 1 }, ...Array(99).fill({ id: 0 })]; // 100 items
            const mockDataPage2 = [{ id: 2 }];

            fetchSpy
                .mockResolvedValueOnce({
                    ok: true,
                    headers: new Headers(),
                    json: async () => mockDataPage1,
                } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    headers: new Headers(),
                    json: async () => mockDataPage2,
                } as Response);

            const results = await service.fetchAll('https://api.github.com/test');

            expect(fetchSpy).toHaveBeenCalledTimes(2);
            expect(results).toHaveLength(101);
        });

        it('should throw error on failure', async () => {
            fetchSpy.mockResolvedValueOnce({
                ok: false,
                status: 404,
                text: async () => 'Not Found'
            } as Response);

            await expect(service.fetchAll('https://api.github.com/bad')).rejects.toThrow('GitHub API 404');
        });
    });
});
