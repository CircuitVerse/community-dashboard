import { describe, it, expect, beforeEach } from 'vitest';
import { ScoringEngine, POINTS } from '../../scripts/services/scoring.service';
import { Contributor } from '../../scripts/types';

describe('ScoringEngine', () => {
    let users: Map<string, Contributor>;

    beforeEach(() => {
        users = new Map();
    });

    describe('ensureUser', () => {
        it('should create a new user if not exists', () => {
            const user = { login: 'testuser', name: 'Test User' };
            const entry = ScoringEngine.ensureUser(users, user);

            expect(entry.username).toBe('testuser');
            expect(entry.total_points).toBe(0);
            expect(users.has('testuser')).toBe(true);
        });

        it('should return existing user', () => {
            const user = { login: 'testuser' };
            const entry1 = ScoringEngine.ensureUser(users, user);
            entry1.total_points = 10;

            const entry2 = ScoringEngine.ensureUser(users, user);
            expect(entry2.total_points).toBe(10);
            expect(entry1).toBe(entry2);
        });
    });

    describe('addActivity', () => {
        it('should add points and activity', () => {
            const user = ScoringEngine.ensureUser(users, { login: 'testuser' });

            ScoringEngine.addActivity(
                user,
                'PR opened',
                '2023-01-01T10:00:00Z',
                POINTS['PR opened']
            );

            expect(user.total_points).toBe(POINTS['PR opened']);
            expect(user.raw_activities).toHaveLength(1);
            expect(user.activity_breakdown['PR opened']!.count).toBe(1);
        });
    });

    describe('deduplicateAndRecalculate', () => {
        it('should remove duplicate activities and recalculate points', () => {
            const user = ScoringEngine.ensureUser(users, { login: 'testuser' });

            // Add same activity twice
            ScoringEngine.addActivity(
                user,
                'PR merged',
                '2023-01-01T12:00:00Z',
                POINTS['PR merged'],
                { link: 'http://pr/1' }
            );

            ScoringEngine.addActivity(
                user,
                'PR merged',
                '2023-01-01T12:00:00Z',
                POINTS['PR merged'],
                { link: 'http://pr/1' }
            );

            expect(user.total_points).toBe(POINTS['PR merged'] * 2); // Before dedup

            ScoringEngine.deduplicateAndRecalculate(users);

            expect(user.total_points).toBe(POINTS['PR merged']); // After dedup
            expect(user.raw_activities).toHaveLength(1);
        });
    });
});
