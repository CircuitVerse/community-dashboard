import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitHubService } from '../../scripts/services/github.service';

global.fetch = vi.fn();

describe('GitHubService', () => {
    let service: GitHubService;

    beforeEach(() => {
        service = new GitHubService('fake-token');
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

            (fetch as unknown as ReturnType<typeof vi.fn>)
                .mockResolvedValueOnce({
                    ok: true,
                    headers: new Headers(),
                    json: async () => mockDataPage1,
                })
                .mockResolvedValueOnce({
                    ok: true,
                    headers: new Headers(),
                    json: async () => mockDataPage2,
                });

            const results = await service.fetchAll('https://api.github.com/test');

            expect(fetch).toHaveBeenCalledTimes(2);
            expect(results).toHaveLength(101);
        });

        it('should throw error on failure', async () => {
            (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
                status: 404,
                text: async () => 'Not Found'
            });

            await expect(service.fetchAll('https://api.github.com/bad')).rejects.toThrow('GitHub API 404');
        });
    });
});
